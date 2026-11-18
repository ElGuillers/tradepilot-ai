import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Volume2,
  VolumeX,
  ExternalLink,
  X,
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { AlertNotification } from '../types';
import { getBrokerSymbol } from '../services/brokerSymbols';

interface AlertsPopoverProps {
  onSelectAlert: (symbol: string, market: string, timeframe?: string) => void;
}

// Simple synthesized chime using Web Audio API (Zero external assets needed)
function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // AudioContext blocked by browser policy until user interacts
  }
}

const formatRelativeTime = (timestamp: any) => {
  if (!timestamp) return 'Reciente';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Reciente';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Hace unos segs';
  if (diffSec < 3600) return `Hace ${Math.max(1, Math.floor(diffSec / 60))} min`;
  if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const AlertsPopover: React.FC<AlertsPopoverProps> = ({ onSelectAlert }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'green' | 'red' | 'blue' | 'yellow'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);

      // Check if new unread arrived to play chime
      const unreadCount = data.filter((n) => !n.read).length;
      if (prevCountRef.current > 0 && unreadCount > prevCountRef.current && soundEnabled) {
        playAlertChime();
      }
      prevCountRef.current = unreadCount;
    } catch (e) {
      // Silently fail if server restarting
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleItemClick = async (notif: AlertNotification) => {
    try {
      if (!notif.read) {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      }
    } catch (e) {}
    setIsOpen(false);
    onSelectAlert(notif.symbol, notif.market || 'crypto', notif.timeframe);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.color === filter;
  });

  const getColorStyles = (color: string) => {
    switch (color) {
      case 'green':
        return {
          border: 'border-slate-800 hover:border-emerald-500/60 border-l-4 border-l-emerald-500',
          bg: 'bg-slate-900 hover:bg-slate-850',
          badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
        };
      case 'red':
        return {
          border: 'border-slate-800 hover:border-rose-500/60 border-l-4 border-l-rose-500',
          bg: 'bg-slate-900 hover:bg-slate-850',
          badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <TrendingDown className="w-4 h-4 text-rose-400" />
        };
      case 'blue':
        return {
          border: 'border-slate-800 hover:border-cyan-500/60 border-l-4 border-l-cyan-500',
          bg: 'bg-slate-900 hover:bg-slate-850',
          badge: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
          dot: 'bg-cyan-400',
          icon: <Zap className="w-4 h-4 text-cyan-400" />
        };
      case 'yellow':
      default:
        return {
          border: 'border-slate-800 hover:border-amber-500/60 border-l-4 border-l-amber-500',
          bg: 'bg-slate-900 hover:bg-slate-850',
          badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <Compass className="w-4 h-4 text-amber-400" />
        };
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all border ${
          isOpen
            ? 'bg-slate-800 border-indigo-500 text-indigo-400 shadow-lg'
            : unreadCount > 0
            ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-slate-600'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
        title="Centro de Alertas por Colores"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card - Mobile-responsive & centered, desktop right-aligned */}
      {isOpen && (
        <>
          {/* Mobile backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-2.5 right-2.5 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-[440px] max-h-[82vh] flex flex-col rounded-2xl bg-[#090d16] border-2 border-slate-700 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] z-[100] overflow-hidden">
            {/* Header (Solid) */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Alertas Inteligentes
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40">
                      {unreadCount} nuevas
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">Clasificación visual por semáforo y confluencia</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg transition-colors text-xs ${
                  soundEnabled
                    ? 'text-indigo-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-800'
                }`}
                title={soundEnabled ? 'Sonido activado (clic para silenciar)' : 'Sonido desactivado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Leídas</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color Category Tabs (Solid) */}
          <div className="flex items-center gap-1 p-2 bg-[#0d121f] border-b border-slate-800 overflow-x-auto text-[11px] scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('green')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filter === 'green'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Compras ({notifications.filter((n) => n.color === 'green').length})
            </button>
            <button
              onClick={() => setFilter('red')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filter === 'red'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Ventas ({notifications.filter((n) => n.color === 'red').length})
            </button>
            <button
              onClick={() => setFilter('blue')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filter === 'blue'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Rupturas ({notifications.filter((n) => n.color === 'blue').length})
            </button>
            <button
              onClick={() => setFilter('yellow')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                filter === 'yellow'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Vigilancia ({notifications.filter((n) => n.color === 'yellow').length})
            </button>
          </div>

          {/* Notifications List (Solid background container) */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[55vh] bg-[#090d16]">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-400">No hay alertas en esta categoría</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  El motor cuantitativo notificará automáticamente cuando detecte confluencias.
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const styles = getColorStyles(notif.color);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`group relative p-3 rounded-xl border transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 ${
                      styles.border
                    } ${notif.read ? 'opacity-70 hover:opacity-100' : 'shadow-md shadow-black/40'}`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
                        <span className="text-xs font-black font-mono text-white tracking-wider">
                          {notif.symbol}
                        </span>
                        {(() => {
                          const brokerSym = getBrokerSymbol(notif.symbol);
                          if (brokerSym && brokerSym.toUpperCase() !== notif.symbol.toUpperCase()) {
                            return (
                              <span
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap shrink-0"
                                title={`Siglas en Broker (MetaTrader): ${brokerSym}`}
                              >
                                {brokerSym}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${styles.badge}`}>
                          {notif.direction} • {notif.timeframe}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <span className="text-xs font-mono font-black text-white">{notif.score.toFixed(0)}</span>
                        <span className="text-[10px] text-slate-500">/100</span>
                      </div>
                    </div>

                    {/* Title */}
                    <p className="text-xs font-bold text-slate-100 mb-1 leading-snug group-hover:text-white">
                      {notif.title}
                    </p>

                    {/* Message */}
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-2 font-normal">
                      {notif.message}
                    </p>

                    {/* Trade Levels (Solid box) */}
                    {notif.entry_price && (
                      <div className="flex items-center gap-3 text-[10px] font-mono p-2 rounded-lg bg-slate-950 border border-slate-800 mb-1.5">
                        <span className="text-slate-300">
                          Entrada: <strong className="text-white">${notif.entry_price}</strong>
                        </span>
                        {notif.stop_loss && (
                          <span className="text-rose-400">
                            SL: <strong className="text-rose-300">${notif.stop_loss}</strong>
                          </span>
                        )}
                        {notif.take_profit_1 && (
                          <span className="text-emerald-400">
                            TP: <strong className="text-emerald-300">${notif.take_profit_1}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formatRelativeTime(notif.timestamp)}</span>
                      </div>
                      <span className="flex items-center gap-1 text-indigo-400 font-bold group-hover:underline">
                        Ver en Gráfico <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legend Footer (Solid) */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Compra &ge;70
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> Venta &ge;70
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Ruptura
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Vigilancia
            </span>
          </div>
        </div>
      </>
    )}
  </div>
);
};
