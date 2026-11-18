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
  Radio,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpenMobile = false,
  onCloseMobile
}) => {
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

  const handleSelectTab = (tabId: string) => {
    setCurrentTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl shrink-0">
              TP
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                TradePilot <span className="text-xs bg-blue-500/20 text-blue-400 font-mono px-1.5 py-0.5 rounded border border-blue-500/30">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Market Intelligence</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
              title="Cerrar Menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
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
      <div className="p-4 border-t border-slate-800 space-y-2.5">
        <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <div className="text-[11px]">
            <p className="font-semibold text-emerald-400">Binance API Activa</p>
            <p className="text-slate-400 text-[10px]">Cripto en tiempo real</p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight text-amber-300/80 font-medium">
            Entorno de sólo análisis. Operaciones reales prohibidas.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (Visible >= lg) */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col h-screen sticky top-0 shrink-0 z-30">
        {navContent}
      </aside>

      {/* Mobile/Tablet Slide-Out Drawer (Visible < lg when opened) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Slide Drawer Content */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
