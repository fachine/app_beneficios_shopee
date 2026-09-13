import React, { useState } from 'react';
import { X, Key, Bot, ShieldCheck, CheckCircle2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

export default function SettingsModal({ onClose, settings, onStartTelegram, onStopTelegram, onSaveOpenRouter }) {
  const [tgToken, setTgToken] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [model, setModel] = useState(settings?.openrouter?.model || 'google/gemini-2.0-flash-001');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTelegramStart = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await onStartTelegram(tgToken);
      if (res.data?.success) {
        setFeedback({ type: 'success', message: 'Bot do Telegram iniciado e escutando mensagens!' });
      } else {
        setFeedback({ type: 'error', message: res.data?.message || 'Erro ao iniciar bot' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao conectar bot do Telegram' });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramStop = async () => {
    setLoading(true);
    try {
      await onStopTelegram();
      setFeedback({ type: 'info', message: 'Polling do Telegram pausado.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpenRouter = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSaveOpenRouter({ apiKey: openRouterKey, model });
      setFeedback({ type: 'success', message: 'Chave e Modelo OpenRouter configurados com sucesso!' });
      setOpenRouterKey('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao salvar chave da OpenRouter' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">Configurações de Conexão</h3>
              <p className="text-xs text-slate-500">Telegram Bot Token & OpenRouter API Key</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Seção 1: Telegram Bot */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-sky-600" />
                <h4 className="text-sm font-bold text-slate-800">Bot do Telegram</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                settings?.telegram?.isPolling 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-200 text-slate-600 border-slate-300'
              }`}>
                {settings?.telegram?.isPolling ? '● Ativo (Polling)' : '○ Parado'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Insira o token do seu bot criado no <code>@BotFather</code> para receber as mensagens enviadas pelos colaboradores diretamente no Telegram.
            </p>

            <div className="space-y-2">
              <input
                type="password"
                placeholder={settings?.telegram?.configured ? "Token já cadastrado (digite novo para alterar)" : "Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"}
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTelegramStart}
                  disabled={loading || (!tgToken && !settings?.telegram?.configured)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  {settings?.telegram?.isPolling ? 'Reiniciar Bot' : 'Conectar Bot'}
                </button>

                {settings?.telegram?.isPolling && (
                  <button
                    type="button"
                    onClick={handleTelegramStop}
                    disabled={loading}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: OpenRouter API */}
          <form onSubmit={handleSaveOpenRouter} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                <h4 className="text-sm font-bold text-slate-800">OpenRouter (IA de Triagem)</h4>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                settings?.openrouter?.configured 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {settings?.openrouter?.configured ? '● Chave Configurada' : '○ Fallback Local Ativo'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              A chave da OpenRouter é usada para processar o texto livre dos funcionários e categorizar automaticamente em Posto, Matrícula, VR/VT e Prioridade.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chave de API OpenRouter</label>
                <input
                  type="password"
                  placeholder={settings?.openrouter?.configured ? "Chave já configurada (digite para alterar)" : "sk-or-v1-..."}
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Modelo de IA</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash (Muito Rápido e Barato)</option>
                  <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
                  <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                  <option value="meta-llama/llama-3.3-70b-instruct">Meta Llama 3.3 70B</option>
                  <option value="deepseek/deepseek-chat">DeepSeek Chat V3</option>
                </select>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || (!openRouterKey && model === settings?.openrouter?.model)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  Salvar Configurações de IA
                </button>
              </div>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
