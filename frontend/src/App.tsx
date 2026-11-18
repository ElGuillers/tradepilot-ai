import React, { useState } from 'react';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateAI = (symbol: string, timeframe: string) => {
    setAiTarget({ symbol, timeframe });
    setCurrentTab('ai');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex bg-[#0b0e14] text-slate-100 min-h-screen">
      {/* Navigation Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          onOpenRiskModal={() => setRiskModalOpen(true)}
          selectedSymbol={selectedSymbol}
          onSelectSymbol={(sym, _mkt, tf) => {
            setSelectedSymbol(sym);
            if (tf) {
              setSelectedTimeframe(tf as Timeframe);
            }
            setCurrentTab('charts');
          }}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
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
              onNavigateSettings={() => setCurrentTab('settings')}
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

      {/* Global Risk Management Modal */}
      <RiskCalculatorModal
        isOpen={riskModalOpen}
        onClose={() => setRiskModalOpen(false)}
      />
    </div>
  );
};

export default App;
