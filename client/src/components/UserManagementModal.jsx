import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Shield, UserPlus, Users, X } from 'lucide-react';

const ROLE_LABELS = {
  ADMIN: 'Admin',
  SAC: 'SAC',
  RH: 'RH',
  GESTOR: 'Gestor'
};

export default function UserManagementModal({ onClose, onGetUsers, onCreateUser, onUpdateUser }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', role: 'SAC', password: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await onGetUsers();
      setUsers(response.data);
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Erro ao carregar usuários.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await onCreateUser(form);
      setForm({ name: '', username: '', role: 'SAC', password: '' });
      setFeedback({ type: 'success', text: 'Usuário criado. A senha deverá ser alterada no primeiro acesso.' });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Erro ao criar usuário.' });
    }
  };

  const updateRole = async (user, role) => {
    await onUpdateUser(user.id, { role });
    await loadUsers();
  };

  const toggleActive = async (user) => {
    try {
      await onUpdateUser(user.id, { active: !user.active });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Erro ao alterar o acesso.' });
    }
  };

  const resetPassword = async (user) => {
    const password = window.prompt(`Digite uma senha temporária para ${user.name} (mínimo de 8 caracteres):`);
    if (!password) return;
    try {
      await onUpdateUser(user.id, { password });
      setFeedback({ type: 'success', text: `Senha de ${user.name} redefinida. A troca será exigida no próximo acesso.` });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.error || 'Erro ao redefinir a senha.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100"><Users className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Usuários e permissões</h3>
              <p className="text-xs text-slate-500">Administre os acessos da operação selecionada</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-6 overflow-y-auto space-y-6">
          {feedback && (
            <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {feedback.text}
            </div>
          )}

          <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-4"><UserPlus className="w-4 h-4 text-indigo-600" /><h4 className="text-sm font-bold text-slate-800">Novo usuário</h4></div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500" required />
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Usuário" className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500" required />
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500">
                {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Senha temporária" minLength={8} className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div className="flex justify-end mt-3">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"><UserPlus className="w-4 h-4" /> Criar acesso</button>
            </div>
          </form>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800">Acessos cadastrados</h4>
              <span className="text-xs text-slate-500">{users.length} usuários</span>
            </div>
            {loading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Carregando usuários...</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr><th className="text-left px-4 py-3">Usuário</th><th className="text-left px-4 py-3">Perfil</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3"><p className="font-semibold text-slate-800">{user.name}</p><p className="text-xs text-slate-500">@{user.username}{user.mustChangePassword ? ' · troca de senha pendente' : ''}</p></td>
                        <td className="px-4 py-3">
                          <select value={user.role} onChange={(e) => updateRole(user, e.target.value)} className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg">
                            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{user.active ? 'Ativo' : 'Bloqueado'}</span></td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => resetPassword(user)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer" title="Redefinir senha"><KeyRound className="w-4 h-4" /></button><button onClick={() => toggleActive(user)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${user.active ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>{user.active ? 'Bloquear' : 'Ativar'}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <div key={role} className="p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="flex items-center gap-1.5 font-bold text-slate-700"><Shield className="w-3.5 h-3.5 text-indigo-500" />{label}</div><p className="text-slate-500 mt-1 leading-relaxed">{{ ADMIN: 'Acesso total', SAC: 'Atendimento de chamados', RH: 'Tratativas e indicadores', GESTOR: 'Consulta e indicadores' }[role]}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
