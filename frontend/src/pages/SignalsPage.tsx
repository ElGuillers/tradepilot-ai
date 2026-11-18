import React, { useState, useEffect } from 'react';
import {
  BellRing,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Zap,
  Activity,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { api } from '../services/api';
import { SignalResponse, AlertItem, AlertNotification } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { getBrokerSymbol } from '../services/brokerSymbols';

export const SignalsPage: React.FC = () => {
  const [history, setHistory] = useState<SignalResponse[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSignal, setSelectedSignal] = useState<SignalResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'history' | 'alerts'>('feed');

  // New alert form state
  const [newSymbol, setNewSymbol] = useState<string>('BTCUSDT');
  const [newTimeframe, setNewTimeframe] = useState<string>('1h');
  const [newMinScore, setNewMinScore] = useState<number>(75);
  const [newType, setNewType] = useState<string>('ANY');
  const [newTelegram, setNewTelegram] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [histData, alertData, settingsData, notifData] = await Promise.all([
        api.getSignalHistory().catch(() => ({ signals: [] })),
        api.getAlerts().catch(() => []),
        api.getSettings().catch(() => null),
        api.getNotifications().catch(() => [])
      ]);
      setHistory(histData.signals || []);
      setAlerts(alertData || []);
      setNotifications(notifData || []);
      if (settingsData) setSettings(settingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createAlert({
        symbol: newSymbol.toUpperCase(),
        market: 'crypto',
        timeframe: newTimeframe,
        min_score: Number(newMinScore),
        signal_type: newType,
        telegram_notify: newTelegram
      });
      await loadData();
    } catch (err) {
      alert('Error creando alerta');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await api.deleteAlert(id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      alert('Error eliminando alerta');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BellRing className="w-5 h-5 text-blue-400" />
          Centro de Señales y Alertas
        </h2>
        <p className="text-xs text-slate-400">
          Supervisa el historial de señales generadas por el motor y configura alertas en tiempo real.
        </p>
      </div>

      {/* Autonomous Telegram Radar Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">Radar Autónomo a Telegram (24/7)</h3>
              {settings?.telegram_configured ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  DESPACHO AUTOMÁTICO ACTIVO
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  REQUIERE CONFIGURAR TELEGRAM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              El motor escanea en segundo plano los activos clave: <strong className="text-amber-300">Oro Spot 1:1 (XAUUSD)</strong>, <strong className="text-white">Bitcoin</strong>, <strong className="text-white">Ethereum</strong>, <strong className="text-white">Solana</strong>, <strong className="text-white">Nvidia</strong>, <strong className="text-white">Tesla</strong> y <strong className="text-white">S&P 500</strong>. Cualquier confluencia de alta probabilidad (≥ 70 pts) o ruptura confirmada se despacha automáticamente a tu Telegram con TP, SL y precio de entrada.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main View with Tabs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'feed'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Feed en Vivo & Rupturas</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/60 text-[10px] font-mono">
                    {history.length}
                  </span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                Auto-sync cada 15s
              </span>
            </div>

            {/* TAB 1: Live Feed & Rupturas */}
            {activeTab === 'feed' && (
              <div className="space-y-3">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Escaneando mercado en vivo...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2 text-xs">
                    <p className="font-semibold text-slate-300">Escáner autónomo activo</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Las rupturas técnicas, señales de compra/venta y setups en vigilancia aparecerán aquí en cuanto el mercado genere movimiento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {notifications.map((notif) => {
                      const isBreakout = notif.category === 'breakout';
                      const isBuy = notif.category === 'buy';
                      const isSell = notif.category === 'sell';
                      const brokerName = getBrokerSymbol(notif.symbol);

                      return (
                        <div
                          key={notif.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isBreakout
                              ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/50'
                              : isBuy
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                              : isSell
                              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">
                                {isBreakout ? '💥' : isBuy ? '🚀' : isSell ? '⚠️' : '👀'}
                              </span>
                              <span className="font-bold text-white text-xs">
                                {brokerName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {notif.timeframe}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {isBreakout ? 'Ruptura Técnica' : isBuy ? 'Compra' : isSell ? 'Venta' : 'Setup Vigilado'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusBadge type="score" value={notif.score} />
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed mb-2 line-clamp-2">
                            {notif.message}
                          </p>

                          {/* Levels preview */}
                          {(notif.entry_price || notif.stop_loss || notif.take_profit_1) && (
                            <div className="flex items-center gap-3 text-[11px] font-mono pt-2 border-t border-slate-800/80 flex-wrap">
                              {notif.entry_price && (
                                <span className="text-slate-300">
                                  Entrada: <strong className="text-blue-400">${notif.entry_price.toLocaleString()}</strong>
                                </span>
                              )}
                              {notif.stop_loss && (
                                <span className="text-slate-300">
                                  SL: <strong className="text-rose-400">${notif.stop_loss.toLocaleString()}</strong>
                                </span>
                              )}
                              {notif.take_profit_1 && (
                                <span className="text-slate-300">
                                  TP: <strong className="text-emerald-400">${notif.take_profit_1.toLocaleString()}</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Confirmed Signal History */}
            {activeTab === 'history' && (
              <div>
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Cargando historial de señales...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2 text-xs">
                    <p>No hay señales almacenadas en base de datos aún.</p>
                    <p className="text-[11px] text-slate-500">
                      Las señales con puntuación superior a 60 se guardan automáticamente al explorar los activos.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2.5">Activo</th>
                          <th className="pb-2.5">TF</th>
                          <th className="pb-2.5">Dirección</th>
                          <th className="pb-2.5">Puntuación</th>
                          <th className="pb-2.5 text-right">Entrada</th>
                          <th className="pb-2.5 text-right">SL</th>
                          <th className="pb-2.5 text-right">TP 1</th>
                          <th className="pb-2.5 text-center">Detalles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {history.map((sig, i) => (
                          <tr key={sig.id || i} className="hover:bg-slate-800/40">
                            <td className="py-2.5 font-mono font-bold text-white">{sig.symbol}</td>
                            <td className="py-2.5 font-mono text-slate-400">{sig.timeframe}</td>
                            <td className="py-2.5">
                              <StatusBadge type="direction" value={sig.direction} />
                            </td>
                            <td className="py-2.5">
                              <StatusBadge type="score" value={sig.score} />
                            </td>
                            <td className="py-2.5 text-right font-mono text-white">${sig.entry_price}</td>
                            <td className="py-2.5 text-right font-mono text-rose-400">${sig.stop_loss}</td>
                            <td className="py-2.5 text-right font-mono text-emerald-400">${sig.take_profit_1}</td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => setSelectedSignal(sig)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                              >
                                Ver
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Create & Manage Alerts */}
        <div className="space-y-4">
          {/* Create Alert Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Configurar Nueva Alerta
            </h3>

            <form onSubmit={handleCreateAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Símbolo (Cripto)</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                  placeholder="BTCUSDT"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Temporalidad</label>
                  <select
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none"
                  >
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1h">1h</option>
                    <option value="4h">4h</option>
                    <option value="1d">1d</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tipo</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none"
                  >
                    <option value="ANY">Cualquiera</option>
                    <option value="BUY">Solo BUY</option>
                    <option value="SELL">Solo SELL</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Puntuación Mínima:</span>
                  <span className="font-mono text-white">{newMinScore} pts</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={newMinScore}
                  onChange={(e) => setNewMinScore(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="telegramCheck"
                  checked={newTelegram}
                  onChange={(e) => setNewTelegram(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-500"
                />
                <label htmlFor="telegramCheck" className="text-slate-300 cursor-pointer">
                  Notificar por Telegram (si bot configurado)
                </label>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-500/20"
              >
                {creating ? 'Guardando...' : 'Crear Alerta'}
              </button>
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Alertas Activas ({alerts.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">No hay alertas configuradas.</p>
              ) : (
                alerts.map(a => (
                  <div key={a.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-mono font-bold text-white">{a.symbol} ({a.timeframe})</p>
                      <p className="text-[10px] text-slate-400">Mín {a.min_score} pts • {a.signal_type}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(a.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedSignal.symbol} ({selectedSignal.timeframe})</h3>
                <p className="text-xs text-slate-400">Detalle de confluencias cuantitativas</p>
              </div>
              <StatusBadge type="direction" value={selectedSignal.direction} />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              {selectedSignal.justification}
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-[10px] text-slate-400 block">Entrada</span>
                <span className="font-mono font-bold text-blue-400">${selectedSignal.entry_price}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] text-slate-400 block">Stop Loss</span>
                <span className="font-mono font-bold text-rose-400">${selectedSignal.stop_loss}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-slate-400 block">Take Profit 1</span>
                <span className="font-mono font-bold text-emerald-400">${selectedSignal.take_profit_1}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSignal(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
