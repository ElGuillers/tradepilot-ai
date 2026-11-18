import React from 'react';
import { ShieldCheck, Cpu, Calculator, Menu } from 'lucide-react';
import { AlertsPopover } from './AlertsPopover';

interface NavbarProps {
  onOpenRiskModal: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string, market?: string, timeframe?: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRiskModal,
  selectedSymbol,
  onSelectSymbol,
  onToggleMobileMenu
}) => {
  const popularSymbols = [
    { id: 'BTCUSDT', label: 'BTC', market: 'crypto' },
    { id: 'ETHUSDT', label: 'ETH', market: 'crypto' },
    { id: 'SOLUSDT', label: 'SOL', market: 'crypto' },
    { id: 'PAXGUSDT', label: 'ORO', market: 'crypto' },
    { id: 'NVDA', label: 'NVDA', market: 'stocks' },
    { id: 'TSLA', label: 'TSLA', market: 'stocks' },
    { id: 'AAPL', label: 'AAPL', market: 'stocks' },
    { id: 'SPY', label: 'SPY', market: 'indices' },
  ];

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Mobile Hamburger & Quick Symbol Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden shrink-0 transition"
            title="Abrir menú lateral"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden xs:inline shrink-0">
            Activo:
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {popularSymbols.map((item) => {
              const active = selectedSymbol.toUpperCase() === item.id.toUpperCase();
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSymbol(item.id, item.market)}
                  className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-mono font-semibold transition-colors flex items-center shrink-0 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Color-Coded Alerts Popover */}
        <AlertsPopover
          onSelectAlert={(sym, mkt, tf) => {
            onSelectSymbol(sym, mkt, tf);
          }}
        />

        {/* Risk Calculator Shortcut */}
        <button
          onClick={onOpenRiskModal}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          title="Abrir Calculadora de Riesgo Teórico"
        >
          <Calculator className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Gestión de Riesgo</span>
        </button>

        {/* System Safeguard Status */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Solo Análisis</span>
        </div>

        {/* AI Engine Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <Cpu className="w-3.5 h-3.5" />
          <span>Motor Cuántico + IA</span>
        </div>
      </div>
    </header>
  );
};
