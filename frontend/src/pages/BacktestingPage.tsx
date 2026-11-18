import React, { useState } from 'react';
import {
  History,
  Play,
  TrendingUp,
  Percent,
  DollarSign,
  AlertOctagon,
  Award,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import { BacktestResponse, Timeframe } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const BacktestingPage: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [strategy, setStrategy] = useState<string>('confluence_breakout');
  const [capital, setCapital] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [limitCandles, setLimitCandles] = useState<number>(300);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResponse | null>(null);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const data = await api.runBacktest({
        symbol: symbol.toUpperCase(),
        market: 'crypto',
        timeframe,
        strategy,
        initial_capital: Number(capital),
        risk_per_trade_percent: Number(riskPercent),
        commission_percent: 0.075,
        slippage_percent: 0.05,
        limit_candles: Number(limitCandles)
      });
      setResult(data);
    } catch (err: any) {
      alert(`Error ejecutando backtest: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-blue-400" />
          Laboratorio Cuantitativo de Backtesting
        </h2>
        <p className="text-xs text-slate-400">
          Simulación histórica sin sesgo de anticipación (look-ahead bias) con comisiones y slippage reales.
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleRun} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Activo</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Temporalidad</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none"
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Estrategia</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none"
            >
              <option value="confluence_breakout">Ruptura con Confluencia</option>
              <option value="ema_trend_momentum">Tendencia EMA + Momentum</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Capital Inicial ($)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Riesgo / Operación (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Velas Históricas</label>
            <select
              value={limitCandles}
              onChange={(e) => setLimitCandles(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none"
            >
              <option value="100">100 Velas</option>
              <option value="200">200 Velas</option>
              <option value="300">300 Velas</option>
              <option value="500">500 Velas</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={running}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-500/20"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{running ? 'Simulando Velas...' : 'Ejecutar Backtest Histórico'}</span>
          </button>
        </div>
      </form>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Beneficio Neto</span>
              <span className={`text-base font-bold font-mono ${result.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.net_profit >= 0 ? '+' : ''}${result.net_profit}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">({result.net_profit_percent}%)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Win Rate</span>
              <span className="text-base font-bold font-mono text-white">{result.win_rate_percent}%</span>
              <span className="text-[10px] text-slate-400 block">{result.winning_trades}G / {result.losing_trades}P</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Profit Factor</span>
              <span className="text-base font-bold font-mono text-blue-400">{result.profit_factor}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Max Drawdown</span>
              <span className="text-base font-bold font-mono text-rose-400">-{result.max_drawdown_percent}%</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Operaciones</span>
              <span className="text-base font-bold font-mono text-white">{result.total_trades}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Capital Final</span>
              <span className="text-base font-bold font-mono text-emerald-400">${result.final_capital}</span>
            </div>
          </div>

          {/* Equity Curve Visualization */}
          {result.equity_curve.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Curva de Evolución del Capital (Equity Curve)
              </h3>

              <div className="h-44 w-full flex items-end gap-1 pt-6 pb-2 px-2 border-b border-slate-800 bg-slate-950/40 rounded-xl overflow-x-auto">
                {result.equity_curve.map((pt, idx) => {
                  const minCap = Math.min(...result.equity_curve.map(e => e.capital)) * 0.98;
                  const maxCap = Math.max(...result.equity_curve.map(e => e.capital)) * 1.02;
                  const range = maxCap - minCap || 1;
                  const heightPercent = Math.max(10, Math.min(100, ((pt.capital - minCap) / range) * 100));
                  const isUp = pt.capital >= result.initial_capital;

                  return (
                    <div
                      key={idx}
                      className="group relative flex-1 min-w-[6px] transition-all"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className={`w-full h-full rounded-t ${isUp ? 'bg-blue-500' : 'bg-rose-500'} opacity-75 group-hover:opacity-100`}></div>
                      {/* Tooltip */}
                      <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 p-1.5 rounded bg-slate-800 text-[10px] font-mono text-white whitespace-nowrap shadow-lg border border-slate-700 z-10">
                        ${pt.capital} (DD: -{pt.drawdown_percent}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trade Log Table */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white">Registro de Operaciones Simuladas ({result.trades.length})</h3>
            {result.trades.length === 0 ? (
              <p className="text-xs text-slate-500">Ninguna operación cumplió los filtros de entrada en este periodo.</p>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Dirección</th>
                      <th className="pb-2 text-right">Entrada</th>
                      <th className="pb-2 text-right">Salida</th>
                      <th className="pb-2">Motivo</th>
                      <th className="pb-2 text-right">PnL Neto ($)</th>
                      <th className="pb-2 text-right">PnL %</th>
                      <th className="pb-2 text-right">Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {result.trades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40">
                        <td className="py-2 font-mono text-slate-400">{t.id}</td>
                        <td className="py-2">
                          <StatusBadge type="direction" value={t.direction} />
                        </td>
                        <td className="py-2 text-right font-mono text-white">${t.entry_price}</td>
                        <td className="py-2 text-right font-mono text-white">${t.exit_price}</td>
                        <td className="py-2 text-[11px] font-mono text-slate-300">{t.exit_reason}</td>
                        <td className={`py-2 text-right font-mono font-bold ${t.pnl_amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.pnl_amount >= 0 ? '+' : ''}${t.pnl_amount}
                        </td>
                        <td className={`py-2 text-right font-mono ${t.pnl_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.pnl_percent >= 0 ? '+' : ''}{t.pnl_percent}%
                        </td>
                        <td className="py-2 text-right font-mono text-slate-300">${t.capital_after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legal Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-[11px] text-amber-300/80 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>{result.disclaimer}</p>
          </div>
        </div>
      )}
    </div>
  );
};
