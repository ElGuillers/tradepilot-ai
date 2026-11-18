export interface LiveKlineUpdate {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_closed: boolean;
}

export interface LiveTickUpdate {
  symbol: string;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean;
}

export interface LiveTickerUpdate {
  symbol: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  changePercent: number;
}

class BinanceWebSocketManager {
  private combinedWs: WebSocket | null = null;
  private tickerWs: WebSocket | null = null;
  private currentSymbol: string = '';
  private currentTimeframe: string = '';

  private activeCandle: LiveKlineUpdate | null = null;
  private klineCallback: ((data: LiveKlineUpdate) => void) | null = null;
  private tickCallback: ((tick: LiveTickUpdate) => void) | null = null;
  private tickerCallbacks: Set<(tickers: Map<string, LiveTickerUpdate>) => void> = new Set();

  /**
   * Subscribes to combined multiplexed stream:
   * - <symbol>@kline_<timeframe> (official candle bounds and volume)
   * - <symbol>@aggTrade (ultra-fast sub-millisecond tick executions like MetaTrader)
   */
  public subscribeStream(
    symbol: string,
    timeframe: string,
    onKlineUpdate: (data: LiveKlineUpdate) => void,
    onTick?: (tick: LiveTickUpdate) => void,
    seedCandle?: LiveKlineUpdate | null
  ): () => void {
    const sym = symbol.toLowerCase();
    this.currentSymbol = sym;
    this.currentTimeframe = timeframe;
    this.klineCallback = onKlineUpdate;
    this.tickCallback = onTick || null;
    if (seedCandle) {
      this.activeCandle = { ...seedCandle };
    }

    this.connectCombinedStream(sym, timeframe);

    return () => {
      if (this.currentSymbol === sym && this.currentTimeframe === timeframe) {
        this.closeCombinedStream();
      }
    };
  }

  private connectCombinedStream(symbol: string, timeframe: string) {
    if (this.combinedWs) {
      try {
        this.combinedWs.close();
      } catch (e) {}
      this.combinedWs = null;
    }

    // Binance multiplex stream combining kline, aggTrade AND bookTicker for continuous micro-second updates
    const streamUrl = `wss://stream.binance.com:9443/stream?streams=${symbol}@kline_${timeframe}/${symbol}@aggTrade/${symbol}@bookTicker`;
    try {
      const ws = new WebSocket(streamUrl);

      ws.onmessage = (event) => {
        try {
          const wrapper = JSON.parse(event.data);
          const streamName: string = wrapper.stream || '';
          const data = wrapper.data;

          if (!data) return;

          // 1. Official Kline packet (arrives every ~1-2s or on candle close)
          if (streamName.includes('@kline')) {
            const k = data.k;
            if (k) {
              const klineData: LiveKlineUpdate = {
                timestamp: k.t,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v),
                is_closed: Boolean(k.x)
              };

              this.activeCandle = { ...klineData };

              if (this.klineCallback) {
                this.klineCallback(klineData);
              }
            }
          }

          // 2. Ultra-fast aggTrade packet (arrives on every market trade execution)
          else if (streamName.includes('@aggTrade')) {
            const price = parseFloat(data.p);
            const qty = parseFloat(data.q);
            const tradeTime = data.T;

            const tick: LiveTickUpdate = {
              symbol: data.s,
              price: price,
              quantity: qty,
              time: tradeTime,
              isBuyerMaker: data.m
            };

            if (this.activeCandle) {
              this.activeCandle.close = price;
              if (price > this.activeCandle.high) this.activeCandle.high = price;
              if (price < this.activeCandle.low) this.activeCandle.low = price;
              this.activeCandle.volume += qty;

              if (this.klineCallback) {
                this.klineCallback({ ...this.activeCandle });
              }
            }

            if (this.tickCallback) {
              this.tickCallback(tick);
            }
          }

          // 3. Ultra-fast bookTicker packet (bid/ask updates continuously even between trades)
          else if (streamName.includes('@bookTicker')) {
            const bid = parseFloat(data.b);
            const ask = parseFloat(data.a);
            if (bid > 0 && ask > 0) {
              const midPrice = (bid + ask) / 2;
              const tick: LiveTickUpdate = {
                symbol: data.s,
                price: midPrice,
                quantity: parseFloat(data.B || data.A || '0'),
                time: Date.now(),
                isBuyerMaker: false
              };

              if (this.activeCandle) {
                this.activeCandle.close = midPrice;
                if (midPrice > this.activeCandle.high) this.activeCandle.high = midPrice;
                if (midPrice < this.activeCandle.low) this.activeCandle.low = midPrice;

                if (this.klineCallback) {
                  this.klineCallback({ ...this.activeCandle });
                }
              }

              if (this.tickCallback) {
                this.tickCallback(tick);
              }
            }
          }
        } catch (err) {
          console.error('Error parsing combined stream:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Combined stream error, will reconnect...', err);
      };

      ws.onclose = () => {
        if (this.currentSymbol === symbol && this.currentTimeframe === timeframe) {
          setTimeout(() => {
            if (this.currentSymbol === symbol && this.currentTimeframe === timeframe) {
              this.connectCombinedStream(symbol, timeframe);
            }
          }, 2000);
        }
      };

      this.combinedWs = ws;
    } catch (e) {
      console.error('Failed to open Combined WebSocket:', e);
    }
  }

  private closeCombinedStream() {
    if (this.combinedWs) {
      try {
        this.combinedWs.close();
      } catch (e) {}
      this.combinedWs = null;
    }
    this.klineCallback = null;
    this.tickCallback = null;
    this.activeCandle = null;
  }

  /**
   * Subscribe to global 24h mini-ticker stream for all pairs.
   */
  public subscribeAllTickers(
    onTickersUpdate: (tickers: Map<string, LiveTickerUpdate>) => void
  ): () => void {
    this.tickerCallbacks.add(onTickersUpdate);

    if (!this.tickerWs || this.tickerWs.readyState !== WebSocket.OPEN) {
      this.connectTicker();
    }

    return () => {
      this.tickerCallbacks.delete(onTickersUpdate);
      if (this.tickerCallbacks.size === 0) {
        this.closeTicker();
      }
    };
  }

  private connectTicker() {
    if (this.tickerWs) return;

    const streamUrl = `wss://stream.binance.com:9443/ws/!miniTicker@arr`;
    try {
      const ws = new WebSocket(streamUrl);

      ws.onmessage = (event) => {
        try {
          const arr = JSON.parse(event.data);
          if (Array.isArray(arr)) {
            const map = new Map<string, LiveTickerUpdate>();
            for (const item of arr) {
              const close = parseFloat(item.c);
              const open = parseFloat(item.o);
              const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
              map.set(item.s, {
                symbol: item.s,
                close: close,
                open: open,
                high: parseFloat(item.h),
                low: parseFloat(item.l),
                volume: parseFloat(item.q),
                changePercent: changePct
              });
            }

            this.tickerCallbacks.forEach((cb) => cb(map));
          }
        } catch (err) {
          console.error('Error parsing ticker ws message:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('Ticker WebSocket error:', err);
      };

      ws.onclose = () => {
        this.tickerWs = null;
        if (this.tickerCallbacks.size > 0) {
          setTimeout(() => this.connectTicker(), 2000);
        }
      };

      this.tickerWs = ws;
    } catch (e) {
      console.error('Failed to open Ticker WebSocket:', e);
    }
  }

  private closeTicker() {
    if (this.tickerWs) {
      try {
        this.tickerWs.close();
      } catch (e) {}
      this.tickerWs = null;
    }
  }
}

export const wsManager = new BinanceWebSocketManager();
