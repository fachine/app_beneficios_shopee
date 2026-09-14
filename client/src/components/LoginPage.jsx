import React, { useState } from 'react';
import { Building2, LockKeyhole, LogIn, ShieldCheck, Sparkles, User } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('shopee');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin({ username, password, tenant });
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível entrar no sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.34),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.2),_transparent_38%)]" />
      <div className="relative w-full max-w-5xl grid lg:grid-cols-[1.15fr_0.85fr] bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-800 text-white min-h-[610px]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BenefíciosOps</h1>
              <p className="text-xs text-indigo-200">Gestão segura de benefícios e SLAs</p>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold bg-white/10 border border-white/15 rounded-full px-3 py-1.5 mb-5">
              <ShieldCheck className="w-4 h-4" /> Acesso por perfil
            </span>
            <h2 className="text-4xl font-bold leading-tight max-w-md">
              Cada equipe vê e faz somente o que precisa.
            </h2>
            <p className="mt-5 text-indigo-100/80 leading-relaxed max-w-md">
              Administração, SAC, RH e Gestão em um ambiente único, com permissões específicas e histórico de atendimento.
            </p>
          </div>

          <p className="text-xs text-indigo-200/70">Operação Shopee SP · Ambiente interno</p>
        </section>

        <section className="p-7 sm:p-12 flex flex-col justify-center min-h-[560px]">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-slate-900">BenefíciosOps</span>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-indigo-600 mb-2">Área restrita</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Acesse sua conta</h2>
            <p className="text-sm text-slate-500 mt-2">Use o usuário e a senha fornecidos pelo administrador.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Operação</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                  placeholder="Código da operação"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Usuário</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Senha</label>
              <div className="relative">
                <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Entrando...' : 'Entrar no sistema'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
