import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Activity,
  Zap,
  Radio,
  Cpu,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { wsManager, LiveTickerUpdate } from '../services/websocket';
import { MarketOverviewItem, SignalResponse, AlertItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  onNavigate: (tab: string, symbol?: string) => void;
  selectedSymbol: string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, selectedSymbol }) => {
  const [markets, setMarkets] = useState<MarketOverviewItem[]>([]);
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatedTicks, setUpdatedTicks] = useState<Set<string>>(new Set());

  const loadData = async () => {
    try {
      const [mktData, sigData] = await Promise.all([
        api.getMarkets(),
        api.getSignal(selectedSymbol, '1h', 'crypto')
      ]);
      setMarkets(mktData);
      setSignal(sigData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSymbol]);

  // Real-time WebSocket subscription for live prices & tickers
  useEffect(() => {
    const unsubscribe = wsManager.subscribeAllTickers((tickerMap: Map<string, LiveTickerUpdate>) => {
      setMarkets((prevMarkets) => {
        let changed = false;
        const newlyUpdated = new Set<string>();

        const updated = prevMarkets.map((item) => {
          if (item.market === 'crypto' && tickerMap.has(item.symbol)) {
            const live = tickerMap.get(item.symbol)!;
            changed = true;
            newlyUpdated.add(item.symbol);
            return {
              ...item,
              price: live.close,
              change_24h_percent: live.changePercent,
              high_24h: live.high,
              low_24h: live.low,
              volume_24h: live.volume
            };
          }
          return item;
        });

        if (changed) {
          setUpdatedTicks(newlyUpdated);
          setTimeout(() => setUpdatedTicks(new Set()), 400);
          return updated;
        }
        return prevMarkets;
      });
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span>Cargando datos de mercado en tiempo real desde Binance...</span>
      </div>
    );
  }

  const cryptoMarkets = markets.filter(m => m.market === 'crypto');

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Panel de Control Financiero
            <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              WS STREAM ACTIVO
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor centralizado de liquidez en tiempo real, confluencias técnicas e inteligencia artificial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => onNavigate('scanner')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Escanear Oportunidades</span>
          </button>
        </div>
      </div>

      {/* Engine Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Binance Provider */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Proveedor de Datos</p>
              <h4 className="text-sm font-bold text-white">Binance WebSocket + REST</h4>
            </div>
          </div>
          <StatusBadge type="data_status" value="REALTIME" />
        </div>

        {/* Technical Engine */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Motor Cuantitativo</p>
              <h4 className="text-sm font-bold text-white">6 Factores Ponderados</h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            AUTO-SYNC
          </span>
        </div>

        {/* AI Engine */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Inteligencia Artificial</p>
              <h4 className="text-sm font-bold text-white">Gemini / Reglas Modo Seguro</h4>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            DISPONIBLE
          </span>
        </div>
      </div>

      {/* Main Grid: Featured Signal & Live Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Featured Signal Card (1/3) */}
        {signal && (
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Oportunidad Actual</span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  {signal.symbol}
                  <span className="text-xs font-mono text-slate-400 font-normal">({signal.timeframe})</span>
                </h3>
              </div>
              <StatusBadge type="direction" value={signal.direction} />
            </div>

            {/* Score pill */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">Puntuación Cuantitativa</p>
                <p className="text-xs font-medium text-slate-200">{signal.score_classification}</p>
              </div>
              <StatusBadge type="score" value={signal.score} />
            </div>

            {/* Hypothetical Levels */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-[10px] text-slate-400">Entrada</p>
                <p className="font-mono font-bold text-blue-400">${signal.entry_price}</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] text-slate-400">Stop Loss</p>
                <p className="font-mono font-bold text-rose-400">${signal.stop_loss}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] text-slate-400">Take Profit 1</p>
                <p className="font-mono font-bold text-emerald-400">${signal.take_profit_1}</p>
              </div>
            </div>

            {/* Factor breakdown */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-slate-300">Desglose de Factores Técnicos:</p>
              <div className="space-y-1">
                {signal.factors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/50 border border-slate-800/80">
                    <span className="text-slate-400">{f.name}</span>
                    <span className="font-mono text-slate-200">+{f.contribution} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Justification summary */}
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
              {signal.justification}
            </p>

            {/* CTA */}
            <button
              onClick={() => onNavigate('charts', signal.symbol)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              <span>Ver Gráfico en Tiempo Real</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Market Watchlist (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Cotizaciones de Criptomonedas en Streaming (Binance WS)
                </h3>
                <p className="text-xs text-slate-400">Actualización continua sub-segundo sin recargar</p>
              </div>
              <button
                onClick={() => onNavigate('markets')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Table with real-time update effects */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-2.5">Activo</th>
                    <th className="pb-2.5 text-right">Precio Actual</th>
                    <th className="pb-2.5 text-right">24h Variación</th>
                    <th className="pb-2.5 text-right hidden sm:table-cell">24h Máx / Mín</th>
                    <th className="pb-2.5 text-right hidden md:table-cell">Volumen 24h</th>
                    <th className="pb-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cryptoMarkets.map((item) => {
                    const isPositive = item.change_24h_percent >= 0;
                    const isTicking = updatedTicks.has(item.symbol);
                    return (
                      <tr key={item.symbol} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-bold font-mono text-white flex items-center gap-2">
                          <span>{item.symbol}</span>
                          <StatusBadge type="data_status" value={item.data_status} />
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold">
                          <span
                            className={`px-1 py-0.5 rounded transition-all duration-300 ${
                              isTicking
                                ? isPositive
                                  ? 'bg-emerald-500/30 text-emerald-300'
                                  : 'bg-rose-500/30 text-rose-300'
                                : 'text-white'
                            }`}
                          >
                            ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold">
                          <span className={`inline-flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isPositive ? '+' : ''}{item.change_24h_percent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-400 hidden sm:table-cell">
                          ${item.high_24h.toFixed(2)} / ${item.low_24h.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-400 hidden md:table-cell">
                          ${(item.volume_24h / 1e6).toFixed(2)}M
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => onNavigate('charts', item.symbol)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 font-medium transition"
                          >
                            Analizar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
