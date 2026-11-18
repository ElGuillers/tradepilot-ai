import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Key,
  ShieldCheck,
  Send,
  Radio,
  Save,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [claudeKey, setClaudeKey] = useState<string>('');
  const [aiProvider, setAiProvider] = useState<string>('gemini');
  const [telegramToken, setTelegramToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramAuto, setTelegramAuto] = useState<boolean>(true);
  const [telegramMinScore, setTelegramMinScore] = useState<number>(70);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [balance, setBalance] = useState<number>(10000);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [testingTelegram, setTestingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Security Lock & Visibility Controls
  const [unlockCredentials, setUnlockCredentials] = useState<boolean>(false);
  const [showToken, setShowToken] = useState<boolean>(false);

  useEffect(() => {
    // Scrub any legacy plain text tokens from local storage for total safety
    try {
      localStorage.removeItem('tradepilot_telegram_token');
      localStorage.removeItem('tradepilot_telegram_chat_id');
    } catch {}
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setAiProvider(data.ai_provider || 'gemini');
      setRiskPercent(data.default_risk_percent || 1.5);
      setBalance(data.default_account_balance || 10000);
      if (data.telegram_auto_alerts !== undefined) {
        setTelegramAuto(data.telegram_auto_alerts);
      }
      if (data.telegram_min_score !== undefined) {
        setTelegramMinScore(data.telegram_min_score);
      }
      // Keep input empty if already configured in cloud so raw token is never exposed
      setTelegramToken('');
      setTelegramChatId('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateSettings({
        gemini_api_key: geminiKey || undefined,
        anthropic_api_key: claudeKey || undefined,
        ai_provider: aiProvider,
        telegram_bot_token: telegramToken.trim() ? telegramToken.trim() : undefined,
        telegram_chat_id: telegramChatId.trim() ? telegramChatId.trim() : undefined,
        telegram_auto_alerts: telegramAuto,
        telegram_min_score: Number(telegramMinScore),
        default_risk_percent: Number(riskPercent),
        default_account_balance: Number(balance)
      });
      setSavedSuccess(true);
      setUnlockCredentials(false);
      await loadSettings();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramToken && !settings?.telegram_configured) {
      setTelegramStatus({ success: false, message: 'Por favor ingresa primero el Telegram Bot Token.' });
      return;
    }
    if (!telegramChatId && !settings?.telegram_configured) {
      setTelegramStatus({ success: false, message: 'Por favor ingresa primero el Telegram Chat ID.' });
      return;
    }
    setTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await api.testTelegram(telegramToken || undefined, telegramChatId || undefined);
      setTelegramStatus({ success: true, message: res.message || '¡Mensaje de prueba enviado exitosamente!' });
    } catch (err: any) {
      setTelegramStatus({ success: false, message: err.message || 'Error al conectar con Telegram.' });
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          Configuración de TradePilot AI
        </h2>
        <p className="text-xs text-slate-400">
          Administra proveedores de mercado, integraciones de IA, credenciales y parámetros de riesgo.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Security Warning */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-xs leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white mb-0.5">Seguridad y Privacidad Estricta</h4>
            <p className="text-slate-400">
              TradePilot AI nunca solicita claves privadas de exchanges, contraseñas bancarias ni permisos de retiro o ejecución. Las claves API de proveedores de IA se gestionan exclusivamente en el backend y nunca son transmitidas al navegador.
            </p>
          </div>
        </div>

        {/* AI Provider Config */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            Configuración de Inteligencia Artificial
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Proveedor Activo</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="gemini">Google Gemini (Oficial)</option>
                <option value="claude">Anthropic Claude</option>
                <option value="none">Modo Seguro Sin IA (Reglas Técnicas Cuantitativas)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Google Gemini API Key {settings?.gemini_configured && <span className="text-emerald-400 font-mono text-[10px]">(Configurada en Backend)</span>}
              </label>
              <input
                type="password"
                placeholder={settings?.gemini_configured ? "••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Obtén tu clave gratuita en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google AI Studio</a>. Si no configuras ninguna clave, TradePilot AI funciona al 100% en modo reglas técnicas.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Anthropic Claude API Key (Opcional) {settings?.anthropic_configured && <span className="text-emerald-400 font-mono text-[10px]">(Configurada)</span>}
              </label>
              <input
                type="password"
                placeholder={settings?.anthropic_configured ? "••••••••••••••••••••••••••••••••" : "sk-ant-..."}
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Risk & Defaults Config */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400" />
            Parámetros de Riesgo Predeterminados
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Capital Hipotético Inicial ($)</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Riesgo Predeterminado por Operación (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Telegram Alerts Config */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Notificaciones por Telegram (Alertas Directas a tu Móvil)
            </h3>
            {settings?.telegram_configured && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Bot Cifrado y Activo
              </span>
            )}
          </div>

          {/* Security Banner */}
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-white">Protección de Seguridad de Credenciales</p>
              <p className="text-[11px] text-blue-300/80">
                Tus credenciales de Telegram están guardadas como variables de entorno privadas en el servidor (Render). 
                <strong> Nunca se transmiten en texto plano al navegador</strong>, por lo que nadie puede extraer tu token desde ningún dispositivo.
              </p>
            </div>
          </div>

          {settings?.telegram_configured && !unlockCredentials ? (
            /* Secure Vault View (When Already Configured) */
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Telegram Bot Token (Cifrado)</label>
                  <div className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs flex items-center justify-between">
                    <span>{settings?.telegram_bot_token_masked || "••••••••••••••••••••••••••••"}</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Telegram Chat ID (Cifrado)</label>
                  <div className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs flex items-center justify-between">
                    <span>{settings?.telegram_chat_id_masked || "••••••••"}</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setUnlockCredentials(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition"
                >
                  <Lock className="w-3 h-3" />
                  <span>Modificar o cambiar credenciales</span>
                </button>
              </div>
            </div>
          ) : (
            /* Editable Inputs (Only when explicitly unlocked or not yet configured) */
            <div className="space-y-3">
              {settings?.telegram_configured && (
                <div className="flex justify-between items-center text-xs pb-1">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5" /> Edición de credenciales habilitada
                  </span>
                  <button
                    type="button"
                    onClick={() => { setUnlockCredentials(false); setTelegramToken(''); setTelegramChatId(''); }}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Nuevo Bot Token</label>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[10px]"
                    >
                      {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showToken ? 'Ocultar' : 'Ver'}</span>
                    </button>
                  </div>
                  <input
                    type={showToken ? "text" : "password"}
                    placeholder={settings?.telegram_configured ? "Dejar vacío para conservar el actual" : "Ej: 7123456789:AAFlkjf98234..."}
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nuevo Chat ID</label>
                  <input
                    type="text"
                    placeholder={settings?.telegram_configured ? "Dejar vacío para conservar el actual" : "Ej: 123456789"}
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Automatic Dispatch Controls */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>⚡ Radar Cuantitativo Automático a Telegram</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                    Recomendado
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Despacha directamente a tu Telegram toda oportunidad que alcance alta confluencia técnica institucional (Oro XAUUSD, Cripto y Wall Street) sin necesidad de crear alertas manuales.
                </p>
              </div>
              <input
                type="checkbox"
                checked={telegramAuto}
                onChange={(e) => setTelegramAuto(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 accent-blue-500 cursor-pointer shrink-0"
              />
            </div>

            {telegramAuto && (
              <div className="pt-2 border-t border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <label className="text-slate-300 font-semibold">Filtro de Probabilidad:</label>
                <select
                  value={telegramMinScore}
                  onChange={(e) => setTelegramMinScore(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={70}>🛡️ Alta Confluencia (≥ 70 pts) - Mayor Seguridad & Filtro de Ruido (Recomendado)</option>
                  <option value={80}>🎯 Máxima Precisión (≥ 80 pts) - Solo Setups A+ Excepcionales</option>
                  <option value={60}>⚡ Modo Activo (≥ 60 pts) - Mayor Frecuencia de Alertas</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={testingTelegram}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 hover:border-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${testingTelegram ? 'animate-bounce' : ''}`} />
              <span>{testingTelegram ? 'Enviando prueba...' : 'Probar Conexión con Telegram'}</span>
            </button>

            {telegramStatus && (
              <div className={`text-xs flex items-center gap-1.5 font-semibold ${telegramStatus.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {telegramStatus.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{telegramStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Configuraciones actualizadas con éxito</span>
            </div>
          ) : <div />}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
