export type MarketType = 'crypto' | 'forex' | 'stocks' | 'indices' | 'commodities';
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
export type TradingStyle = 'scalping' | 'day_trading' | 'swing_trading';
export type SignalDirection = 'BUY' | 'SELL' | 'WAIT' | 'NO_TRADE';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_closed: boolean;
  datetime_str?: string;
}

export interface MarketOverviewItem {
  symbol: string;
  price: number;
  change_24h_percent: number;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  market: MarketType;
  data_source: string;
  data_status: 'REALTIME' | 'DELAYED' | 'HISTORICAL' | 'SIMULATED' | 'UNAVAILABLE';
}

export interface FactorScore {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  reason: string;
}

export interface SignalResponse {
  id?: number;
  symbol: string;
  market: string;
  direction: SignalDirection;
  timeframe: string;
  trading_style: string;
  reference_price: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward: number;
  score: number;
  score_classification: string;
  status: string;
  data_source: string;
  data_status: string;
  justification: string;
  factors: FactorScore[];
  indicators: Record<string, any>;
  created_at?: string;
}

export interface TechnicalAnalysisResult {
  symbol: string;
  timeframe: string;
  current_price: number;
  indicators: {
    ema_9?: number;
    ema_20?: number;
    ema_50?: number;
    ema_200?: number;
    sma_20?: number;
    sma_50?: number;
    sma_200?: number;
    rsi?: number;
    macd_line?: number;
    macd_signal?: number;
    macd_hist?: number;
    stoch_k?: number;
    stoch_d?: number;
    atr?: number;
    bollinger_upper?: number;
    bollinger_middle?: number;
    bollinger_lower?: number;
    bollinger_width?: number;
    volume?: number;
    relative_volume?: number;
    volume_anomaly?: boolean;
  };
  structure: {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    supports: number[];
    resistances: number[];
    swing_high?: number;
    swing_low?: number;
    breakout?: string;
    structure_shift?: string;
  };
  indicator_series?: Record<string, (number | null)[]>;
}

export interface AIScenario {
  bias: string;
  trigger: string;
  target: number;
  invalidation: number;
  explanation: string;
}

export interface AIAnalysisResponse {
  symbol: string;
  timeframe: string;
  provider_used: string;
  status: string;
  summary: string;
  trend_interpretation: string;
  confluences: string[];
  contradictions: string[];
  bullish_scenario?: AIScenario;
  bearish_scenario?: AIScenario;
  recommendation_summary: string;
  discrepancy_with_technical?: string;
  disclaimer: string;
}

export interface BacktestTrade {
  id: number;
  direction: string;
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  exit_reason: string;
  position_size: number;
  pnl_amount: number;
  pnl_percent: number;
  capital_after: number;
  score_at_entry: number;
}

export interface EquityPoint {
  time: string;
  capital: number;
  drawdown_percent: number;
}

export interface BacktestResponse {
  symbol: string;
  market: string;
  timeframe: string;
  strategy: string;
  initial_capital: number;
  final_capital: number;
  net_profit: number;
  net_profit_percent: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_percent: number;
  profit_factor: number;
  max_drawdown_percent: number;
  expectancy_per_trade: number;
  avg_risk_reward: number;
  trades: BacktestTrade[];
  equity_curve: EquityPoint[];
  disclaimer: string;
}

export interface AlertItem {
  id: number;
  symbol: string;
  market: string;
  timeframe: string;
  min_score: number;
  signal_type: string;
  active: boolean;
  telegram_notify: boolean;
  created_at: string;
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  symbol: string;
  market: string;
  timeframe: string;
  direction: string;
  score: number;
  color: 'green' | 'red' | 'yellow' | 'blue';
  category: 'buy' | 'sell' | 'wait' | 'breakout';
  title: string;
  message: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit_1?: number;
  read: boolean;
}

export interface RiskCalculation {
  account_balance: number;
  risk_percentage: number;
  monetary_risk: number;
  stop_loss_distance: number;
  stop_loss_percent: number;
  position_size_units: number;
  position_value: number;
  take_profit_distance: number;
  take_profit_percent: number;
  risk_reward_ratio: number;
  potential_profit: number;
  potential_loss: number;
  is_valid_risk_reward: boolean;
  risk_profile: string;
  disclaimer: string;
}
