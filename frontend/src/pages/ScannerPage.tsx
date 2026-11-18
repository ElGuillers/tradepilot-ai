import React, { useState, useEffect } from 'react';
import {
  ScanSearch,
  Filter,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { SignalResponse, TradingStyle, Timeframe } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ScannerPageProps {
  onNavigateChart: (symbol: string, timeframe?: string) => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({ onNavigateChart }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [style, setStyle] = useState<TradingStyle>('day_trading');
  const [minScore, setMinScore] = useState<number>(45);
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [signals, setSignals] = useState<SignalResponse[]>([]);
  const [scanning, setScanning] = useState<boolean>(true);

  const runScan = async () => {
    setScanning(true);
    try {
      const results = await api.scanSignals('crypto', timeframe, style, minScore);
      setSignals(results);
    } catch (err) {
      console.error('Error running scanner', err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    runScan();
  }, [timeframe, style, minScore]);

  const filtered = signals.filter(s => {
    if (directionFilter !== 'ALL' && s.direction !== directionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ScanSearch className="w-5 h-5 text-blue-400" />
            Escáner Multiactivo Cuantitativo
          </h2>
          <p className="text-xs text-slate-400">
            Filtra en paralelo activos con confluencias técnicas de tendencia, momentum, volumen y estructura.
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'Escaneando...' : 'Re-escanear'}</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Estilo de Trading</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as TradingStyle)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none"
          >
            <option value="scalping">Scalping</option>
            <option value="day_trading">Day Trading</option>
            <option value="swing_trading">Swing Trading</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Temporalidad</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-medium focus:outline-none"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Dirección Deseada</label>
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none"
          >
            <option value="ALL">Todas las direcciones</option>
            <option value="BUY">Solo BUY (Compras)</option>
            <option value="SELL">Solo SELL (Ventas)</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between text-slate-400 font-semibold mb-1">
            <span>Puntuación Mínima:</span>
            <span className="font-mono text-white">{minScore} pts</span>
          </div>
          <input
            type="range"
            min="30"
            max="85"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value))}
            className="w-full accent-blue-500 mt-2"
          />
        </div>
      </div>

      {/* Results Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Oportunidades Detectadas ({filtered.length})
          </h3>
          <span className="text-[11px] text-slate-400">Ordenadas por puntuación decreciente</span>
        </div>

        {scanning ? (
          <div className="h-64 flex items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Consultando velas y calculando confluencias en Binance...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <p className="text-sm">No se encontraron activos con puntuación superior a {minScore} pts en {timeframe}.</p>
            <p className="text-xs text-slate-500">Prueba reduciendo la puntuación mínima o cambiando la temporalidad.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3">Activo</th>
                  <th className="pb-3">Dirección</th>
                  <th className="pb-3">Puntuación</th>
                  <th className="pb-3 text-right">Precio Ref.</th>
                  <th className="pb-3 text-right">SL Hipotético</th>
                  <th className="pb-3 text-right">TP 1</th>
                  <th className="pb-3">R:R</th>
                  <th className="pb-3">RSI / Vol</th>
                  <th className="pb-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-mono font-bold text-white">
                      {item.symbol}
                    </td>
                    <td className="py-3">
                      <StatusBadge type="direction" value={item.direction} />
                    </td>
                    <td className="py-3">
                      <StatusBadge type="score" value={item.score} />
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-white">
                      ${item.reference_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-3 text-right font-mono text-rose-400">
                      {item.stop_loss > 0 ? `$${item.stop_loss}` : '-'}
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-400">
                      {item.take_profit_1 > 0 ? `$${item.take_profit_1}` : '-'}
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {item.risk_reward > 0 ? `1:${item.risk_reward}` : '-'}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-400">
                      RSI {item.indicators.rsi?.toFixed(0) ?? '-'} | {item.indicators.relative_volume?.toFixed(1) ?? '1.0'}x
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => onNavigateChart(item.symbol, item.timeframe)}
                        className="px-3 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition font-semibold"
                      >
                        Ver Gráfico
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
