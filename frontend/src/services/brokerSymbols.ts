export interface BrokerSymbolInfo {
  brokerSymbol: string;
  brokerLabel: string;
  category: string;
}

export const BROKER_MAP: Record<string, BrokerSymbolInfo> = {
  PAXGUSDT: { brokerSymbol: 'XAUUSD', brokerLabel: 'Oro Spot', category: 'commodities' },
  BTCUSDT: { brokerSymbol: 'BTCUSD', brokerLabel: 'Bitcoin', category: 'crypto' },
  ETHUSDT: { brokerSymbol: 'ETHUSD', brokerLabel: 'Ethereum', category: 'crypto' },
  SOLUSDT: { brokerSymbol: 'SOLUSD', brokerLabel: 'Solana', category: 'crypto' },
  BNBUSDT: { brokerSymbol: 'BNBUSD', brokerLabel: 'BNB', category: 'crypto' },
  XRPUSDT: { brokerSymbol: 'XRPUSD', brokerLabel: 'XRP / Ripple', category: 'crypto' },
  ADAUSDT: { brokerSymbol: 'ADAUSD', brokerLabel: 'Cardano', category: 'crypto' },
  DOGEUSDT: { brokerSymbol: 'DOGEUSD', brokerLabel: 'Dogecoin', category: 'crypto' },
  SPY: { brokerSymbol: 'US500', brokerLabel: 'S&P 500 Index', category: 'indices' },
  QQQ: { brokerSymbol: 'US100', brokerLabel: 'Nasdaq 100 Index', category: 'indices' },
  NVDA: { brokerSymbol: 'NVDA', brokerLabel: 'NVIDIA Corp', category: 'stocks' },
  TSLA: { brokerSymbol: 'TSLA', brokerLabel: 'Tesla Inc', category: 'stocks' },
  AAPL: { brokerSymbol: 'AAPL', brokerLabel: 'Apple Inc', category: 'stocks' },
  MSFT: { brokerSymbol: 'MSFT', brokerLabel: 'Microsoft', category: 'stocks' },
  AMZN: { brokerSymbol: 'AMZN', brokerLabel: 'Amazon', category: 'stocks' },
  GOOGL: { brokerSymbol: 'GOOGL', brokerLabel: 'Google / Alphabet', category: 'stocks' },
  META: { brokerSymbol: 'META', brokerLabel: 'Meta Platforms', category: 'stocks' },
};

export function getBrokerSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (BROKER_MAP[s]) {
    return BROKER_MAP[s].brokerSymbol;
  }
  if (s.endsWith('USDT')) {
    return s.replace('USDT', 'USD');
  }
  return s;
}
