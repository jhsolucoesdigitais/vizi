import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { Business } from '../types';
import { Condominio } from '../types';

// ─────────────────────────────────────────────
//  BusinessPortal — Login e primeiro acesso do lojista
// ─────────────────────────────────────────────

interface BusinessPortalProps {
  onLoginSuccess: (biz: Business) => void;
  onBack: () => void;
  currentCondo: Condominio | null;
}

const BusinessPortal = ({ onLoginSuccess, onBack, currentCondo }: BusinessPortalProps) => {
  const [step, setStep] = useState<'login' | 'change-pass'>('login');
  const [tempBusiness, setTempBusiness] = useState<Business | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Processa o resultado de get_business_login_status, comum ao login manual
  // e à restauração silenciosa de sessão já autenticada.
  const handleLoginStatus = async (result: any, { silent }: { silent: boolean }) => {
    if (result.status === 'erro') {
      await supabase.auth.signOut();
      if (!silent) Swal.fire('Acesso Negado', result.mensagem, 'error');
      return false;
    }

    if (result.status === 'bloqueado') {
      await supabase.auth.signOut();
      if (!silent) Swal.fire({ title: 'Acesso Suspenso', text: result.mensagem, icon: 'error', confirmButtonColor: '#ef4444' });
      return false;
    }

    if (result.status === 'vencido') {
      await supabase.auth.signOut();
      if (!silent) Swal.fire({ title: 'Plano Expirado', text: result.mensagem, icon: 'warning', confirmButtonColor: '#f59e0b' });
      return false;
    }

    if (result.status === 'liberado') {
      const { data: safeBusiness, error: fetchError } = await supabase
        .from('empresas')
        .select('id, slug, name, category, subCategory, rating, image, bannerUrl, businessHours, status, loyalty, pagamento, social, reviews, condominioId, email, licenseStatus, tipoPlano, description, dataVencimento, infinitepay_handle')
        .eq('id', result.businessId)
        .single();

      if (fetchError || !safeBusiness) {
        if (!silent) { await supabase.auth.signOut(); Swal.fire('Erro', 'Falha ao carregar perfil seguro.', 'error'); }
        return false;
      }

      if (result.mustChangePassword) {
        setTempBusiness(safeBusiness as Business);
        setStep('change-pass');
      } else {
        onLoginSuccess(safeBusiness as Business);
      }
      return true;
    }

    return false;
  };

  // ── Restaura sessão já autenticada (refresh de página / reabrir o link) ──
  // Evita pedir login de novo quando o lojista já tem uma sessão válida do
  // Supabase Auth — getSession() tenta renovar via refresh token sozinho.
  useEffect(() => {
    const restoreSession = async () => {
      if (!currentCondo) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCheckingSession(false); return; }

      const { data: result, error } = await supabase.rpc('get_business_login_status', {
        input_condominio: currentCondo.id
      });

      if (error || !result) { setCheckingSession(false); return; }
      await handleLoginStatus(result, { silent: true });
      setCheckingSession(false);
    };
    restoreSession();
  }, [currentCondo]);

  // ── 1. Login ─────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCondo) return;

    const fd = new FormData(e.target as HTMLFormElement);
    const email = fd.get('email') as string;
    const pass  = fd.get('password') as string;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (signInError) {
      Swal.fire('Acesso Negado', 'Email ou senha incorretos.', 'error');
      return;
    }

    // Verifica status da loja (bloqueio, vencimento) já autenticado
    const { data: result, error } = await supabase.rpc('get_business_login_status', {
      input_condominio: currentCondo.id
    });

    if (error || !result) {
      await supabase.auth.signOut();
      Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
      return;
    }

    await handleLoginStatus(result, { silent: false });
  };

  // ── 2. Primeiro acesso — troca de senha ──────
  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempBusiness) return;

    const fd = new FormData(e.target as HTMLFormElement);
    const newPass     = fd.get('newPass') as string;
    const confirmPass = fd.get('confirmPass') as string;

    if (newPass.length < 6)      return Swal.fire('Erro', 'A senha deve ter no mínimo 6 caracteres', 'warning');
    if (newPass !== confirmPass)  return Swal.fire('Erro', 'As senhas não coincidem', 'warning');

    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    if (updateError) {
      Swal.fire('Erro', 'Não foi possível alterar a senha.', 'error');
      return;
    }

    const { error: flagError } = await supabase
      .from('empresas')
      .update({ mustChangePassword: false })
      .eq('id', tempBusiness.id);

    if (flagError) {
      Swal.fire('Erro', 'Senha alterada, mas houve falha ao atualizar o cadastro.', 'error');
      return;
    }

    Swal.fire('Sucesso!', 'Senha alterada. Você já está logado.', 'success');
    onLoginSuccess(tempBusiness);
  };

  // ── Tela: verificando sessão existente ──────
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // ── Tela: primeiro acesso ────────────────────
  if (step === 'change-pass') {
    return (
      <div className="min-h-screen bg-amber-500 flex items-center justify-center p-4">
        <form onSubmit={handleChangePass} className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-xl">
          <h2 className="text-xl font-black uppercase mb-2 text-center text-amber-600">Criar Nova Senha</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            É seu primeiro acesso. Defina uma senha segura para sua loja.
          </p>

          <input name="newPass"     type="password" placeholder="Nova Senha"       required className="w-full border p-3 rounded-xl mb-3" />
          <input name="confirmPass" type="password" placeholder="Confirmar Senha"  required className="w-full border p-3 rounded-xl mb-6" />

          <button className="w-full bg-amber-600 text-white p-3 rounded-xl font-bold uppercase">
            Salvar e Entrar
          </button>
        </form>
      </div>
    );
  }

  // ── Tela: login ──────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] relative flex items-center justify-center p-6 overflow-hidden">

      {/* Efeitos de luz de fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Badge do condomínio */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full backdrop-blur-md">
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">
              Portal {currentCondo ? currentCondo.name : '...'}
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-10 rounded-[40px] shadow-2xl scale-in-center">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">Acesso Lojista</h2>
            <div className="h-1 w-12 bg-blue-600 mx-auto mt-2 rounded-full" />
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Email Corporativo</label>
              <input
                name="email"
                type="email"
                placeholder="loja@exemplo.com"
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Senha de Acesso</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white/10 transition-all font-bold"
              />
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-950/50 active:scale-95 transition-all mt-4">
              Entrar no Painel
            </button>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="w-full mt-8 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            ← Voltar para o App
          </button>
        </form>

        <p className="text-center mt-8 text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          Vizi Business System v2.0
        </p>
      </div>
    </div>
  );
};

export default BusinessPortal;