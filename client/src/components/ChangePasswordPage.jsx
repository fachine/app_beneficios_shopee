import React, { useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage({ user, onChangePassword, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('A nova senha deve ter pelo menos 8 caracteres.');
    if (newPassword !== confirmPassword) return setError('A confirmação não corresponde à nova senha.');

    setLoading(true);
    try {
      await onChangePassword({ currentPassword, newPassword });
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-5">
      <section className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-6">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Crie sua nova senha</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Olá, {user.name}. Por segurança, altere a senha inicial antes de acessar o sistema.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-7">
          <PasswordField label="Senha inicial" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

          {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

          <button disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl cursor-pointer">
            <KeyRound className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
          <button type="button" onClick={onLogout} className="w-full text-xs text-slate-500 hover:text-slate-800 cursor-pointer">
            Voltar ao login
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
    </div>
  );
}
