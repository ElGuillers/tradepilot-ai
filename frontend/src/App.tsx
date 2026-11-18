import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  ScanSearch,
  BellRing,
  Menu
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { Timeframe } from './types';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { MarketsPage } from './pages/MarketsPage';
import { ChartPage } from './pages/ChartPage';
import { ScannerPage } from './pages/ScannerPage';
import { SignalsPage } from './pages/SignalsPage';
import { AIPage } from './pages/AIPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [riskModalOpen, setRiskModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [aiTarget, setAiTarget] = useState<{ symbol: string; timeframe: string }>({
    symbol: 'BTCUSDT',
    timeframe: '1h'
  });

  const handleNavigate = (tab: string, symbol?: string, timeframe?: string) => {
    if (symbol) {
      setSelectedSymbol(symbol);
    }
    if (timeframe) {
      setSelectedTimeframe(timeframe as Timeframe);
    }
    setCurrentTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateAI = (symbol: string, timeframe: string) => {
    setAiTarget({ symbol, timeframe });
    setCurrentTab('ai');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'markets', label: 'Mercados', icon: TrendingUp },
    { id: 'charts', label: 'Gráficos', icon: LineChart },
    { id: 'scanner', label: 'Escáner', icon: ScanSearch },
    { id: 'signals', label: 'Señales', icon: BellRing },
  ];

  return (
    <div className="flex bg-[#0b0e14] text-slate-100 min-h-screen overflow-x-hidden">
      {/* Navigation Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setMobileMenuOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Navbar
          onOpenRiskModal={() => setRiskModalOpen(true)}
          selectedSymbol={selectedSymbol}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onSelectSymbol={(sym, _mkt, tf) => {
            setSelectedSymbol(sym);
            if (tf) {
              setSelectedTimeframe(tf as Timeframe);
            }
            setCurrentTab('charts');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={handleNavigate}
              selectedSymbol={selectedSymbol}
            />
          )}

          {currentTab === 'markets' && (
            <MarketsPage
              onSelectSymbol={(sym) => {
                setSelectedSymbol(sym);
                setCurrentTab('charts');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'charts' && (
            <ChartPage
              symbol={selectedSymbol}
              initialTimeframe={selectedTimeframe}
              onOpenRiskModal={() => setRiskModalOpen(true)}
              onNavigateAI={handleNavigateAI}
              onNavigateSettings={() => {
                setCurrentTab('settings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectCrypto={(sym) => setSelectedSymbol(sym)}
            />
          )}

          {currentTab === 'scanner' && (
            <ScannerPage
              onNavigateChart={(sym, tf) => handleNavigate('charts', sym, tf)}
            />
          )}

          {currentTab === 'signals' && <SignalsPage />}

          {currentTab === 'ai' && (
            <AIPage
              initialSymbol={aiTarget.symbol}
              initialTimeframe={aiTarget.timeframe}
            />
          )}

          {currentTab === 'backtesting' && <BacktestingPage />}

          {currentTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Mobile/Tablet Bottom Navigation Bar (Fixed for quick one-thumb navigation on phones & tablets) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around px-1 py-1.5 shadow-2xl safe-area-bottom">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 ${
                active ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'scale-110 text-blue-400' : ''} transition-transform`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
        {/* Menu drawer button on mobile */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors flex-1 ${
            ['ai', 'backtesting', 'settings'].includes(currentTab)
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-tight">Más</span>
        </button>
      </nav>

      {/* Global Risk Management Modal */}
      <RiskCalculatorModal
        isOpen={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
      />
    </div>
  );
};

export default App;
