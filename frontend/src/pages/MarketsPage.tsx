import React, { useState, useEffect } from 'react';
import { Search, Star, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { wsManager, LiveTickerUpdate } from '../services/websocket';
import { getStoredFavorites, toggleStoredFavorite } from '../services/favorites';
import { getBrokerSymbol } from '../services/brokerSymbols';
import { MarketOverviewItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface MarketsPageProps {
  onSelectSymbol: (symbol: string) => void;
  onNavigate: (tab: string, symbol?: string) => void;
}

export const MarketsPage: React.FC<MarketsPageProps> = ({ onSelectSymbol, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'crypto' | 'commodities' | 'forex' | 'stocks' | 'indices'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [markets, setMarkets] = useState<MarketOverviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(getStoredFavorites());

  // Listen to favorite changes across components
  useEffect(() => {
    const syncFavs = () => setFavorites(getStoredFavorites());
    window.addEventListener('tradepilot_favorites_updated', syncFavs);
    return () => window.removeEventListener('tradepilot_favorites_updated', syncFavs);
  }, []);

  const loadMarkets = async (force: boolean = false) => {
    if (markets.length === 0 || force) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await api.getMarkets(undefined, force);
      setMarkets(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al conectar con los proveedores de mercado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
  }, []);

  // Real-time WebSocket updates for all crypto symbols
  useEffect(() => {
    const unsubscribe = wsManager.subscribeAllTickers((tickerMap: Map<string, LiveTickerUpdate>) => {
      setMarkets((prev) =>
        prev.map((item) => {
          if (item.market === 'crypto' && tickerMap.has(item.symbol)) {
            const live = tickerMap.get(item.symbol)!;
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
        })
      );
    });

    return () => unsubscribe();
  }, []);

  const handleToggleFavorite = (symbol: string) => {
    toggleStoredFavorite(symbol);
    setFavorites(getStoredFavorites());
  };

  const filtered = markets.filter(item => {
    if (activeTab === 'favorites') {
      if (!favorites.has(item.symbol.toUpperCase())) return false;
    } else if (activeTab !== 'all' && item.market !== activeTab) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const brokerSym = getBrokerSymbol(item.symbol).toLowerCase();
      return item.symbol.toLowerCase().includes(term) || brokerSym.includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Directorio Multimercado
            <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              STREAMING EN VIVO
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Explora activos de criptomonedas, divisas forex, acciones e índices globales con sus siglas de Broker (MetaTrader).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar (BTC, XAUUSD, US500, NVDA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 font-mono"
            />
          </div>
          <button
            onClick={() => loadMarkets(true)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
            title="Actualizar cotizaciones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        {([
          { id: 'all', label: 'Todos' },
          { id: 'favorites', label: `⭐ Favoritos (${favorites.size})` },
          { id: 'crypto', label: 'Criptomonedas' },
          { id: 'commodities', label: '🪙 Oro & Commodities' },
          { id: 'forex', label: 'Forex' },
          { id: 'stocks', label: 'Acciones' },
          { id: 'indices', label: 'Índices' }
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === tab.id
              ? tab.id === 'commodities'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : tab.id === 'favorites'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                  : 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notice about traditional markets data status */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-white">Transparencia y Cobertura:</strong> Las principales Acciones de Wall Street (NVDA, TSLA, AAPL, MSFT, etc.) e Índices (SPY, QQQ) cuentan con datos y velas reales sin requerir claves API. El Oro Spot 1:1 físico (PAXGUSDT) y Criptomonedas transmiten en streaming de alta velocidad vía Binance.
        </p>
      </div>

      {/* Assets Grid */}
      {loading && markets.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-800" />
                  <div className="h-4 bg-slate-800 rounded w-16" />
                  <div className="h-4 bg-slate-800/60 rounded w-20" />
                </div>
                <div className="h-4 bg-slate-800/80 rounded w-16" />
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-800/60 rounded w-10" />
                  <div className="h-5 bg-slate-800 rounded w-24" />
                </div>
                <div className="space-y-1.5 flex flex-col items-end">
                  <div className="h-2.5 bg-slate-800/60 rounded w-14" />
                  <div className="h-4 bg-slate-800 rounded w-12" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <div className="h-3 bg-slate-800/50 rounded w-28" />
                <div className="h-3 bg-slate-800/60 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : error && markets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto opacity-80" />
          <p className="text-sm font-semibold text-rose-300">{error}</p>
          <button
            onClick={() => loadMarkets(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition"
          >
            Reintentar Conexión
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <Star className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-slate-300">
            {activeTab === 'favorites'
              ? 'No tienes activos en favoritos'
              : 'No se encontraron activos para los filtros seleccionados'}
          </p>
          <p className="text-xs text-slate-500">
            {activeTab === 'favorites'
              ? 'Haz clic en el ícono de estrella ⭐ de cualquier activo para fijarlo como favorito y acceder rápidamente.'
              : 'Prueba cambiando de categoría o limpiando la búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const isFav = favorites.has(item.symbol.toUpperCase());
            return (
              <div
                key={item.symbol}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(item.symbol);
                      }}
                      className="p-1 rounded hover:bg-slate-800 transition text-slate-500 hover:text-amber-400 shrink-0"
                      title={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <Star className={`w-4 h-4 transition-transform active:scale-125 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                    </button>
                    <span className="font-bold font-mono text-white text-sm whitespace-nowrap">{item.symbol}</span>
                    {(() => {
                      const brokerSym = getBrokerSymbol(item.symbol);
                      if (brokerSym && brokerSym.toUpperCase() !== item.symbol.toUpperCase()) {
                        return (
                          <span
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap shrink-0"
                            title={`Siglas en Broker / MetaTrader: ${brokerSym}`}
                          >
                            {brokerSym}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    {item.symbol === 'PAXGUSDT' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                        🪙 ORO SPOT 1:1
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap shrink-0">
                        {item.market}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    <StatusBadge type="data_status" value={item.data_status} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">Precio</p>
                    <p className="text-base font-bold font-mono text-white">
                      ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">Variación 24h</p>
                    <p className={`text-sm font-bold font-mono ${item.change_24h_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.change_24h_percent >= 0 ? '+' : ''}{item.change_24h_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                    {item.data_source}
                  </span>
                  <button
                    onClick={() => {
                      onSelectSymbol(item.symbol);
                      onNavigate('charts', item.symbol);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    <span>Analizar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
