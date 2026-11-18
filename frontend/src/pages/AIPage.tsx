import React, { useState, useEffect } from 'react';
import {
  Bot,
  Cpu,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { AIAnalysisResponse, Timeframe } from '../types';

interface AIPageProps {
  initialSymbol?: string;
  initialTimeframe?: string;
}

export const AIPage: React.FC<AIPageProps> = ({
  initialSymbol = 'BTCUSDT',
  initialTimeframe = '1h'
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe as Timeframe);
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>('auto');

  useEffect(() => {
    if (initialSymbol) setSymbol(initialSymbol);
    if (initialTimeframe) setTimeframe(initialTimeframe as Timeframe);
  }, [initialSymbol, initialTimeframe]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const data = await api.analyzeWithAI(
        symbol.toUpperCase(),
        timeframe,
        'crypto',
        provider === 'auto' ? undefined : provider
      );
      setAnalysis(data);
    } catch (err: any) {
      alert(`Error en análisis IA: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [symbol, timeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Asistente Cuantitativo e Inteligencia Artificial
          </h2>
          <p className="text-xs text-slate-400">
            Interpretación estructurada de indicadores, detección de contradicciones y escenarios probabilísticos.
          </p>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="BTCUSDT"
            className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500 uppercase font-bold"
          />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
          >
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Analizando...' : 'Analizar con IA'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <div>
            <p className="text-sm font-bold text-white">Consultando motor cuantitativo y generando reporte IA...</p>
            <p className="text-xs text-slate-400">Extrayendo confluencias, divergencias y escenarios alcistas y bajistas.</p>
          </div>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Provider pill & Summary */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Proveedor utilizado:</span>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {analysis.provider_used}
                </span>
                {analysis.status === 'no_ai_mode' && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    Modo Reglas Técnicas
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-slate-400">{analysis.symbol} ({analysis.timeframe})</span>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Resumen Ejecutivo</h4>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {analysis.summary}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Interpretación de Tendencia y Medias</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysis.trend_interpretation}
              </p>
            </div>
          </div>

          {/* Confluences and Contradictions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confluences */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Confluencias Detectadas
              </h4>
              <ul className="space-y-2">
                {analysis.confluences.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contradictions & Risks */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Contradicciones o Advertencias
              </h4>
              <ul className="space-y-2">
                {analysis.contradictions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Scenarios: Bullish & Bearish */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.bullish_scenario && (
              <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" />
                    Escenario Alcista
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300">
                    Target: ${analysis.bullish_scenario.target}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-400"><strong className="text-white">Detonante:</strong> {analysis.bullish_scenario.trigger}</p>
                  <p className="text-slate-400"><strong className="text-white">Invalidación:</strong> ${analysis.bullish_scenario.invalidation}</p>
                  <p className="text-slate-300 pt-1 leading-relaxed">{analysis.bullish_scenario.explanation}</p>
                </div>
              </div>
            )}

            {analysis.bearish_scenario && (
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4" />
                    Escenario Bajista
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-300">
                    Target: ${analysis.bearish_scenario.target}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-400"><strong className="text-white">Detonante:</strong> {analysis.bearish_scenario.trigger}</p>
                  <p className="text-slate-400"><strong className="text-white">Invalidación:</strong> ${analysis.bearish_scenario.invalidation}</p>
                  <p className="text-slate-300 pt-1 leading-relaxed">{analysis.bearish_scenario.explanation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Recommendation summary & Discrepancies */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Síntesis Analítica</h4>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              {analysis.recommendation_summary}
            </p>
            {analysis.discrepancy_with_technical && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                {analysis.discrepancy_with_technical}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>{analysis.disclaimer}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};
