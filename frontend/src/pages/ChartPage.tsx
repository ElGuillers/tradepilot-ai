import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Activity,
  Bot,
  Calculator,
  RefreshCw,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  KeyRound,
  ExternalLink,
  Star
} from 'lucide-react';
import { api } from '../services/api';
import { wsManager, LiveKlineUpdate, LiveTickUpdate } from '../services/websocket';
import { isStoredFavorite, toggleStoredFavorite } from '../services/favorites';
import { getBrokerSymbol } from '../services/brokerSymbols';
import { Candle, SignalResponse, TechnicalAnalysisResult, Timeframe, TradingStyle } from '../types';
import { TradingChart } from '../components/TradingChart';
import { StatusBadge } from '../components/StatusBadge';

interface ChartPageProps {
  symbol: string;
  market?: string;
  initialTimeframe?: Timeframe;
  onOpenRiskModal: () => void;
  onNavigateAI: (symbol: string, timeframe: string) => void;
  onNavigateSettings?: () => void;
  onSelectCrypto?: (symbol: string) => void;
}

const formatPrice = (p: number) => {
  if (!p) return '$0.00';
  if (p >= 100) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(5)}`;
};

const getStyleForTimeframe = (tf: Timeframe, currentStyle: TradingStyle): TradingStyle => {
  if (['1m', '3m'].includes(tf)) return 'scalping';
  if (['15m', '30m'].includes(tf)) return 'day_trading';
  if (['4h', '1d'].includes(tf)) return 'swing_trading';
  if (tf === '5m') return ['scalping', 'day_trading'].includes(currentStyle) ? currentStyle : 'day_trading';
  if (tf === '1h') return ['day_trading', 'swing_trading'].includes(currentStyle) ? currentStyle : 'day_trading';
  return 'day_trading';
};

export const ChartPage: React.FC<ChartPageProps> = ({
  symbol,
  market = 'crypto',
  initialTimeframe,
  onOpenRiskModal,
  onNavigateAI,
  onNavigateSettings,
  onSelectCrypto
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe || '1h');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>(
    initialTimeframe ? getStyleForTimeframe(initialTimeframe, 'day_trading') : 'day_trading'
  );
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [techResult, setTechResult] = useState<TechnicalAnalysisResult | null>(null);
  const [liveCandle, setLiveCandle] = useState<LiveKlineUpdate | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [lastTradeQty, setLastTradeQty] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'same'>('same');
  const [loading, setLoading] = useState<boolean>(true);
  const [noDataError, setNoDataError] = useState<boolean>(false);
  const [isFav, setIsFav] = useState<boolean>(isStoredFavorite(symbol));

  const prevPriceRef = useRef<number | null>(null);

  // Sync favorites with storage
  useEffect(() => {
    setIsFav(isStoredFavorite(symbol));
    const syncFav = () => setIsFav(isStoredFavorite(symbol));
    window.addEventListener('tradepilot_favorites_updated', syncFav);
    return () => window.removeEventListener('tradepilot_favorites_updated', syncFav);
  }, [symbol]);

  // Check if Gold Spot (PAXG)
  const isGoldSpot = symbol.toUpperCase() === 'PAXGUSDT';

  // Auto-detect market from symbol name if not explicitly passed
  const isStockOrForex =
    !isGoldSpot && (
      (market !== 'crypto' && market !== 'commodities') ||
      ['AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ', 'SPX', 'NDX'].includes(symbol.toUpperCase()) ||
      symbol.includes('/') ||
      ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'].includes(symbol.toUpperCase())
    );

  const currentMarket = isGoldSpot ? 'crypto' : isStockOrForex ? (symbol.includes('/') || symbol.endsWith('USD') ? 'forex' : 'stocks') : 'crypto';

  const styleTimeframes: Record<TradingStyle, Timeframe[]> = {
    scalping: ['1m', '3m', '5m'],
    day_trading: ['5m', '15m', '30m', '1h'],
    swing_trading: ['1h', '4h', '1d']
  };

  const loadChartData = async () => {
    setLoading(true);
    setNoDataError(false);
    try {
      const [candleRes, sigRes, techRes] = await Promise.all([
        api.getCandles(symbol, timeframe, currentMarket, 250),
        api.getSignal(symbol, timeframe, currentMarket, tradingStyle),
        api.getIndicators(symbol, timeframe, currentMarket)
      ]);
      setCandles(candleRes.candles);
      setSignal(sigRes);
      setTechResult(techRes);

      if (candleRes.candles && candleRes.candles.length > 0) {
        const last = candleRes.candles[candleRes.candles.length - 1];
        setLivePrice(last.close);
        prevPriceRef.current = last.close;
      } else {
        setNoDataError(true);
      }
    } catch (err) {
      console.error('Error loading chart data', err);
      setNoDataError(true);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize when an alert or scanner passes an exact timeframe
  useEffect(() => {
    if (initialTimeframe) {
      setTimeframe(initialTimeframe);
      setTradingStyle((prev) => getStyleForTimeframe(initialTimeframe, prev));
    }
  }, [initialTimeframe, symbol]);

  // Re-fetch historical data on symbol / timeframe / style change
  useEffect(() => {
    loadChartData();
  }, [symbol, timeframe, tradingStyle, currentMarket]);

  // Periodic polling for Stocks and Forex (every 5 seconds for live updates)
  useEffect(() => {
    if (!isStockOrForex) return;

    const interval = setInterval(async () => {
      try {
        const candleRes = await api.getCandles(symbol, timeframe, currentMarket, 250);
        if (candleRes.candles && candleRes.candles.length > 0) {
          const last = candleRes.candles[candleRes.candles.length - 1];
          if (prevPriceRef.current !== null) {
            if (last.close > prevPriceRef.current) setPriceDirection('up');
            else if (last.close < prevPriceRef.current) setPriceDirection('down');
          }
          prevPriceRef.current = last.close;
          setLivePrice(last.close);
          setCandles(candleRes.candles);
        }
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [symbol, timeframe, currentMarket, isStockOrForex]);

  // Real-time combined WebSocket subscription (only for Binance crypto & Gold)
  useEffect(() => {
    if (isStockOrForex) return;

    const seedCandle =
      candles.length > 0
        ? {
            timestamp: candles[candles.length - 1].timestamp,
            open: candles[candles.length - 1].open,
            high: candles[candles.length - 1].high,
            low: candles[candles.length - 1].low,
            close: candles[candles.length - 1].close,
            volume: candles[candles.length - 1].volume,
            is_closed: false
          }
        : null;

    const unsubscribe = wsManager.subscribeStream(
      symbol,
      timeframe,
      (klineUpdate: LiveKlineUpdate) => {
        setLiveCandle(klineUpdate);

        if (klineUpdate.is_closed) {
          api.getSignal(symbol, timeframe, 'crypto', tradingStyle).then(setSignal).catch(() => {});
          api.getIndicators(symbol, timeframe, 'crypto').then(setTechResult).catch(() => {});
        }
      },
      (tick: LiveTickUpdate) => {
        setLastTradeQty(tick.quantity);

        if (prevPriceRef.current !== null) {
          if (tick.price > prevPriceRef.current) setPriceDirection('up');
          else if (tick.price < prevPriceRef.current) setPriceDirection('down');
        }
        prevPriceRef.current = tick.price;
        setLivePrice(tick.price);
      },
      seedCandle
    );

    return () => {
      unsubscribe();
    };
  }, [symbol, timeframe, tradingStyle, isStockOrForex]);

  return (
    <div className="space-y-4">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Title & Live Ticker */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <button
              onClick={() => {
                toggleStoredFavorite(symbol);
                setIsFav(isStoredFavorite(symbol));
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition"
              title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <Star className={`w-4 h-4 transition-transform active:scale-125 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
            </button>
            <span className="text-base font-black font-mono text-white whitespace-nowrap">{symbol}</span>
            {(() => {
              const brokerSym = getBrokerSymbol(symbol);
              if (brokerSym && brokerSym.toUpperCase() !== symbol.toUpperCase()) {
                return (
                  <span
                    className="text-xs font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30 whitespace-nowrap"
                    title={`Siglas en Broker / MetaTrader: ${brokerSym}`}
                  >
                    {brokerSym}
                  </span>
                );
              }
              return null;
            })()}

            {livePrice !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-sm transition-all duration-100 ${
                  priceDirection === 'up'
                    ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                    : priceDirection === 'down'
                    ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                    : 'text-white bg-slate-800 border border-slate-700'
                }`}
              >
                <span>${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                {priceDirection === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
                {priceDirection === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            )}

            {isGoldSpot ? (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>🪙 ORO SPOT 1:1 ($/oz)</span>
              </div>
            ) : !isStockOrForex ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>TICK LIVE</span>
                {lastTradeQty !== null && (
                  <span className="text-[9px] font-mono text-slate-400 ml-1">
                    ({lastTradeQty.toFixed(3)} u.)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span>📈 WALL STREET EN VIVO</span>
              </div>
            )}
          </div>

          {/* Trading Style selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Estilo:</span>
            <select
              value={tradingStyle}
              onChange={(e) => {
                const newStyle = e.target.value as TradingStyle;
                setTradingStyle(newStyle);
                setTimeframe(styleTimeframes[newStyle][0]);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none font-semibold"
            >
              <option value="scalping">Scalping (1m - 5m)</option>
              <option value="day_trading">Day Trading (5m - 1h)</option>
              <option value="swing_trading">Swing Trading (1h - 1d)</option>
            </select>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            {styleTimeframes[tradingStyle].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateAI(symbol, timeframe)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-600/30 transition"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Interpretar IA</span>
          </button>
          <button
            onClick={onOpenRiskModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Calculator className="w-3.5 h-3.5 text-blue-400" />
            <span>Calcular Riesgo</span>
          </button>
          <button
            onClick={loadChartData}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Recargar historial"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Chart + Technical Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="h-[480px] rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Cargando datos de mercado...</span>
            </div>
          ) : noDataError || candles.length === 0 ? (
            <div className="h-[480px] rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white">
                  No se pudieron obtener cotizaciones de {symbol}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verifica la conexión del servidor o pulsa reintentar. TradePilot AI transmite cotizaciones reales de Cripto, Oro Spot, Acciones de Wall Street, Índices y Forex de forma 100% gratuita y abierta.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={loadChartData}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Carga</span>
                </button>
                {onSelectCrypto && (
                  <button
                    onClick={() => onSelectCrypto('PAXGUSDT')}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/30 transition"
                  >
                    Ver Oro Spot (XAUUSD)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <TradingChart
              candles={candles}
              timeframe={timeframe}
              signal={signal}
              indicatorsSeries={techResult?.indicator_series}
              liveCandle={liveCandle}
              height={500}
            />
          )}

          {/* Indicators Bar below chart */}
          {techResult && candles.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RSI (14)</span>
                <span className="font-mono font-bold text-white">{techResult.indicators.rsi?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">MACD Hist</span>
                <span className={`font-mono font-bold ${(techResult.indicators.macd_hist || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {techResult.indicators.macd_hist?.toFixed(2) ?? 'N/A'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">EMA 20 / 50</span>
                <span className="font-mono text-white text-[11px]">
                  {techResult.indicators.ema_20?.toFixed(1)} / {techResult.indicators.ema_50?.toFixed(1)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ATR (14)</span>
                <span className="font-mono font-bold text-white">{techResult.indicators.atr?.toFixed(2) ?? 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Volumen Relativo</span>
                <span className={`font-mono font-bold ${(techResult.indicators.relative_volume || 0) > 1.5 ? 'text-blue-400' : 'text-slate-300'}`}>
                  {techResult.indicators.relative_volume?.toFixed(2)}x
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Estructura</span>
                <span className="font-bold text-white uppercase text-[11px]">{techResult.structure.trend}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector: Signal & Risk Levels (1 col) */}
        <div className="space-y-4">
          {signal && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Señal Técnica</span>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white">{signal.symbol}</h4>
                    {isGoldSpot && (
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">(XAU/USD)</span>
                    )}
                  </div>
                </div>
                <StatusBadge type="direction" value={signal.direction} />
              </div>

              {/* Score Gauge */}
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Puntuación Cuantitativa</p>
                  <p className="text-xs font-semibold text-slate-200">{signal.score_classification}</p>
                </div>
                <StatusBadge type="score" value={signal.score} />
              </div>

              {/* Levels */}
              {signal.direction !== 'WAIT' && signal.direction !== 'NO_TRADE' && signal.entry_price > 0 ? (
                <div className="space-y-2 text-xs">
                  {(() => {
                    const entry = signal.entry_price;
                    const sl = signal.stop_loss;
                    const tp1 = signal.take_profit_1;
                    const tp2 = signal.take_profit_2;
                    const slPct = entry > 0 && sl > 0 ? Math.abs((sl - entry) / entry * 100) : 0;
                    const tp1Pct = entry > 0 && tp1 > 0 ? Math.abs((tp1 - entry) / entry * 100) : 0;
                    const tp2Pct = entry > 0 && tp2 > 0 ? Math.abs((tp2 - entry) / entry * 100) : 0;

                    return (
                      <>
                        <div className="flex justify-between items-center p-2 rounded bg-slate-800/40 border border-slate-800">
                          <span className="text-slate-400">Entrada Hipotética:</span>
                          <span className="font-mono font-bold text-blue-400">{formatPrice(entry)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-rose-500/5 border border-rose-500/20">
                          <span className="text-rose-400 font-semibold">Stop Loss:</span>
                          <span className="font-mono font-bold text-rose-400">
                            {formatPrice(sl)} <span className="text-[10px] font-normal text-rose-400/80">(-{slPct.toFixed(2)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400 font-semibold">Take Profit 1:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPrice(tp1)} <span className="text-[10px] font-normal text-emerald-400/80">(+{tp1Pct.toFixed(2)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-emerald-400 font-semibold">Take Profit 2:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {formatPrice(tp2)} <span className="text-[10px] font-normal text-emerald-400/80">(+{tp2Pct.toFixed(2)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 pt-1 text-[11px]">
                          <span>Ratio R:R:</span>
                          <span className="font-mono font-bold text-white">1 : {signal.risk_reward}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-800/40 text-center text-xs text-slate-400 leading-relaxed">
                  {signal.direction === 'NO_TRADE'
                    ? 'Sin condiciones favorables para operar (Riesgo elevado o mercado lateral sin volumen).'
                    : 'En observación: esperando confirmación de confluencia o cierre de vela.'}
                </div>
              )}

              {/* Market Structure Levels */}
              {techResult && techResult.structure && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                  <p className="text-[11px] font-semibold text-slate-300">Zonas Relevantes:</p>
                  <div className="flex justify-between text-slate-400">
                    <span>Resistencias:</span>
                    <span className="font-mono text-slate-200">
                      {techResult.structure.resistances.join(', ') || 'Sin resistencia inmediata'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Soportes:</span>
                    <span className="font-mono text-slate-200">
                      {techResult.structure.supports.join(', ') || 'Sin soporte inmediato'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
