import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { dbInstance } from "../../db";
import { Business, Condominio } from '../types';
import { Search, Plus, Building, Store, ArrowLeft, Link as LinkIcon, Edit, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────
//  SuperAdminPanel — Gestão master multi-condomínio
// ─────────────────────────────────────────────

interface SuperAdminPanelProps {
  onBack: () => void;
}

// supabase-js só preenche `data` em respostas 2xx; em erro (ex: 409), a mensagem
// que a Edge Function mandou só existe dentro de `error.context` (a Response crua).
async function getFunctionErrorMessage(result: any, error: any, fallback: string): Promise<string> {
  if (result?.error) return result.error;
  const ctx = error?.context;
  if (ctx?.json) {
    try {
      const body = await ctx.json();
      if (body?.error) return body.error;
    } catch { /* mantém o fallback */ }
  }
  return error?.message || fallback;
}

const SuperAdminPanel = ({ onBack }: SuperAdminPanelProps) => {
  // ── Estados Globais ───────────────────────────
  const [isLogged,       setIsLogged]       = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  
  // ── Navegação e Busca ─────────────────────────
  const [viewMode,       setViewMode]       = useState<'condos' | 'stores'>('condos');
  const [searchCondo,    setSearchCondo]    = useState('');
  const [searchStore,    setSearchStore]    = useState('');

  // ── Dados ─────────────────────────────────────
  const [condominios,    setCondominios]    = useState<Condominio[]>([]);
  const [selectedCondo,  setSelectedCondo]  = useState<Condominio | null>(null);
  const [condoStores,    setCondoStores]    = useState<Business[]>([]);

  // ── Modais ────────────────────────────────────
  const [isCondoModalOpen, setIsCondoModalOpen] = useState(false);
  const [editingCondo,     setEditingCondo]     = useState<Condominio | null>(null);
  
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore,     setEditingStore]     = useState<Business | null>(null);

  // ── Efeitos ──────────────────────────────────
  useEffect(() => {
    if (selectedCondo && viewMode === 'stores') {
      loadStores(selectedCondo.id);
    }
  }, [selectedCondo, viewMode]);

  // Restaura sessão já autenticada (refresh de página)
  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: isAuthorized } = await supabase.rpc('is_master_admin');
      if (isAuthorized) {
        setIsLogged(true);
        loadCondos();
      } else {
        await supabase.auth.signOut();
      }
    };
    restoreSession();
  }, []);

  // ── Autenticação master ───────────────────────
  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd    = new FormData(e.target as HTMLFormElement);
    const email = fd.get('email') as string;
    const pass  = fd.get('password') as string;
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pass });

      if (signInError) {
        Swal.fire('Acesso Negado', 'Email ou senha incorretos.', 'error');
        return;
      }

      const { data: isAuthorized, error: authCheckError } = await supabase.rpc('is_master_admin');
      if (authCheckError || !isAuthorized) {
        await supabase.auth.signOut();
        Swal.fire('Acesso Negado', 'Este usuário não tem permissão de administrador master.', 'error');
        return;
      }

      setIsLogged(true);
      loadCondos();
    } catch (err) {
      console.error('Erro na autenticação master:', err);
      Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────
  const handleMasterLogout = async () => {
    await supabase.auth.signOut();
    setIsLogged(false);
  };

  // ── Loaders ───────────────────────────────────
  const loadCondos = async () => {
    const { data, error } = await supabase.from('condominios').select('id, name, slug, address');
    if (!error) setCondominios(data || []);
  };

  const loadStores = async (condoId: string) => {
    // Adicionamos dataVencimento na busca
    const { data, error } = await supabase
      .from('empresas')
      .select('id, name, category, status, condominioId, email, licenseStatus, tipoPlano, dataVencimento, auth_user_id')
      .eq('condominioId', condoId);
    if (!error) setCondoStores(data || []);
  };

  // ── Handlers Condomínio ───────────────────────
  const handleSaveCondo = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const aptsArray = (fd.get('apts') as string).split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));

    const condoData: Condominio = {
      id: editingCondo ? editingCondo.id : crypto.randomUUID(),
      slug: (fd.get('slug') as string).toLowerCase().replace(/\s+/g, '-'),
      name: fd.get('name') as string,
      address: fd.get('address') as string,
      settings: {
        type:               fd.get('type') as any,
        namingType:         fd.get('namingType') as any,
        quantity:           parseInt(fd.get('quantity') as string),
        floors:             parseInt(fd.get('floors') as string),
        apartmentsPerFloor: aptsArray,
      },
    };

    await dbInstance.put('condominios', condoData);
    Swal.fire('Sucesso', `Condomínio ${editingCondo ? 'atualizado' : 'criado'}!`, 'success');
    setIsCondoModalOpen(false);
    loadCondos();
  };

  // ── Handlers Loja ─────────────────────────────
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCondo) return;
    const fd = new FormData(e.target as HTMLFormElement);

    if (editingStore) {
      // Atualizar Loja
      const newEmail = fd.get('email') as string;
      const emailChanged = newEmail !== editingStore.email;

      const tipoPlano      = fd.get('tipoPlano') as string;
      const licenseStatus  = fd.get('licenseStatus') as string;
      const dataVencimento = (fd.get('dataVencimento') as string) || null;

      const updated = {
        ...editingStore,
        name:          fd.get('name') as string,
        email:         newEmail,
        category:      fd.get('category') as any,
        tipoPlano,
        licenseStatus,
        dataVencimento,
      };

      // Campos operacionais: o próprio lojista também pode editar essas colunas.
      await supabase
        .from('empresas')
        .update({ name: updated.name, email: newEmail, category: updated.category })
        .eq('id', editingStore.id);

      // Cobrança/licença: só o master admin pode mexer — via RPC dedicada.
      await supabase.rpc('admin_update_business_billing', {
        input_business_id: editingStore.id,
        input_license_status: licenseStatus,
        input_data_vencimento: dataVencimento,
        input_tipo_plano: tipoPlano,
      });

      // Se o email de login mudou, atualiza também a conta de acesso (Auth)
      if (emailChanged) {
        const { data: sessionData } = await supabase.auth.getSession();
        await supabase.functions.invoke('business-auth-admin', {
          body: { action: 'update_email', businessId: editingStore.id, email: newEmail },
          headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        });
      }

      Swal.fire('Atualizado!', 'Dados da loja salvos.', 'success');
    } else {
      // Criar Loja
      const businessId = crypto.randomUUID();
      const email       = fd.get('email') as string;
      const tempPass    = fd.get('tempPass') as string;

      const newStore: Business = {
        id:           businessId,
        condominioId: selectedCondo.id,
        name:         fd.get('name') as string,
        category:     fd.get('category') as any,
        tipoPlano:    fd.get('tipoPlano') as string,
        subCategory:  'Geral',
        rating:       5.0,
        image:        'https://placehold.co/300',
        bannerUrl:    'https://placehold.co/800x300',
        businessHours: null,
        status:       { aberto: false },
        loyalty:      { ativo: false, metaPontos: 10, tipoRecompensa: 'valor_fixo', valorRecompensa: 0, tipoPontuacao: 'por_valor' },
        pagamento:    { chavePix: '', metodosAceitos: ['Dinheiro'] },
        social:       {},
        email,
        licenseStatus: 'active',
        dataVencimento: fd.get('dataVencimento') as string || null,
      };
      // INSERT puro (não upsert): um upsert vira "INSERT ... ON CONFLICT DO UPDATE" no Postgres,
      // que exige privilégio de UPDATE em todas as colunas do SET mesmo sem conflito real — e
      // colunas de billing (email, licenseStatus, dataVencimento) só podem ser alteradas via
      // a RPC admin_update_business_billing, nunca por UPDATE direto na tabela.
      const { error: insertError } = await supabase.from('empresas').insert(newStore);
      if (insertError) {
        Swal.fire('Erro ao criar loja', insertError.message, 'error');
        return;
      }

      // Cria a conta de acesso (Supabase Auth) da loja via Edge Function privilegiada
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: authResult, error: authError } = await supabase.functions.invoke('business-auth-admin', {
        body: { action: 'create', businessId, email, password: tempPass },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      if (authError || authResult?.error) {
        const message = await getFunctionErrorMessage(authResult, authError, 'Tente novamente pela edição da loja.');
        Swal.fire('Loja criada, mas houve falha ao gerar o acesso', message, 'warning');
      } else {
        Swal.fire('Loja Criada!', `Login: ${email}\nSenha temporária: ${tempPass}`, 'success');
      }
    }

    setIsStoreModalOpen(false);
    loadStores(selectedCondo.id);
  };

  // ── Gerar acesso (loja sem conta) ou resetar senha (loja já com conta) ──
  const handleGenerateBusinessAccess = async (store: Business) => {
    if (!store.email) {
      Swal.fire('Erro', 'Esta loja não tem email cadastrado.', 'error');
      return;
    }

    const hasAccount = !!store.auth_user_id;

    const { value: tempPass } = await Swal.fire({
      title: hasAccount ? 'Resetar senha' : 'Gerar acesso',
      input: 'text',
      inputLabel: `Senha temporária para ${store.email}`,
      inputPlaceholder: 'Digite a senha temporária',
      showCancelButton: true,
      confirmButtonText: hasAccount ? 'Resetar' : 'Gerar',
    });
    if (!tempPass) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const { data: authResult, error: authError } = await supabase.functions.invoke('business-auth-admin', {
      body: hasAccount
        ? { action: 'reset_password', businessId: store.id, password: tempPass }
        : { action: 'create', businessId: store.id, email: store.email, password: tempPass },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
    });

    if (authError || authResult?.error) {
      const message = await getFunctionErrorMessage(authResult, authError, 'Falha ao processar.');
      Swal.fire('Erro', message, 'error');
    } else {
      Swal.fire(
        hasAccount ? 'Senha redefinida!' : 'Acesso gerado!',
        `Login: ${store.email}\nSenha temporária: ${tempPass}`,
        'success'
      );
    }
  };

  // ── Utilitários ───────────────────────────────
  const copyLink = (type: 'morador' | 'lojista', slug: string) => {
    const url = type === 'morador' 
      ? `${window.location.origin}/?c=${slug}` 
      : `${window.location.origin}/?c=${slug}&portal=business`;
    navigator.clipboard.writeText(url);
    Swal.fire({ toast: true, position: 'top-end', title: 'Link copiado!', showConfirmButton: false, timer: 1500, icon: 'success' });
  };

  // Filtros de busca
  const filteredCondos = condominios.filter(c => c.name.toLowerCase().includes(searchCondo.toLowerCase()) || c.slug.toLowerCase().includes(searchCondo.toLowerCase()));
  const filteredStores = condoStores.filter(s => s.name.toLowerCase().includes(searchStore.toLowerCase()) || s.email?.toLowerCase().includes(searchStore.toLowerCase()));


  // ─────────────────────────────────────────────
  //  TELA 1: LOGIN
  // ─────────────────────────────────────────────
  if (!isLogged) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={handleMasterLogin} className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl">🔐</div>
        </div>
        <h2 className="text-xl font-black uppercase mb-1 text-center text-slate-800">Acesso Master</h2>
        <input name="email" type="email" placeholder="Email" required disabled={isLoading} autoComplete="username" className="w-full border-2 border-slate-100 p-4 rounded-xl mb-3 focus:border-slate-900 outline-none transition-all font-bold text-center mt-6" />
        <input name="password" type="password" placeholder="Digite a senha mestra" required disabled={isLoading} autoComplete="current-password" className="w-full border-2 border-slate-100 p-4 rounded-xl mb-4 focus:border-slate-900 outline-none transition-all font-bold text-center" />
        <button disabled={isLoading} className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all">Entrar no Sistema</button>
        <button type="button" onClick={onBack} className="w-full mt-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Voltar ao App</button>
      </form>
    </div>
  );

  // ─────────────────────────────────────────────
  //  TELA 2: PAINEL PRINCIPAL
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-20 font-sans">

      {/* ── MODAL CONDOMÍNIO ── */}
      {isCondoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveCondo} className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-lg flex items-center gap-2"><Building size={20}/> {editingCondo ? 'Editar Condomínio' : 'Novo Condomínio'}</h3>
              <button type="button" onClick={() => setIsCondoModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            
            <div className="space-y-4">
              <input name="name" required defaultValue={editingCondo?.name} placeholder="Nome do Condomínio (Ex: Residencial Flores)" className="w-full border p-4 rounded-xl font-bold bg-slate-50" />
              <div className="flex gap-2">
                <input name="slug" required defaultValue={editingCondo?.slug} placeholder="slug-url" className="flex-1 border p-4 rounded-xl lowercase bg-slate-50" />
                <input name="address" required defaultValue={editingCondo?.address} placeholder="Endereço Completo" className="flex-[2] border p-4 rounded-xl bg-slate-50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="type" defaultValue={editingCondo?.settings.type} className="border p-4 rounded-xl font-bold bg-white"><option value="bloco">Blocos</option><option value="torre">Torres</option></select>
                <select name="namingType" defaultValue={editingCondo?.settings.namingType || 'letter'} className="border p-4 rounded-xl font-bold bg-white"><option value="letter">Letras (A, B...)</option><option value="number">Números (1, 2...)</option></select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="quantity" type="number" defaultValue={editingCondo?.settings.quantity} placeholder="Qtd Blocos/Torres" className="border p-4 rounded-xl bg-slate-50" />
                <input name="floors" type="number" defaultValue={editingCondo?.settings.floors} placeholder="Andares" className="border p-4 rounded-xl bg-slate-50" />
              </div>
              <input name="apts" defaultValue={editingCondo?.settings.apartmentsPerFloor.join(', ')} placeholder="Finais dos Apts (ex: 1, 2, 3, 4)" className="w-full border p-4 rounded-xl bg-slate-50" />
            </div>
            
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase mt-6 shadow-lg shadow-emerald-600/20 transition-all">
              {editingCondo ? 'Salvar Alterações' : 'Cadastrar Condomínio'}
            </button>
          </form>
        </div>
      )}

      {/* ── MODAL EMPRESA / LOJA ── */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveStore} className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black uppercase text-lg flex items-center gap-2"><Store size={20}/> {editingStore ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button type="button" onClick={() => setIsStoreModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Loja</label>
                  <input name="name" required defaultValue={editingStore?.name} className="w-full border p-3 rounded-xl font-bold bg-slate-50" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Categoria</label>
                  <select name="category" defaultValue={editingStore?.category} className="w-full border p-3 rounded-xl font-bold bg-white">
                    <option value="food">🛍️ Delivery/Loja</option>
                    <option value="service">🛠️ Serviço</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Plano</label>
                  <select name="tipoPlano" defaultValue={editingStore?.tipoPlano} className="w-full border p-3 rounded-xl font-bold bg-white">
                    <option value="empreendedor">🚀 Empreendedor</option>
                    <option value="vitrine">🖼️ Vitrine</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Acesso e Faturamento</h4>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email (Login)</label>
                  <input name="email" type="email" required defaultValue={editingStore?.email} className="w-full border p-3 rounded-xl font-bold bg-white" />
                </div>
                {!editingStore && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Senha Inicial</label>
                    <input name="tempPass" required placeholder="Senha Temporária" className="w-full border p-3 rounded-xl font-bold bg-white" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Vencimento</label>
                    {/* 👇 NOVO CAMPO DE DATA DE VENCIMENTO */}
                    <input name="dataVencimento" type="date" defaultValue={editingStore?.dataVencimento || ''} className="w-full border p-3 rounded-xl font-bold bg-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Status Licença</label>
                    <select name="licenseStatus" defaultValue={editingStore?.licenseStatus || 'active'} className="w-full border p-3 rounded-xl font-bold bg-white">
                      <option value="active">✅ Ativo</option>
                      <option value="late">⚠️ Atrasado</option>
                      <option value="blocked">⛔ Bloqueado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <button className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase mt-6 shadow-lg transition-all">
              {editingStore ? 'Salvar Alterações' : 'Criar Empresa'}
            </button>
          </form>
        </div>
      )}

      {/* ── HEADER PRINCIPAL ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-slate-800">VIZI <span className="text-blue-600">MASTER</span></h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão Global do Sistema</p>
        </div>
        <button onClick={handleMasterLogout} className="bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 px-6 py-3 rounded-xl text-xs font-black uppercase transition-colors">
          Encerrar Sessão
        </button>
      </header>

      {/* ── CONTEÚDO DINÂMICO (DRILL-DOWN) ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* VIEW 1: LISTA DE CONDOMÍNIOS */}
        {viewMode === 'condos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar Condos */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar condomínio por nome ou slug..." 
                  value={searchCondo}
                  onChange={(e) => setSearchCondo(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <button 
                onClick={() => { setEditingCondo(null); setIsCondoModalOpen(true); }}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-black transition-all shadow-lg shadow-slate-900/20"
              >
                <Plus size={16} /> Novo Condomínio
              </button>
            </div>

            {/* Tabela Condos */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Condomínio</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 hidden md:table-cell">Endereço</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 hidden sm:table-cell">Links Úteis</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCondos.length > 0 ? filteredCondos.map(condo => (
                    <tr key={condo.id} className="hover:bg-slate-50/80 transition-colors group border-b border-slate-50 last:border-0">
                      <td className="p-4">
                        <p className="font-black text-slate-800 text-sm">{condo.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">/{condo.slug}</p>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-xs text-slate-500 font-medium truncate max-w-xs">{condo.address}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => copyLink('morador', condo.slug)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Link Morador"><LinkIcon size={14}/></button>
                          <button onClick={() => copyLink('lojista', condo.slug)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Link Lojista"><Store size={14}/></button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingCondo(condo); setIsCondoModalOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-all" title="Editar">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => { setSelectedCondo(condo); setViewMode('stores'); setSearchStore(''); }}
                            className="flex items-center gap-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                          >
                            Ver Lojas <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="p-10 text-center text-slate-400 text-sm font-bold">Nenhum condomínio encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: LISTA DE LOJAS DO CONDOMÍNIO */}
        {viewMode === 'stores' && selectedCondo && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            {/* Toolbar Stores */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setViewMode('condos')} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm">
                  <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-800 flex items-center gap-2">
                    Lojas <span className="text-slate-300">/</span> <span className="text-blue-600">{selectedCondo.name}</span>
                  </h2>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar loja ou email..." 
                    value={searchStore}
                    onChange={(e) => setSearchStore(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <button 
                  onClick={() => { setEditingStore(null); setIsStoreModalOpen(true); }}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                >
                  <Plus size={16} /> Nova Empresa
                </button>
              </div>
            </div>

            {/* Tabela Stores */}
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 w-12 text-center border-b border-slate-100">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Empresa / Email</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 hidden sm:table-cell">Plano</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 hidden md:table-cell">Vencimento</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.length > 0 ? filteredStores.map(store => {
                    const isVencido = store.dataVencimento && new Date(store.dataVencimento).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                    
                    return (
                    <tr key={store.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                      <td className="p-4 text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto shadow-sm ${
                          store.licenseStatus === 'blocked' ? 'bg-red-500' :
                          isVencido ? 'bg-orange-500' :
                          store.licenseStatus === 'late' ? 'bg-amber-400' : 'bg-emerald-500'
                        }`} title={store.licenseStatus} />
                      </td>
                      <td className="p-4">
                        <p className="font-black text-slate-800 text-sm">{store.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{store.email}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${
                          store.tipoPlano === 'vitrine' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {store.tipoPlano || 'empreendedor'}
                        </span>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        {store.dataVencimento ? (
                           <span className={`text-xs font-bold ${isVencido ? 'text-red-500' : 'text-slate-500'}`}>
                             {new Date(store.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                           </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Vitalício / Sem data</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleGenerateBusinessAccess(store)}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-black uppercase text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                          >
                            🔑 {store.auth_user_id ? 'Resetar Senha' : 'Gerar Acesso'}
                          </button>
                          <button
                            onClick={() => { setEditingStore(store); setIsStoreModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                          >
                            <Edit size={12} /> Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  }) : (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-400 text-sm font-bold">Nenhuma loja cadastrada neste condomínio.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default SuperAdminPanel;