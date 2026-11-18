import {
  MarketOverviewItem,
  Candle,
  SignalResponse,
  TechnicalAnalysisResult,
  AIAnalysisResponse,
  BacktestResponse,
  AlertItem,
  AlertNotification,
  RiskCalculation
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

let _marketsCache: { [key: string]: { data: MarketOverviewItem[]; timestamp: number } } = {};

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Markets & Candles
  getMarkets: async (market?: string, forceRefresh: boolean = false): Promise<MarketOverviewItem[]> => {
    const key = market || '__all__';
    const now = Date.now();
    if (!forceRefresh && _marketsCache[key] && now - _marketsCache[key].timestamp < 20000) {
      return _marketsCache[key].data;
    }
    const q = market ? `?market=${market}` : '';
    const res = await fetch(`${API_BASE}/markets${q}`);
    if (!res.ok) throw new Error('Error al obtener mercados');
    const data = await res.json();
    _marketsCache[key] = { data, timestamp: now };
    return data;
  },

  getCandles: async (symbol: string, timeframe: string = '1h', market: string = 'crypto', limit: number = 200): Promise<{ candles: Candle[]; data_status: string; data_source: string }> => {
    const res = await fetch(`${API_BASE}/market-data?symbol=${symbol}&timeframe=${timeframe}&market=${market}&limit=${limit}`);
    if (!res.ok) throw new Error(`Error al obtener velas de ${symbol}`);
    return res.json();
  },

  // Indicators
  getIndicators: async (symbol: string, timeframe: string = '1h', market: string = 'crypto'): Promise<TechnicalAnalysisResult> => {
    const res = await fetch(`${API_BASE}/indicators?symbol=${symbol}&timeframe=${timeframe}&market=${market}`);
    if (!res.ok) throw new Error(`Error al calcular indicadores para ${symbol}`);
    return res.json();
  },

  // Signals
  getSignal: async (symbol: string, timeframe: string = '1h', market: string = 'crypto', style: string = 'day_trading'): Promise<SignalResponse> => {
    const res = await fetch(`${API_BASE}/signals?symbol=${symbol}&timeframe=${timeframe}&market=${market}&trading_style=${style}`);
    if (!res.ok) throw new Error(`Error al generar señal de ${symbol}`);
    return res.json();
  },

  getSignalHistory: async (): Promise<{ signals: SignalResponse[]; total: number }> => {
    const res = await fetch(`${API_BASE}/signals/history`);
    if (!res.ok) throw new Error('Error al obtener historial de señales');
    return res.json();
  },

  scanSignals: async (market: string = 'crypto', timeframe: string = '1h', style: string = 'day_trading', minScore: number = 50): Promise<SignalResponse[]> => {
    const res = await fetch(`${API_BASE}/signals/scan?market=${market}&timeframe=${timeframe}&trading_style=${style}&min_score=${minScore}`);
    if (!res.ok) throw new Error('Error al escanear oportunidades');
    return res.json();
  },

  // AI Analysis
  analyzeWithAI: async (symbol: string, timeframe: string, market: string = 'crypto', provider?: string): Promise<AIAnalysisResponse> => {
    const res = await fetch(`${API_BASE}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, timeframe, market, provider })
    });
    if (!res.ok) throw new Error('Error en análisis IA');
    return res.json();
  },

  // Backtesting
  runBacktest: async (params: {
    symbol: string;
    market: string;
    timeframe: string;
    strategy: string;
    initial_capital: number;
    risk_per_trade_percent: number;
    commission_percent: number;
    slippage_percent: number;
    limit_candles: number;
  }): Promise<BacktestResponse> => {
    const res = await fetch(`${API_BASE}/backtesting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Error al ejecutar backtest');
    return res.json();
  },

  // Risk Calculator
  calculateRisk: async (params: {
    account_balance: number;
    risk_percentage: number;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    direction: string;
  }): Promise<RiskCalculation> => {
    const res = await fetch(`${API_BASE}/risk/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Error al calcular riesgo');
    return res.json();
  },

  // Alerts
  getAlerts: async (): Promise<AlertItem[]> => {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) throw new Error('Error al obtener alertas');
    return res.json();
  },

  createAlert: async (data: { symbol: string; market: string; timeframe: string; min_score: number; signal_type: string; telegram_notify: boolean }): Promise<AlertItem> => {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al crear alerta');
    return res.json();
  },

  deleteAlert: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar alerta');
  },

  getNotifications: async (): Promise<AlertNotification[]> => {
    const res = await fetch(`${API_BASE}/alerts/notifications`);
    if (!res.ok) throw new Error('Error al obtener notificaciones');
    return res.json();
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const res = await fetch(`${API_BASE}/alerts/notifications/read-all`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al marcar notificaciones');
  },

  markNotificationRead: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/alerts/notifications/${id}/read`, { method: 'POST' });
    if (!res.ok) throw new Error('Error al marcar notificación');
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Error al cargar configuración');
    return res.json();
  },

  updateSettings: async (settings: any) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Error al guardar configuración');
    return res.json();
  },

  testTelegram: async (bot_token?: string, chat_id?: string) => {
    const res = await fetch(`${API_BASE}/settings/test-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_token, chat_id })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Error al conectar con Telegram');
    }
    return data;
  }
};
