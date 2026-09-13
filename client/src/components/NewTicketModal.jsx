import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, CheckCircle, AlertCircle, Bot, Building2 } from 'lucide-react';
import { getHubs } from '../services/api';

export default function NewTicketModal({ onClose, onCreateTicket, onTestAI }) {
  const [mode, setMode] = useState('ia'); // 'ia' ou 'manual'
  const [rawText, setRawText] = useState('');
  
  // Lista de Hubs para o select
  const [hubsList, setHubsList] = useState([]);

  // Campos manuais
  const [employeeName, setEmployeeName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [benefitType, setBenefitType] = useState('VR');
  const [priority, setPriority] = useState('MEDIA');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  useEffect(() => {
    getHubs().then(res => {
      if (Array.isArray(res.data)) {
        setHubsList(res.data);
      }
    }).catch(console.error);
  }, []);

  // Testa a extração da IA com o texto digitado
  const handleTestAI = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await onTestAI(rawText);
      setAiPreview(res);
      if (res) {
        setEmployeeName(res.employeeName !== 'Não informado' ? res.employeeName : '');
        setEmployeeId(res.employeeId !== 'Não informada' ? res.employeeId : '');
        setSelectedHub(res.workplace !== 'Não informado' ? res.workplace : '');
        setBenefitType(res.benefitType || 'VR');
        setPriority(res.priority || 'MEDIA');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const hubObj = hubsList.find(h => h.name === selectedHub || h.code === selectedHub);

    if (mode === 'ia') {
      await onCreateTicket({
        rawText,
        employeeName: employeeName || undefined,
        employeeId: employeeId || undefined,
        workplace: hubObj ? hubObj.name : selectedHub || undefined,
        workplaceCode: hubObj ? hubObj.code : undefined,
        workplaceRegion: hubObj ? hubObj.region : undefined,
        benefitType,
        priority
      });
    } else {
      await onCreateTicket({
        employeeName,
        employeeId,
        workplace: hubObj ? hubObj.name : selectedHub,
        workplaceCode: hubObj ? hubObj.code : undefined,
        workplaceRegion: hubObj ? hubObj.region : undefined,
        benefitType,
        priority,
        rawText: `Abertura manual de ${benefitType} para ${employeeName} (${selectedHub})`
      });
    }

    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Novo Chamado de Benefício Shopee</h3>
              <p className="text-xs text-slate-500">Integrado à lista oficial de postos (Postos_Shopee_HUB_SP)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternador de Modo */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('ia')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
              mode === 'ia'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✨ Simulação Telegram / Triagem com IA
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
              mode === 'manual'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            ✍️ Formulário Manual
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {mode === 'ia' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mensagem simulada do colaborador (Telegram)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ex: Oi, sou a Aline Rocha, matrícula 44810 do hub LM Hub_SP_Artur Alvim. Estou com problema no convênio de saúde e meu VR veio zerado."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={!rawText.trim() || isProcessing}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extrair com IA (OpenRouter)</span>
                </button>
              </div>

              {aiPreview && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5">
                  <span className="font-bold text-indigo-900 block">Resultado da Extração IA:</span>
                  <p><span className="font-semibold text-slate-700">Colaborador:</span> {aiPreview.employeeName} (Matrícula: {aiPreview.employeeId})</p>
                  <p><span className="font-semibold text-slate-700">HUB Detectado:</span> {aiPreview.workplace} {aiPreview.workplaceCode && `(${aiPreview.workplaceCode})`}</p>
                  <p><span className="font-semibold text-slate-700">Assunto:</span> {aiPreview.benefitType} | Prioridade: {aiPreview.priority}</p>
                  <p><span className="font-semibold text-slate-700">Resumo:</span> {aiPreview.summary}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* Campos complementares / manuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required={mode === 'manual'}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Matrícula</label>
              <input
                type="text"
                placeholder="Ex: 88201"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required={mode === 'manual'}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Posto de Trabalho / HUB Shopee SP (72 HUBs cadastrados)
              </label>
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                required={mode === 'manual'}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione o HUB da lista...</option>
                {hubsList.map(h => (
                  <option key={h.code} value={h.name}>
                    {h.name} ({h.code} - {h.city || h.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assunto / Benefício</label>
              <select
                value={benefitType}
                onChange={(e) => setBenefitType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="VR">🍔 Vale Refeição / Alimentação (VR)</option>
                <option value="VT">🚌 Vale Transporte (VT)</option>
                <option value="SAUDE">🏥 Plano de Saúde / Odonto</option>
                <option value="UNIFORME">👕 Uniforme / EPI</option>
                <option value="MULTIPLOS">⚡ Múltiplos Assuntos</option>
                <option value="OUTRO">📋 Outro Assunto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BAIXA">Baixa (SLA 48h)</option>
                <option value="MEDIA">Média (SLA 24h)</option>
                <option value="ALTA">Alta (SLA 12h)</option>
                <option value="CRITICA">Crítica (SLA 6h - Sem alimentação/transporte)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Cadastrar no Kanban</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
