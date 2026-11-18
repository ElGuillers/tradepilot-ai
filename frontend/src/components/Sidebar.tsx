import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  ScanSearch,
  BellRing,
  Bot,
  History,
  Settings as SettingsIcon,
  ShieldAlert,
  Radio
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'markets', label: 'Mercados', icon: TrendingUp },
    { id: 'charts', label: 'Gráficos', icon: LineChart },
    { id: 'scanner', label: 'Escáner', icon: ScanSearch },
    { id: 'signals', label: 'Señales & Alertas', icon: BellRing },
    { id: 'ai', label: 'Análisis IA', icon: Bot },
    { id: 'backtesting', label: 'Backtesting', icon: History },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl">
              TP
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                TradePilot <span className="text-xs bg-blue-500/20 text-blue-400 font-mono px-1.5 py-0.5 rounded border border-blue-500/30">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Market Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Safety Notice & Live Status Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <div className="text-[11px]">
            <p className="font-semibold text-emerald-400">Binance API Activa</p>
            <p className="text-slate-400 text-[10px]">Cripto en tiempo real</p>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight text-amber-300/80 font-medium">
            Entorno de sólo análisis. Ejecución de operaciones reales prohibida por diseño.
          </p>
        </div>
      </div>
    </aside>
  );
};
