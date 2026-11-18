import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { RiskCalculation } from '../types';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntry?: number;
  defaultStopLoss?: number;
  defaultTakeProfit?: number;
  defaultDirection?: string;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultEntry = 65000,
  defaultStopLoss = 64000,
  defaultTakeProfit = 67500,
  defaultDirection = 'BUY'
}) => {
  const [balance, setBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [entry, setEntry] = useState<number>(defaultEntry);
  const [stopLoss, setStopLoss] = useState<number>(defaultStopLoss);
  const [takeProfit, setTakeProfit] = useState<number>(defaultTakeProfit);
  const [direction, setDirection] = useState<string>(defaultDirection);
  const [result, setResult] = useState<RiskCalculation | null>(null);

  useEffect(() => {
    if (defaultEntry > 0) setEntry(defaultEntry);
    if (defaultStopLoss > 0) setStopLoss(defaultStopLoss);
    if (defaultTakeProfit > 0) setTakeProfit(defaultTakeProfit);
    if (defaultDirection) setDirection(defaultDirection);
  }, [defaultEntry, defaultStopLoss, defaultTakeProfit, defaultDirection]);

  useEffect(() => {
    if (isOpen) {
      calculate();
    }
  }, [balance, riskPercent, entry, stopLoss, takeProfit, direction, isOpen]);

  const calculate = async () => {
    try {
      const data = await api.calculateRisk({
        account_balance: Number(balance),
        risk_percentage: Number(riskPercent),
        entry_price: Number(entry),
        stop_loss: Number(stopLoss),
        take_profit: Number(takeProfit),
        direction: direction
      });
      setResult(data);
    } catch (err) {
      // Handled silently
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Calculadora de Gestión de Riesgo</h3>
              <p className="text-xs text-slate-400">Simulación cuantitativa y tamaño de posición hipotético</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Capital Hipotético ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Riesgo por Operación (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Precio de Entrada</label>
              <input
                type="number"
                step="any"
                value={entry}
                onChange={(e) => setEntry(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dirección</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="BUY">BUY (Largo)</option>
                <option value="SELL">SELL (Corto)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1.5">Stop Loss Hipotético</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1.5">Take Profit Hipotético</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Results Card */}
          {result && (
            <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400">Perfil de Riesgo:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {result.risk_profile}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <p className="text-[11px] text-slate-400">Riesgo Monetario</p>
                  <p className="text-sm font-bold font-mono text-rose-400">${result.monetary_risk}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <p className="text-[11px] text-slate-400">Tamaño Posición</p>
                  <p className="text-sm font-bold font-mono text-white">{result.position_size_units} u.</p>
                  <p className="text-[10px] text-slate-400 font-mono">(${result.position_value})</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <p className="text-[11px] text-slate-400">Ratio Riesgo/Beneficio</p>
                  <p className={`text-sm font-bold font-mono ${result.is_valid_risk_reward ? 'text-emerald-400' : 'text-amber-400'}`}>
                    1 : {result.risk_reward_ratio}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Distancia a Stop Loss:</span>
                  <span className="font-mono text-rose-400">-{result.stop_loss_percent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Beneficio Potencial:</span>
                  <span className="font-mono text-emerald-400">+${result.potential_profit} (+{result.take_profit_percent}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Legal Disclaimer */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-300/80 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Los cálculos son estrictamente teóricos con fines educativos. TradePilot AI no formula recomendaciones de inversión personalizadas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
