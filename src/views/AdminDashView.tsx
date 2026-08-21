import React, { useState, useEffect } from 'react';
import { Business, Product, Order, OrderStatus, BusinessHours, PaymentMethod } from '../types';
import { Condominio } from '../types';
import { ViewType, AdminTab, TimeFilter } from '../hooks/useAppState';
import { Stars, StatusBadge, PaymentStatusBadge, LoadingOverlay } from '../components/shared';
import { maskPhone, decryptData } from '../utils/crypto';
import { supabase } from "../../db";
import Swal from 'sweetalert2';
import DashboardAdminView from './DashboardAdminView';
import InstallBanner from '../components/InstallBanner';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

interface AdminDashViewProps {
  // Empresa
  adminBusiness:        Business;
  adminCondo:           Condominio | null;
  adminProducts:        Product[];
  isAdminRefreshing:    boolean;

  // Config da loja
  isStoreOpenConfig:    boolean;
  setIsStoreOpenConfig: (v: boolean) => void;
  businessHoursConfig:  BusinessHours | null;
  setBusinessHoursConfig: (fn: ((prev: BusinessHours | null) => BusinessHours | null) | BusinessHours | null) => void;
  isLoyaltyEnabled:     boolean;
  setIsLoyaltyEnabled:  (v: boolean) => void;
  loyaltyPointMode:     'por_valor' | 'por_item';
  setLoyaltyPointMode:  (v: 'por_valor' | 'por_item') => void;
  whatsappValue:        string;
  setWhatsappValue:     (v: string) => void;

  // Produto em edição
  editingProduct:       Partial<Product> | null;
  setEditingProduct:    (p: Partial<Product> | null) => void;
  productImageBase64:   string | null;
  adminLogoBase64:      string | null;
  adminBannerBase64:    string | null;
  isStockEnabled:       boolean;
  setIsStockEnabled:    (v: boolean) => void;
  adminFormRef:         React.RefObject<HTMLFormElement>;

  // Upload
  logoFile:             File | null;
  setLogoFile:          (f: File | null) => void;
  bannerFile:           File | null;
  setBannerFile:        (f: File | null) => void;

  // Pedidos
  adminOrders:          Order[];
  financeOrders:        Order[];
  loadingOrders:        boolean;
  adminOrderFilter:     OrderStatus | 'todos' | 'ativos';
  setAdminOrderFilter:  (f: OrderStatus | 'todos' | 'ativos') => void;
  adminOrderSearchTerm: string;
  setAdminOrderSearchTerm: (v: string) => void;
  adminOrderPage?:      number; 
  setAdminOrderPage?:   (page: number) => void;
  adminOrderStats?:     any; // Adapte para o tipo correto se tiver criado uma interface para stats

  // Financeiro
  adminDateStart:       string;
  setAdminDateStart:    (v: string) => void;
  adminDateEnd:         string;
  setAdminDateEnd:      (v: string) => void;
  finPage:              number;
  setFinPage:           (fn: ((p: number) => number) | number) => void;
  finLoading:           boolean;
  financeStatusFilter:  OrderStatus | 'todos';
  setFinanceStatusFilter: (v: OrderStatus | 'todos') => void;
  financePaymentFilter: 'pago' | 'pendente' | 'todos';
  setFinancePaymentFilter: (v: 'pago' | 'pendente' | 'todos') => void;
  activeTimeFilter:     TimeFilter;
  totalOrdersCount:     number;
  FIN_ITEMS_PER_PAGE:   number;
  reportData:           ReturnType<any>; 
  finSearched:          boolean;

  // Clientes
  adminClients:         any[];
  loadingClients:       boolean;
  hasSearchedClients:   boolean;
  clientPage:           number;
  totalClientsCount:    number;
  clientFilterBlock:    'todos' | 'A' | 'B' | 'C';
  setClientFilterBlock: (v: any) => void;
  clientFilterStatus:   'todos' | 'pendente' | 'em_dia' | 'com_cupom';
  setClientFilterStatus:(v: any) => void;
  expandedClientId:     string | null;
  setExpandedClientId:  (v: string | null) => void;
  ITEMS_PER_PAGE:       number;
  onEditClientPoints?: (userId: string, currentPoints: number) => void;
  clientFilterFloor:   string | 'todos';
  setClientFilterFloor: (v: string) => void;
  clientFilterUnit:    string | 'todos';
  setClientFilterUnit:  (v: string) => void;
  

  // Navegação e Loading
  activeAdminTab:       AdminTab;
  setActiveAdminTab:    (t: AdminTab) => void;
  setView:              (v: ViewType) => void;
  setIsGlobalLoading:   (v: boolean) => void;

  // Handlers Principais (UI)
  onUpdateStatus:                (orderId: string, newStatus: OrderStatus) => void;
  onUpdatePayment:               (orderId: string, paymentStatus: string) => void;
  onFinalizeOrder?:              (orderId: string) => void;
  onCategoryReorder?:            (newOrder: string[]) => void;
  onConfigSave?:                 (e: React.FormEvent<HTMLFormElement>) => void;
  
  // Handlers de Ação (Lógica)
  refreshAdminData:              () => void;
  handleAdminUpdateStatus:       (id: string, status: OrderStatus) => void;
  handleAdminUpdatePaymentStatus:(id: string, status: 'pago' | 'pendente') => void;
  handleAdminFinalizeOrder:      (id: string) => void;
  handleProductSave:             (e: React.FormEvent<HTMLFormElement>) => void;
  handleProductDelete:           (id: string) => void;
  handleProductToggleVisibility: (p: Product) => void;
  handleStartEdit:               (p: Product) => void;
  resetProductForm:              () => void;
  handleImageUpload:             (e: React.FormEvent<HTMLInputElement>, target: 'product' | 'logo' | 'banner') => void;
  uploadToStorage:               (file: File, folder: string) => Promise<string | null>;
  handleAdminDeleteReview:       (id: string) => void;
  handleFilterClients:           (page?: number) => void;
  handleFinancialSearch:         (reset?: boolean) => void;
  handleCategoryReorder?:        (newOrder: string[]) => void;
  handleEditClientPoints?: (userId: string, currentPoints: number) => void;
  
  // Utilitários e Estados Extras
  setTimeFilter:                 (t: TimeFilter) => void;
  adminCategories:               string[];
  filteredAdminOrders:           Order[];
  formatWhatsApp:                (v: string) => string;
  setAdminBusiness:              (b: Business | null) => void;
}

// ─────────────────────────────────────────────
//  Utilitário interno — parse reviews
// ─────────────────────────────────────────────

const parseReviews = (raw: any): any[] => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
  } catch { return []; }
};

// ─────────────────────────────────────────────
//  Componente
// ─────────────────────────────────────────────

export default function AdminDashView(props: AdminDashViewProps) {



// Estados para controlar o Menu Mobile, o Modal de Produtos e as Categorias expandidas
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false); // NOVO
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]); // NOVO
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);


  // Função para abrir/fechar as categorias
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };
  
  const {
    adminBusiness, adminCondo, adminProducts, isAdminRefreshing,
    isStoreOpenConfig, setIsStoreOpenConfig,
    businessHoursConfig, setBusinessHoursConfig,
    isLoyaltyEnabled, setIsLoyaltyEnabled,
    loyaltyPointMode, setLoyaltyPointMode,
    whatsappValue, setWhatsappValue,
    editingProduct, setEditingProduct,
    productImageBase64, adminLogoBase64, adminBannerBase64,
    isStockEnabled, setIsStockEnabled, adminFormRef,
    logoFile, setLogoFile, bannerFile, setBannerFile,
    adminOrders, financeOrders, loadingOrders,
    adminOrderFilter, setAdminOrderFilter,
    adminOrderSearchTerm, setAdminOrderSearchTerm,
    adminDateStart, setAdminDateStart, adminDateEnd, setAdminDateEnd,
    finPage, setFinPage, finLoading,
    financeStatusFilter, setFinanceStatusFilter,
    financePaymentFilter, setFinancePaymentFilter,
    activeTimeFilter, totalOrdersCount, FIN_ITEMS_PER_PAGE, reportData,
    adminClients, loadingClients, hasSearchedClients,
    clientPage, totalClientsCount, clientFilterBlock, setClientFilterBlock,
    clientFilterStatus, setClientFilterStatus,
    expandedClientId, setExpandedClientId, ITEMS_PER_PAGE,
    activeAdminTab, setActiveAdminTab, setView, setIsGlobalLoading,
    refreshAdminData,
    handleAdminUpdateStatus, handleAdminUpdatePaymentStatus, handleAdminFinalizeOrder,
    handleProductSave, handleProductDelete, handleProductToggleVisibility,
    handleStartEdit, resetProductForm, handleImageUpload, uploadToStorage,
    handleAdminDeleteReview, handleFilterClients, handleFinancialSearch,
    setTimeFilter, adminCategories, filteredAdminOrders, formatWhatsApp,
    setAdminBusiness,clientFilterFloor, setClientFilterFloor,
    clientFilterUnit, setClientFilterUnit,
  } = props;
  
 
  useEffect(() => {
    if (adminBusiness) {
 
      setIsLoyaltyEnabled(adminBusiness.loyalty?.ativo || false);
      setLoyaltyPointMode(adminBusiness.loyalty?.tipoPontuacao || 'por_valor');
      setIsStoreOpenConfig(adminBusiness.status?.aberto || false);
      setWhatsappValue(adminBusiness.social?.whatsapp || '');
      
      if (adminBusiness.businessHours) {
        setBusinessHoursConfig(adminBusiness.businessHours);
      }
    }
  }, [adminBusiness?.id]);  

  const pendingCount  = adminOrders.filter(o => o.status === 'pendente').length;
  const isVitrine     = adminBusiness.tipoPlano === 'vitrine';
  const isService     = adminBusiness.category === 'service';

  const TABS = [
    { id: 'dashboard',  label: 'Painel Geral' },
    { id: 'pedidos',    label: 'Pedidos'    },
    { id: 'cardapio',   label: 'Catálogo'   },
    { id: 'avaliacoes', label: 'Avaliações' },
    { id: 'clientes',   label: 'Clientes'   },
    { id: 'relatorio',  label: 'Financeiro' },
    { id: 'config',     label: 'Config'     },
  ] as const;

  const DAY_LABELS: Record<string, string> = {
    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
  };

 return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {isAdminRefreshing && <LoadingOverlay type="admin" />}

      {/* ── Overlay Mobile ──────────────────────── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar Lateral ──────────────────────── */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl md:shadow-none`}
      >
         {/* Logo / Header da Sidebar */}
         <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <img src={adminBusiness.image} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10 shadow-lg" alt="Logo" />
             <div className="overflow-hidden">
               <h1 className="text-sm font-black italic truncate">{adminBusiness.name}</h1>
               <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest mt-0.5">Painel Parceiro</p>
             </div>
           </div>
           <button className="md:hidden text-slate-400 hover:text-white transition-colors p-2" onClick={() => setIsMobileMenuOpen(false)}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
         </div>

         {/* Menu de Navegação */}
         <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
           <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4 ml-2">Menu Principal</p>
           {TABS.map(t => (
             <button
                key={t.id}
                onClick={() => { setActiveAdminTab(t.id as AdminTab); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeAdminTab === t.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'}`}
             >
                {t.label}
                {t.id === 'pedidos' && pendingCount > 0 && (
                   <span className="flex h-5 w-5 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                     <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-[9px] font-black text-white">{pendingCount}</span>
                   </span>
                )}
             </button>
           ))}
         </nav>

         {/* Footer da Sidebar */}
         <div className="p-6 border-t border-white/10">
           <button 
             onClick={() => {
               // Pega o slug do condomínio atual (ex: 'maxi') para manter na URL
               const slug = adminCondo?.slug || new URLSearchParams(window.location.search).get('c') || 'maxi';
               // Força o redirecionamento limpando a memória
               window.location.href = `/?c=${slug}&portal=business`;
             }} 
             className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-white/5 text-slate-300 hover:text-white hover:bg-red-500 hover:shadow-lg hover:shadow-red-500/20 font-black text-[10px] uppercase transition-all duration-300 active:scale-95"
           >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair do Painel
           </button>
         </div>
      </aside>

      {/* ── Conteúdo Principal ──────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
	  
         {/* Topbar (Header do Painel) */}
         <header className="bg-white/80 backdrop-blur-md px-6 py-5 flex items-center justify-between shadow-sm z-20 border-b border-slate-100">
            <div className="flex items-center gap-4">
               {/* Hamburger Button (Mobile) */}
               <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-900 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
               </button>
               
               {/* Título da Aba Atual */}
               <div className="hidden md:flex w-10 h-10 bg-slate-100 rounded-xl items-center justify-center text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <div>
                 <h1 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-slate-900">{TABS.find(t => t.id === activeAdminTab)?.label}</h1>
                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest hidden md:block">Gestão em tempo real</p>
               </div>
            </div>

            <button onClick={refreshAdminData} disabled={isAdminRefreshing} className={`flex items-center gap-2 px-4 py-3 md:px-6 md:py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${isAdminRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 hover:shadow-xl'}`}>
                <svg className={`w-4 h-4 ${isAdminRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span className="hidden md:inline">Sincronizar</span>
            </button>
         </header>

{/* Área de Scroll com o conteúdo das abas */}
         <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
             <div className="w-full max-w-[1600px] mx-auto pb-10">


{activeAdminTab === 'dashboard' && (
           <div className="relative pb-20 animate-in fade-in slide-in-from-bottom-4">
              {/* OVERLAY DE BLOQUEIO PARA VITRINE */}
              {isVitrine && (
                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[40px] border-2 border-dashed border-slate-200 mt-6 min-h-[400px]">
                      <div className="bg-slate-900 text-white p-5 rounded-full mb-4 shadow-2xl animate-bounce">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                      </div>
                      <h3 className="text-xl font-black uppercase italic text-slate-800 mb-2">Painel Desabilitado</h3>
                      <p className="text-slate-500 text-xs font-bold max-w-xs mb-6">
                          As estatísticas de vendas e relatórios em tempo real são exclusivos do plano **Empreendedor**.
                      </p>
                  </div>
              )}

              {/* CONTEÚDO (Fica opaco se for vitrine) */}
              <div className={isVitrine ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>
                 <DashboardAdminView 
                    adminBusiness={adminBusiness}
                    adminCondo={adminCondo}
                 />
              </div>
           </div>
        )}
		
		
        {/* ══════════════════════════════════════════
            ABA PEDIDOS
        ══════════════════════════════════════════ */}
         {activeAdminTab === 'pedidos' && (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-20 relative">
        
        {/* OVERLAY DE BLOQUEIO PARA VITRINE */}
        {adminBusiness?.tipoPlano === 'vitrine' && (
            <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[40px] border-2 border-dashed border-slate-200 min-h-[400px] mt-20">
                <div className="bg-slate-900 text-white p-5 rounded-full mb-4 shadow-2xl animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="text-xl font-black uppercase italic text-slate-800 mb-2">Pedidos Desabilitados</h3>
                <p className="text-slate-500 text-xs font-bold max-w-xs mb-6">
                    No modo Vitrine você não recebe pedidos pelo App. Ative o plano **Empreendedor** para liberar sua esteira de vendas e o carrinho de compras.
                </p>
                <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    Migrar para Empreendedor
                </button>
            </div>
        )}

        {/* CONTEÚDO DA ABA (Fica opaco/desabilitado se for vitrine) */}
        <div className={adminBusiness?.tipoPlano === 'vitrine' ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>
            
            {/* 1. FILTROS SUPERIORES E CONTADORES DA ESTEIRA */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm space-y-6 border border-slate-100">
                
                {/* Busca */}
                <div className="relative group">
                    <input 
                        type="text" 
                        placeholder="Buscar morador, apto ou ID..." 
                        className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-slate-200 transition-all" 
                        value={adminOrderSearchTerm} 
                        onChange={(e) => setAdminOrderSearchTerm(e.target.value)} 
                    />
                    <svg className="w-5 h-5 text-slate-300 absolute left-4 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                
                {/* Barra de Status com Quantidades Automáticas */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setAdminOrderFilter('ativos')} className={`flex-none px-5 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'ativos' ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-50'}`}>
                        <span className="text-sm font-black">{adminOrders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length}</span>
                        <span className="text-[10px] font-black uppercase">Ativos</span>
                    </button>

                    <button onClick={() => setAdminOrderFilter('todos')} className={`flex-none px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ${adminOrderFilter === 'todos' ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        Visão do Dia
                    </button>

                    <div className="w-px bg-slate-200 mx-1"></div>

                    <button onClick={() => setAdminOrderFilter('pendente')} className={`flex-none px-4 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'pendente' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        <span className="text-xs font-black">{adminOrders.filter(o => o.status === 'pendente').length}</span>
                        <span className="text-[9px] font-black uppercase">{adminBusiness.category === 'service' ? 'Solicitações' : 'Pendentes'}</span>
                    </button>

                    <button onClick={() => setAdminOrderFilter('preparando')} className={`flex-none px-4 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'preparando' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        <span className="text-xs font-black">{adminOrders.filter(o => o.status === 'preparando').length}</span>
                        <span className="text-[9px] font-black uppercase">{adminBusiness.category === 'service' ? 'Execução' : 'Preparo'}</span>
                    </button>

                    <button onClick={() => setAdminOrderFilter('saiu_entrega')} className={`flex-none px-4 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'saiu_entrega' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        <span className="text-xs font-black">{adminOrders.filter(o => o.status === 'saiu_entrega').length}</span>
                        <span className="text-[9px] font-black uppercase">{adminBusiness.category === 'service' ? 'Técnico' : 'Em Rota'}</span>
                    </button>

                    <button onClick={() => setAdminOrderFilter('entregue_aguardando_pagamento')} className={`flex-none px-4 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'entregue_aguardando_pagamento' ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        <span className="text-xs font-black">{adminOrders.filter(o => o.status === 'entregue_aguardando_pagamento').length}</span>
                        <span className="text-[9px] font-black uppercase">{adminBusiness.category === 'service' ? 'Pgto Pendente' : 'Aguard. Pagto'}</span>
                    </button>
                    
                    <div className="w-px bg-slate-200 mx-1"></div>

                    <button onClick={() => setAdminOrderFilter('concluido')} className={`flex-none px-4 py-3 rounded-2xl flex items-center gap-2 transition-all border ${adminOrderFilter === 'concluido' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        <span className="text-xs font-black">{adminOrders.filter(o => o.status === 'concluido').length}</span>
                        <span className="text-[9px] font-black uppercase">{adminBusiness.category === 'service' ? 'Finalizados' : 'Concluídos'}</span>
                    </button>
                </div>
            </div>

            {/* 2. LISTA DE PEDIDOS FILTRADA */}
            {loadingOrders ? (
                <div className="p-12 text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
                    {filteredAdminOrders.map(order => (
                            <div key={order.id} className={`bg-white p-6 rounded-[32px] shadow-sm border-l-8 ${order.status === 'pendente' ? 'border-orange-500 bg-orange-50/10' : order.status === 'entregue_aguardando_pagamento' ? 'border-cyan-500 bg-cyan-50/10' : 'border-slate-900'} hover:shadow-md transition-all duration-300`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 block mb-1">#{order.id}</span>
                                        <h4 className="text-lg font-black text-slate-800 italic">{order.userName}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.userTag}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <StatusBadge status={order.status} category={adminBusiness.category} />
                                        <PaymentStatusBadge status={order.paymentStatus} />
                                    </div>
                                </div>

                                <div className="space-y-3 mb-4 text-[11px] font-bold text-slate-600 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    {order.items.map((it, idx) => (
                                        <div key={idx} className="flex flex-col border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center">
                                                <span><b className="text-slate-900">{it.quantity}x</b> {it.product.name}</span>
                                                <span className="text-slate-900">{it.product.isQuoteOnly ? 'Sob Consulta' : `R$ ${(it.product.price * it.quantity).toFixed(2)}`}</span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mt-0.5">Categoria: {it.product.category}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                {order.observation && (
                                    <div className="bg-slate-900 text-white p-5 rounded-2xl mb-4 shadow-inner">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Observação:</p>
                                        <p className="text-sm font-bold italic">"{order.observation}"</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-[11px] font-black uppercase mb-4 bg-slate-100 p-4 rounded-2xl">
                                    <div><span className="text-[8px] opacity-60 block">Método</span><span>{order.paymentMethod || '-'}</span></div>
                                    <div className="text-right"><span className="text-[8px] opacity-60 block">Total</span><p className="text-lg text-red-600">R$ {order.total.toFixed(2)}</p></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {order.status === 'entregue_aguardando_pagamento' ? (
                                        <button onClick={() => { if (props.onFinalizeOrder) props.onFinalizeOrder(order.id); }} className="col-span-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all">
                                            {adminBusiness.category === 'service' ? 'Confirmar Recebimento e Encerrar' : 'Confirmar & Concluir'}
                                        </button>
                                    ) : (
                                        <>
                                            {order.paymentStatus === 'pendente' && order.status !== 'cancelado' && order.status !== 'concluido' && (
                                                <button onClick={() => props.onUpdatePayment(order.id, 'pago')} className="bg-emerald-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Baixar Pagamento</button>
                                            )}
                                            {order.status === 'pendente' && (
                                                <button onClick={() => props.onUpdateStatus(order.id, 'preparando')} className="col-span-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                                                    {adminBusiness.category === 'service' ? 'Aceitar e Iniciar Serviço' : 'Mover para Preparo'}
                                                </button>
                                            )}
                                            {order.status === 'preparando' && (
                                                <button onClick={() => props.onUpdateStatus(order.id, 'saiu_entrega')} className="col-span-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">
                                                    {adminBusiness.category === 'service' ? 'Técnico em Deslocamento' : 'Sair para Entrega'}
                                                </button>
                                            )}
                                            {order.status === 'saiu_entrega' && (
                                                <button 
                                                    onClick={() => {
                                                        if (order.paymentStatus === 'pago') {
                                                            if (props.onFinalizeOrder) {
                                                                props.onFinalizeOrder(order.id);
                                                            }
                                                        } else {
                                                            props.onUpdateStatus(order.id, 'entregue_aguardando_pagamento');
                                                        }
                                                    }} 
                                                    className="col-span-full bg-cyan-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all"
                                                >
                                                    {adminBusiness.category === 'service' ? 'Finalizar Execução' : 'Confirmar Entrega'}
                                                </button>
                                            )}
                                            {order.status !== 'cancelado' && order.status !== 'concluido' && (
                                                <button onClick={() => props.onUpdateStatus(order.id, 'cancelado')} className="bg-red-50 text-red-600 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-red-100 transition-colors">Cancelar</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    {filteredAdminOrders.length === 0 && (
                        <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 m-4 rounded-[32px]">
                            <span className="text-4xl opacity-20 grayscale block mb-2">{adminBusiness.category === 'service' ? '📝' : '📦'}</span>
                            <p className="text-slate-400 text-xs uppercase font-bold">{adminBusiness.category === 'service' ? 'Nenhuma solicitação no momento.' : 'Sem movimentação no momento.'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
)}


{activeAdminTab === 'pedidos' && (adminOrderFilter === 'concluido' || adminOrderFilter === 'cancelado') && (
    <div className="col-span-full mt-6 py-8 text-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[32px] animate-in fade-in slide-in-from-bottom-4">
    <div className="flex flex-col items-center gap-2">
        <span className="text-2xl opacity-50 grayscale">
        {adminOrderFilter === 'concluido' ? '✅' : '❌'}
        </span>
        
        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">
        Mostrando apenas os {adminOrderFilter === 'concluido' ? 'concluídos' : 'cancelados'} de hoje
        </p>
        
        <p className="text-slate-400 text-[9px] font-bold max-w-xs mx-auto leading-relaxed">
        Para ver o histórico completo, vendas antigas e extratos, acesse a aba Financeiro.
        </p>
        
        <button 
        onClick={() => setActiveAdminTab('relatorio')}
        className="mt-2 bg-white px-5 py-2.5 rounded-xl text-slate-700 text-[9px] font-black uppercase shadow-sm border border-slate-200 hover:bg-slate-900 hover:text-white transition-all"
        >
        Ir para Financeiro →
        </button>
    </div>
    </div>
)}
        {/* ══════════════════════════════════════════
            ABA CATÁLOGO
        ══════════════════════════════════════════ */}
         {activeAdminTab === 'cardapio' && (
            <div className="pb-24 animate-in fade-in slide-in-from-bottom-4">
			
			{/* OVERLAY DE BLOQUEIO PARA VITRINE */}
                {isVitrine && (
                    <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[40px] border-2 border-dashed border-slate-200 min-h-[400px] mt-20">
                        <div className="bg-slate-900 text-white p-5 rounded-full mb-4 shadow-2xl animate-bounce">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <h3 className="text-xl font-black uppercase italic text-slate-800 mb-2">Catálogo Desabilitado</h3>
                        <p className="text-slate-500 text-xs font-bold max-w-[280px] mb-6">
                            No modo Vitrine você não pode adicionar produtos. Ative o plano **Empreendedor** para criar o seu cardápio/catálogo de serviços online.
                        </p>
                    </div>
                )}
				
				
                {/* Cabeçalho da Aba */}
                <div className={isVitrine ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>
                    
                    {/* Cabeçalho da Aba */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase text-slate-900">Seu Catálogo</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organize em categorias e produtos</p>
                        </div>
                        <button 
                            onClick={() => {
                                props.resetProductForm();
                                setIsProductModalOpen(true);
                            }}
                            className="bg-emerald-500 text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Novo Produto
                        </button>
                    </div>

                {/* Lista de Categorias em Acordeão */}
                <div className="space-y-4">
                    {props.adminCategories.length === 0 && (
                         <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm border-dashed border-2">
                             <span className="text-4xl block mb-2 opacity-30 grayscale">📦</span>
                             <p className="text-sm font-black text-slate-600 mb-1">Seu catálogo está vazio</p>
                             <p className="text-[10px] uppercase font-bold text-slate-400">Clique em "Novo Produto" para começar a vender.</p>
                         </div>
                    )}

                    {props.adminCategories.map(cat => {
                        const isExpanded = expandedCategories.includes(cat);
                        const categoryProducts = props.adminProducts
                            .filter(p => p.category === cat)
                            .sort((a, b) => {
                                // 1º Regra: Produtos ocultos vão sempre para o final da lista
                                if (a.isVisible && !b.isVisible) return -1;
                                if (!a.isVisible && b.isVisible) return 1;

                                // 2º Regra: Priorizar os que controlam estoque (Quantidade)
                                if (a.controlaEstoque && !b.controlaEstoque) return -1;
                                if (!a.controlaEstoque && b.controlaEstoque) return 1;

                                // 3º Regra: Se ambos controlam estoque, ordenar do maior estoque para o menor
                                if (a.controlaEstoque && b.controlaEstoque) {
                                    return (b.estoqueAtual || 0) - (a.estoqueAtual || 0);
                                }

                                // 4º Regra: Se nenhum controla estoque, organiza por ordem alfabética
                                return a.name.localeCompare(b.name);
                            });
                        
                        return (
                            <div 
                                key={cat} 
                                draggable
                                onDragStart={(e) => {
                                    // OBRIGATÓRIO: Sem isto, alguns navegadores cancelam o arrasto na hora!
                                    e.dataTransfer.setData('text/plain', cat);
                                    setDraggedCategory(cat);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault(); // OBRIGATÓRIO: Permite soltar
                                    e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (!draggedCategory || draggedCategory === cat) return;
                                    
                                    const newOrder = [...props.adminCategories];
                                    const draggedIndex = newOrder.indexOf(draggedCategory);
                                    const targetIndex = newOrder.indexOf(cat);
                                    
                                    newOrder.splice(draggedIndex, 1);
                                    newOrder.splice(targetIndex, 0, draggedCategory);
                                    
                                    // Verificação de segurança adicionada
                                    if (props.onCategoryReorder) {
                                        props.onCategoryReorder(newOrder);
                                    } else {
                                        console.error("ERRO: A função onCategoryReorder está ausente!");
                                        alert("Falha: A função de salvar ordem não foi encontrada. Verifique o useAdminHandlers!");
                                    }
                                    setDraggedCategory(null);
                                }}
                                className={`bg-white rounded-[32px] shadow-sm border ${draggedCategory === cat ? 'border-dashed border-emerald-500 opacity-50' : 'border-slate-100'} overflow-hidden transition-all duration-300`}
                            >
                                {/* Botão para expandir a Categoria */}
                                <div className="w-full flex items-stretch hover:bg-slate-50 transition-colors">
                                    {/* Puxador (Drag Handle) */}
                                    <div className="w-12 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-slate-100 text-slate-300 hover:text-emerald-500 transition-colors" title="Arraste para reordenar">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16" /></svg>
                                    </div>

                                    {/* Área clicável para abrir o acordeão */}
                                    <button 
                                        onClick={() => toggleCategory(cat)}
                                        className="flex-1 px-6 py-5 flex items-center justify-between focus:outline-none"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-inner pointer-events-none">
                                                {cat.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left pointer-events-none">
                                                <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-slate-900">{cat}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{categoryProducts.length} {categoryProducts.length === 1 ? 'produto' : 'produtos'}</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 pointer-events-none ${isExpanded ? 'bg-slate-900 text-white rotate-45' : 'bg-slate-100 text-slate-500'}`}>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </button>
                                </div>


                                {/* Lista de Produtos daquela Categoria (Abre/Fecha) */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {categoryProducts.map(prod => (
                                                <div key={prod.id} className={`bg-white p-4 rounded-3xl flex items-center gap-4 border ${prod.isVisible ? 'border-slate-100' : 'border-red-100 bg-red-50/30'} hover:shadow-md transition-all`}>
                                                    <img 
  src={prod.image} 
  alt={prod.name} 
  className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-slate-100 shadow-sm ${
    !prod.isVisible ? 'grayscale opacity-50' : ''
  }`} 
/>
													
													<div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <div>
                                                                <h4 className="text-xs md:text-sm font-black uppercase text-slate-800 line-clamp-1" title={prod.name}>{prod.name}</h4>
                                                                {!prod.isVisible && <span className="text-[8px] font-black uppercase tracking-widest bg-red-100 text-red-600 px-2 py-0.5 rounded-md">Oculto</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                                {/* Botão de Visibilidade */}
                                                                <button onClick={() => props.handleProductToggleVisibility(prod)} className={`p-2 rounded-lg transition-colors ${prod.isVisible ? 'text-emerald-500 hover:bg-emerald-100' : 'text-slate-400 hover:bg-slate-200'}`} title={prod.isVisible ? "Ocultar" : "Mostrar"}>
                                                                    {prod.isVisible ? 
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                                    }
                                                                </button>
                                                                {/* Botão de Edição */}
                                                                <button onClick={() => { props.handleStartEdit(prod); setIsProductModalOpen(true); }} className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                </button>
                                                                {/* Botão de Excluir */}
                                                                <button onClick={() => props.handleProductDelete(prod.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 line-clamp-2 mb-2">{prod.description || 'Nenhuma descrição fornecida.'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                {prod.isQuoteOnly ? 'Sob Consulta' : `R$ ${prod.price.toFixed(2)}`}
                                                            </span>
                                                            {prod.controlaEstoque && (
                                                                <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2 py-1.5 rounded-lg border border-orange-100">
                                                                    Estoque: {prod.estoqueAtual}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
  </div>
                {/* MODAL DE PRODUTO FLUTUANTE */}
                {isProductModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
                        {/* Overlay clicável para fechar ao clicar fora */}
                        <div className="absolute inset-0" onClick={() => setIsProductModalOpen(false)}></div>
                        
                        {/* Caixa do Modal */}
                        <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
                            
                            {/* Cabeçalho do Modal */}
                            <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                                <div>
                                    <h3 className="text-xl font-black italic uppercase text-slate-900">{props.editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preencha os detalhes do seu item</p>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Formulário (Scroll Interno) */}
                            <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                <form 
                                    id="product-form"
                                    ref={props.adminFormRef}
                                    onSubmit={async (e) => {
                                        await props.handleProductSave(e);
                                        setIsProductModalOpen(false); // Fecha o modal automaticamente
                                    }} 
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Coluna da Imagem */}
                                        <div className="w-full md:w-1/3 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Foto do Produto</label>
                                            <div className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden group">
                                                {props.productImageBase64 || props.editingProduct?.image ? (
                                                    <img src={props.productImageBase64 || props.editingProduct?.image} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <span className="text-4xl opacity-20 block mb-2 grayscale">📸</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clique para adicionar</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/50 border border-white/20 px-4 py-2 rounded-full shadow-lg">Mudar Foto</span>
                                                </div>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => props.handleImageUpload(e, 'product')} />
                                            </div>
                                        </div>

                                        {/* Coluna dos Dados */}
                                        <div className="w-full md:w-2/3 space-y-5">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Item</label>
                                                <input required name="name" defaultValue={props.editingProduct?.name || ''} placeholder="Ex: Hambúrguer Artesanal..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all shadow-sm" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria</label>
                                                    <input required name="category" defaultValue={props.editingProduct?.category || ''} placeholder="Ex: Bebidas" list="category-list" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all shadow-sm" />
                                                    <datalist id="category-list">
                                                        {props.adminCategories.map(c => <option key={c} value={c} />)}
                                                    </datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Preço Final (R$)</label>
                                                    <input type="number" step="0.01" name="price" defaultValue={props.editingProduct?.price || ''} placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-white transition-all shadow-sm" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descrição / Ingredientes</label>
                                                <textarea name="description" defaultValue={props.editingProduct?.description || ''} placeholder="O que vem neste produto?" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none h-28 resize-none focus:border-slate-900 focus:bg-white transition-all shadow-sm custom-scrollbar" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opções extras (Checkbox) */}
                               
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                                        <label className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-400 transition-colors">
                                            <input type="checkbox" name="isQuoteOnly" defaultChecked={props.editingProduct?.isQuoteOnly || false} className="w-5 h-5 rounded text-slate-900 border-slate-300 focus:ring-slate-900" />
                                            <div>
                                                <p className="text-[11px] font-black uppercase text-slate-800">Sob Consulta</p>
                                                <p className="text-[9px] font-bold text-slate-400 leading-tight mt-0.5">Oculta o preço para orçamentos.</p>
                                            </div>
                                        </label>
                                        
                                        <div className={`flex flex-col gap-3 p-5 rounded-2xl border transition-colors ${props.isStockEnabled ? 'bg-orange-50/50 border-orange-200' : 'bg-slate-50 border-slate-200 hover:border-slate-400'}`}>
                                            <label className="flex items-center gap-4 cursor-pointer">
                                                <input type="checkbox" checked={props.isStockEnabled} onChange={(e) => props.setIsStockEnabled(e.target.checked)} className="w-5 h-5 rounded text-orange-500 border-slate-300 focus:ring-orange-500" />
                                                <div>
                                                    <p className="text-[11px] font-black uppercase text-slate-800">Controlar Estoque</p>
                                                </div>
                                            </label>
                                            {props.isStockEnabled && (
                                                <div className="pl-9 animate-in slide-in-from-top-2">
                                                    <input type="number" name="estoqueAtual" defaultValue={props.editingProduct?.estoqueAtual || ''} placeholder="Quantidade atual" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-orange-500 transition-colors" />
                                                </div>
                                            )}
                                        </div>

                                        {/* NOVO: CAMPO DE PONTOS DE FIDELIDADE (POR ITEM) */}
                                        {props.isLoyaltyEnabled && props.loyaltyPointMode === 'por_item' && (
                                            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border bg-emerald-50/50 border-emerald-200 animate-in slide-in-from-top-2">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">⭐</div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase text-slate-800">Pontos Fidelidade</p>
                                                        <p className="text-[9px] font-bold text-emerald-600/70 leading-tight mt-0.5">Quantos pontos o cliente ganha ao comprar 1 unidade deste produto.</p>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-32 shrink-0 pl-11 sm:pl-0">
                                                    <input 
                                                        type="number" 
                                                        name="pontosGanhos" 
                                                        defaultValue={props.editingProduct?.pontosGanhos || ''} 
                                                        placeholder="Ex: 10" 
                                                        className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-xs font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-center text-emerald-700" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Rodapé do Modal (Botões de Ação) */}
                            <div className="px-6 md:px-8 py-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-slate-50 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white text-slate-500 font-black text-[10px] uppercase tracking-widest border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95 shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    form="product-form"
                                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    Confirmar Salvar
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        )}
		
        {/* ══════════════════════════════════════════
            ABA AVALIAÇÕES
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'avaliacoes' && (
          <div className="space-y-4 pb-20">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black italic text-slate-800 tracking-tighter mb-1">Mural de Avaliações</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-amber-500">★ {adminBusiness.rating} de média</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                <span>{parseReviews(adminBusiness.reviews).length} vizinhos comentaram</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parseReviews(adminBusiness.reviews).length > 0 ? (
                [...parseReviews(adminBusiness.reviews)]
                  .sort((a: any, b: any) => b.date - a.date)
                  .map((r: any) => (
                    <div key={r.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex gap-6 items-start">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-black text-slate-800 italic uppercase text-xs">{r.userName}</h4>
                            <p className="text-[8px] font-black text-slate-300 uppercase">{new Date(r.date).toLocaleString('pt-BR')}</p>
                          </div>
                          <Stars rating={r.rating} />
                        </div>
                        <p className="text-slate-600 text-sm font-medium italic">"{r.comment}"</p>
                      </div>
                      <button onClick={() => handleAdminDeleteReview(r.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
              ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-slate-100">
                  <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.4em]">Nenhuma avaliação recebida</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            ABA CLIENTES
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'clientes' && (
          <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 relative">
		  
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-50 pt-6 items-end">
                
                {/* 1. Filtro de Bloco / Torre */}
                <div className="space-y-2 group">
                        <div className="flex items-center gap-2 ml-2 mb-1">
                            <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'}</label>
                        </div>
                        <select 
                            value={clientFilterBlock} 
                            onChange={(e) => setClientFilterBlock(e.target.value as any)} 
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm cursor-pointer"
                        >
                            <option value="todos">Todos os Blocos</option>
                            {adminCondo && Array.from({ length: adminCondo.settings.quantity }, (_, i) => {
                                const label = adminCondo.settings.namingType === 'number' ? String(i + 1) : String.fromCharCode(65 + i);
                                return <option key={label} value={label}>{adminCondo.settings.type === 'torre' ? 'Torre' : 'Bloco'} {label}</option>;
                            })}
                        </select>
                    </div>

                    {/* 2. Andar */}
                    <div className="space-y-2 group">
                        <div className="flex items-center gap-2 ml-2 mb-1">
                            <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7l4-4m0 0l4 4m-4-4v18" /></svg>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Andar</label>
                        </div>
                        <select 
                            value={clientFilterFloor} 
                            onChange={(e) => setClientFilterFloor(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm cursor-pointer"
                        >
                            <option value="todos">Qualquer Andar</option>
                            {Array.from({ length: (adminCondo?.settings.floors || 0) + 1 }, (_, i) => (
                                <option key={i} value={i.toString()}>{i === 0 ? 'Térreo' : `${i}º Andar`}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Coluna / Final */}
                    <div className="space-y-2 group">
                        <div className="flex items-center gap-2 ml-2 mb-1">
                            <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Final (apartamento)</label>
                        </div>
                        <select 
                            value={clientFilterUnit} 
                            onChange={(e) => setClientFilterUnit(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm cursor-pointer"
                        >
                            <option value="todos">Todos os finais de ap</option>
                            {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                                <option key={num} value={num}>Aptos Final {num}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Status & Ação */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1 space-y-2 group">
                            <div className="flex items-center gap-2 ml-2 mb-1">
                                <svg className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filtro Rápido</label>
                            </div>
                            <select 
                                value={clientFilterStatus} 
                                onChange={(e) => setClientFilterStatus(e.target.value as any)} 
                                disabled={isVitrine} 
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                <option value="todos">Todos Moradores</option>
                                <option value="pendente">⚠️ Com Pendências</option>
                                <option value="em_dia">✅ Em Dia</option>
                                <option value="com_cupom">🎁 Cupom Disponível</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={() => handleFilterClients()} 
                            disabled={loadingClients} 
                            className="bg-slate-900 text-white h-[52px] w-[52px] md:w-auto md:px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center shrink-0"
                            title="Aplicar Filtros"
                        >
                            {loadingClients ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    <span className="hidden md:inline">Filtrar</span>
                                </div>
                            )}
                        </button>
                </div>
              </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-6 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-1 text-center">Ver</div>
                <div className="col-span-4 md:col-span-3">Morador</div>
                <div className="col-span-3 text-right hidden md:block">Total Pago</div>
                <div className="col-span-4 md:col-span-3 text-right">Pendente</div>
                <div className="col-span-3 md:col-span-2 text-center italic">Fidelidade</div>
              </div>

              {!hasSearchedClients ? (
                <div className="p-20 text-center"><p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Clique em buscar para carregar dados</p></div>
              ) : loadingClients ? (
                <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  {adminClients.map(client => {
                    const clientOrders = adminOrders.filter(o => o.userId === client.id && o.status !== 'cancelado');
                    const totalPaid    = clientOrders.filter(o => o.paymentStatus === 'pago').reduce((a, o) => a + o.total, 0);
                    const totalPending = clientOrders.filter(o => o.paymentStatus === 'pendente' || o.status === 'entregue_aguardando_pagamento').reduce((a, o) => a + o.total, 0);
                    const points       = client.points[adminBusiness.id] || 0;
                    const hasReward    = adminBusiness.loyalty.ativo && points >= adminBusiness.loyalty.metaPontos;
                    const isExpanded   = expandedClientId === client.id;

                    return (
                      <div key={client.id} className={`border-b border-slate-100 transition-all ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'}`}>
                        <div className="grid grid-cols-12 gap-2 p-4 md:p-6 items-center">
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => setExpandedClientId(isExpanded ? null : client.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-slate-900 text-white rotate-45' : 'bg-slate-100 text-slate-400'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            </button>
                          </div>
                          <div className="col-span-4 md:col-span-3">
                            <p className="font-black text-slate-800 text-xs italic uppercase truncate">{client.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{adminCondo?.settings.type === 'torre' ? 'T' : 'B'}{client.block}-{client.floor}{client.apartment}</span>
                              {hasReward && <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase animate-pulse">🎁 Cupom</span>}
                            </div>
                          </div>
                          <div className="col-span-3 text-right hidden md:block">
                            <p className={`font-black text-xs ${isVitrine ? 'blur-[5px] opacity-30 select-none' : 'text-slate-400'}`}>R$ {totalPaid.toFixed(2)}</p>
                          </div>
                          <div className="col-span-4 md:col-span-3 text-right">
                            {isVitrine ? <span className="blur-[5px] opacity-30 text-xs font-black select-none">R$ 00.00</span> : totalPending > 0 ? (
                              <p className="font-black text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg inline-block">R$ {totalPending.toFixed(2)}</p>
                            ) : <span className="text-[9px] font-black text-slate-300 uppercase">Ok</span>}
                          </div>
                          <div className="col-span-3 md:col-span-2 flex items-center justify-center gap-2">
  <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${isVitrine ? 'bg-slate-50 text-slate-300 border-transparent' : hasReward ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
    ★ {points}
  </span>
  
  {!isVitrine && (
    <button 
      onClick={(e) => {
        e.stopPropagation(); // Evita expandir a linha do cliente ao clicar no lápis
        if (props.onEditClientPoints) {
          props.onEditClientPoints(client.id, points);
        }
      }}
      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
      title="Editar pontuação"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  )}
</div>
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-inner">
                              <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-6 border-b border-slate-100 gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.58-1.76-1.752-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Contato do Morador</p>
                                    <p className="text-sm font-black text-slate-800 italic">{maskPhone(client.whatsapp)}</p>
                                  </div>
                                </div>
                                {isVitrine ? (
                                  <button disabled className="bg-slate-200 text-slate-400 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Bloqueado (Plano Vitrine)
                                  </button>
                                ) : (
                                  <button onClick={() => { const p = decryptData(client.whatsapp); if (p) window.open(`https://wa.me/55${p}`, '_blank'); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                    Iniciar WhatsApp
                                  </button>
                                )}
                              </div>

                              <div className="relative">
                                {isVitrine && (
                                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-[11px] font-black uppercase text-slate-800 mb-1">Histórico Bloqueado</p>
                                    <p className="text-[9px] text-slate-500 font-bold max-w-[220px]">Exclusivo para Plano Empreendedor.</p>
                                  </div>
                                )}
                                <div className={isVitrine ? 'opacity-10 grayscale blur-[2px] pointer-events-none' : ''}>
                                  <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Histórico de Consumo</h4>
                                    <span className="text-[9px] font-bold text-slate-300 uppercase italic">Últimos registros</span>
                                  </div>
                                  {clientOrders.length > 0 ? (
                                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                      {[...clientOrders].sort((a, b) => b.createdAt - a.createdAt).map(order => (
                                        <div key={order.id} className={`p-4 rounded-2xl border transition-all ${order.status === 'cancelado' ? 'bg-red-50/30 border-red-100 opacity-60' : 'bg-slate-50 border-slate-100'}`}>
                                          <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-black text-slate-400 block uppercase tracking-tighter">#{order.id.substring(0, 8)} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                                            <div className="flex flex-col items-end gap-1">
                                              <StatusBadge status={order.status} />
                                              <PaymentStatusBadge status={order.paymentStatus} />
                                            </div>
                                          </div>
                                          <div className="space-y-2 mb-3 border-t border-slate-200/40 pt-3">
                                            {order.items.map((item, idx) => (
                                              <div key={idx} className="flex flex-col border-b border-slate-200/30 pb-2 last:border-0">
                                                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                                                  <span><b>{item.quantity}x</b> {item.product.name}</span>
                                                  <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                                <span className="text-[8px] font-black uppercase text-blue-500 tracking-widest mt-0.5">Categoria: {item.product.category}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex flex-col gap-1 border-t border-slate-200/40 pt-3">
                                            {order.discount > 0 && (
                                              <div className="flex justify-between items-center text-emerald-600">
                                                <span className="text-[9px] font-black uppercase tracking-wider">🎁 Fidelidade Aplicada</span>
                                                <span className="text-[11px] font-black">- R$ {order.discount.toFixed(2)}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between items-center mt-1">
                                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Final</span>
                                              <span className={`text-sm font-black ${order.status === 'cancelado' ? 'text-slate-300 line-through' : 'text-slate-900'}`}>R$ {order.total.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum pedido realizado</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {adminClients.length === 0 && <div className="p-12 text-center"><p className="text-slate-400 text-xs font-bold uppercase">Nenhum cliente encontrado.</p></div>}
                </>
              )}
            </div>

            {totalClientsCount > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mostrando {adminClients.length} de {totalClientsCount} moradores</span>
                <div className="flex gap-2">
                  <button onClick={() => handleFilterClients(Math.max(0, (clientPage || 0) - 1))} disabled={(clientPage || 0) === 0 || loadingClients} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase disabled:opacity-50">⬅ Anterior</button>
                  <div className="px-4 py-2 rounded-xl bg-slate-200 text-slate-600 text-[10px] font-black min-w-[30px] text-center">{(clientPage || 0) + 1}</div>
                  <button onClick={() => handleFilterClients((clientPage || 0) + 1)} disabled={((clientPage || 0) + 1) * ITEMS_PER_PAGE >= totalClientsCount || loadingClients} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase disabled:opacity-50">Próxima ➡</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            ABA FINANCEIRO
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'relatorio' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-2">Faturamento Bruto</p>
                <h4 className={`text-4xl font-black italic tracking-tighter mb-4 ${isVitrine ? 'blur-md select-none' : ''}`}>R$ {reportData.faturamento.toFixed(2)}</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className={`text-[10px] font-black uppercase opacity-80 ${isVitrine ? 'blur-sm' : ''}`}>Liquidados: R$ {reportData.liquidados.toFixed(2)}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className={`text-[10px] font-black uppercase opacity-80 ${isVitrine ? 'blur-sm' : ''}`}>Pendentes: R$ {reportData.pendente.toFixed(2)}</span></div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 select-none">💰</div>
                {isVitrine && <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>}
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total de Pedidos</p>
                <h4 className={`text-5xl font-black text-slate-800 italic tracking-tighter ${isVitrine ? 'blur-md' : ''}`}>{reportData.pedidos}</h4>
                <p className="text-[9px] font-bold text-emerald-500 uppercase mt-2 bg-emerald-50 px-3 py-1 rounded-full">No Período</p>
              </div>
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ticket Médio</p>
                <h4 className={`text-4xl font-black text-red-600 italic tracking-tighter ${isVitrine ? 'blur-md' : ''}`}>R$ {reportData.ticketMedio.toFixed(2)}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Média por Venda</p>
              </div>
            </div>

            {/* Painel de controle / filtros */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-8 relative">
              {isVitrine && (
                <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-[40px]">
                  <div className="bg-slate-900 text-white p-4 rounded-full mb-3 shadow-xl"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                  <p className="text-xs font-black uppercase text-slate-800">Relatórios Bloqueados</p>
                  <p className="text-[10px] text-slate-500 font-bold">Disponível apenas no plano Empreendedor</p>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Períodos Rápidos</p>
                  <div className="flex flex-wrap gap-2">
                    {(['today', 'week', 'month', 'all'] as const).map(t => (
                      <button key={t} onClick={() => setTimeFilter(t)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${activeTimeFilter === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-200'}`}>
                        {t === 'today' ? 'Hoje' : t === 'week' ? '7 Dias' : t === 'month' ? 'Mês Atual' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <input type="date" value={adminDateStart} onChange={e => setAdminDateStart(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none uppercase cursor-pointer" />
                  <span className="text-slate-300 font-black">→</span>
                  <input type="date" value={adminDateEnd} onChange={e => setAdminDateEnd(e.target.value)} className="bg-transparent border-none text-[11px] font-black outline-none uppercase cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status do Pedido</label>
                  <select value={financeStatusFilter} onChange={e => setFinanceStatusFilter(e.target.value as any)} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-[11px] font-black uppercase outline-none">
                    <option value="todos">Todos os Status</option>
                    <option value="concluido">✅ Concluído</option>
                    <option value="entregue_aguardando_pagamento">⏳ Entregue (Aguard. Pgto)</option>
                    <option value="pendente">⏳ Pendente</option>
                    <option value="preparando">👨‍🍳 Em Preparo</option>
                    <option value="saiu_entrega">🛵 Em Rota</option>
                    <option value="cancelado">❌ Cancelado</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status Pagamento</label>
                  <select value={financePaymentFilter} onChange={e => setFinancePaymentFilter(e.target.value as any)} className="w-full bg-slate-50 border-none rounded-2xl p-4 text-[11px] font-black uppercase outline-none">
                    <option value="todos">Todos (Pagos e Pendentes)</option>
                    <option value="pago">✅ Pago</option>
                    <option value="pendente">⚠️ Pendente</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => handleFinancialSearch(true)} disabled={finLoading} className="w-full bg-slate-900 text-white h-[56px] rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50">
                    {finLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '🔍 Aplicar Filtros'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de resultados */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Data Venda</th>
                      <th className="px-8 py-5">Morador</th>
                      <th className="px-8 py-5">Itens Detalhados</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-right">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody className={isVitrine ? 'blur-sm grayscale pointer-events-none' : ''}>
                    {reportData.history.map((o: Order) => (
                      <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800">Pedido: {new Date(o.createdAt).toLocaleDateString('pt-BR')}</p>
                          {o.status === 'concluido' && o.finishedAt ? (
                            <p className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />Finalizado: {new Date(o.finishedAt).toLocaleDateString('pt-BR')}</p>
                          ) : (
                            <p className="text-[9px] text-slate-400 font-bold">#{o.id.substring(0, 8)}</p>
                          )}
                        </td>
                        <td className="px-8 py-6 uppercase italic font-black text-slate-900">
                          {o.userName}
                          <span className="block text-[9px] text-slate-400 normal-case not-italic">{o.userTag}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex flex-col border-b border-slate-50 pb-1 mb-1 last:border-0">
                                <span className="text-[10px] text-slate-900"><b>{item.quantity}x</b> {item.product.name}</span>
                                <span className="text-[8px] font-black uppercase text-blue-500 italic">{item.product.category}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <select value={o.status} onChange={(e) => handleAdminUpdateStatus(o.id, e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer">
                              <option value="pendente">Pendente</option>
                              <option value="preparando">Preparo</option>
                              <option value="saiu_entrega">Em Rota</option>
                              <option value="entregue_aguardando_pagamento">Entregue (Aguard. Pgto)</option>
                              <option value="concluido">Concluído</option>
                              <option value="cancelado">❌ Cancelar Pedido</option>
                            </select>
                            <button onClick={() => handleAdminUpdatePaymentStatus(o.id, o.paymentStatus === 'pago' ? 'pendente' : 'pago')} className="transition-transform active:scale-95 hover:opacity-80">
                              <PaymentStatusBadge status={o.paymentStatus} />
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="font-black text-red-600 text-sm">R$ {o.total.toFixed(2)}</p>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{o.paymentMethod}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalOrdersCount > 0 && adminBusiness.tipoPlano === 'empreendedor' && (
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                  <p className="text-[10px] font-black uppercase text-slate-400">Exibindo {reportData.history.length} de {totalOrdersCount} registros</p>
                  <div className="flex items-center gap-3">
                    <button disabled={finPage === 0 || finLoading} onClick={() => { setFinPage((p: number) => p - 1); handleFinancialSearch(false); }} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-30">Anterior</button>
                    <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg">{finPage + 1}</div>
                    <button disabled={(finPage + 1) * FIN_ITEMS_PER_PAGE >= totalOrdersCount || finLoading} onClick={() => { setFinPage((p: number) => p + 1); handleFinancialSearch(false); }} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-30">Próxima</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            ABA CONFIGURAÇÕES
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'config' && (
          <form
            onSubmit={(e) => {
              e.preventDefault(); // <-- Trava o recarregamento da página IMEDIATAMENTE!
              if (props.onConfigSave) {
                props.onConfigSave(e);
              } else {
                console.error("Erro: A função onConfigSave não foi passada para o painel!");
              }
            }}
            className="pb-24 space-y-6 animate-in fade-in duration-500"
          >
            {/* Status da loja */}
            <div className={`relative overflow-hidden rounded-[32px] p-8 shadow-xl transition-all border border-white/20 ${isStoreOpenConfig ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">{isStoreOpenConfig ? 'Loja Aberta' : 'Loja Fechada'}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{isStoreOpenConfig ? 'Clientes podem fazer pedidos' : 'Sua loja está oculta no app'}</p>
                </div>
                <div className="flex bg-black/20 p-1.5 rounded-full backdrop-blur-sm border border-white/10">
                  <button type="button" onClick={() => setIsStoreOpenConfig(true)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isStoreOpenConfig ? 'bg-white text-emerald-600 shadow-lg scale-105' : 'text-white/50 hover:text-white'}`}>Abrir</button>
                  <button type="button" onClick={() => setIsStoreOpenConfig(false)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!isStoreOpenConfig ? 'bg-red-500 text-white shadow-lg scale-105' : 'text-white/50 hover:text-white'}`}>Fechar</button>
                </div>
              </div>
              {!isStoreOpenConfig && (
                <div className="mt-6 pt-6 border-t border-white/10 animate-in slide-in-from-top-2">
                  <label className="text-[9px] font-black uppercase tracking-widest mb-2 block text-red-400">Mensagem de Ausência</label>
                  <input name="mensagemAusencia" defaultValue={adminBusiness.status.mensagemAusencia} placeholder="Ex: Voltamos amanhã às 08h..." className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-sm font-bold outline-none" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Identidade visual */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <h3 className="font-black italic text-slate-800 text-lg flex items-center gap-2">🎨 Identidade da Loja</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome da Loja</label>
                    <input id="edit-business-name" defaultValue={adminBusiness.name} placeholder="Nome da sua empresa" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-100" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Subtítulo / Especialidade</label>
                    <input id="edit-business-subcategory" defaultValue={adminBusiness.subCategory} placeholder="Ex: Pizzas Artesanais" className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-slate-100" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Sobre a Loja</label>
                  <textarea id="edit-business-description" defaultValue={adminBusiness.description} placeholder="Conte um pouco sobre seu negócio..." className="w-full bg-slate-50 border-none rounded-xl p-4 text-sm font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-slate-100" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200 text-center relative overflow-hidden group">
                    <img src={adminLogoBase64 || adminBusiness.image} className="w-16 h-16 mx-auto rounded-xl object-cover mb-2 group-hover:scale-110 transition-transform" alt="Logo" />
                    <p className="text-[9px] font-black uppercase text-slate-400">Logo</p>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} />
                  </div>
                  <div className="flex-[2] bg-slate-50 rounded-2xl p-4 border-2 border-dashed border-slate-200 text-center relative overflow-hidden group">
                    <img src={adminBannerBase64 || adminBusiness.bannerUrl} className="w-full h-16 rounded-xl object-cover mb-2 group-hover:scale-105 transition-transform" alt="Capa" />
                    <p className="text-[9px] font-black uppercase text-slate-400">Capa</p>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'banner')} />
                  </div>
                </div>
              </div>

              {/* Pagamento e contato */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <h3 className="font-black italic text-slate-800 text-lg flex items-center gap-2"><span className="text-xl">💳</span> Pagamento & Contato</h3>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-[10px] tracking-widest uppercase">Chave PIX</div>
                  <input name="chavePix" defaultValue={adminBusiness.pagamento.chavePix} placeholder="E-mail, CPF, Celular ou Chave Aleatória" className="w-full bg-slate-50 rounded-xl pl-24 pr-4 py-3 text-xs font-bold border border-slate-100 outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="flex gap-2">
                  {[{ id: 'pay_pix', label: 'Pix', value: 'PIX' }, { id: 'pay_money', label: 'Dinheiro', value: 'Dinheiro' }, { id: 'pay_card', label: 'Cartão', value: 'Cartão' }].map(m => (
                    <label key={m.id} className="flex-1 cursor-pointer">
                      <input type="checkbox" name={m.id} defaultChecked={adminBusiness.pagamento.metodosAceitos.some(met => met.toUpperCase() === m.value.toUpperCase())} className="peer hidden" />
                      <div className="py-2 text-center rounded-xl bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all">{m.label}</div>
                    </label>
                  ))}
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">WhatsApp de Atendimento</label>
                  <div className="flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100 focus-within:border-emerald-500 transition-colors group">
                    <div className="w-8 h-8 flex items-center justify-center text-slate-400 group-focus-within:text-emerald-500 transition-colors mr-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                    </div>
                    <input type="text" value={whatsappValue} onChange={(e) => setWhatsappValue(formatWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="w-full bg-transparent border-none text-[10px] font-bold py-3 outline-none text-slate-600" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100 focus-within:border-pink-500 transition-colors group">
                      <div className="w-8 h-8 flex items-center justify-center text-slate-400 group-focus-within:text-pink-500 mr-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                      </div>
                      <input name="insta" defaultValue={adminBusiness.social.instagram} placeholder="@instagram" className="w-full bg-transparent border-none text-[10px] font-bold py-3 outline-none" />
                    </div>
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100 focus-within:border-blue-600 transition-colors group">
                      <div className="w-8 h-8 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 mr-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                      </div>
                      <input name="fb" defaultValue={adminBusiness.social.facebook} placeholder="Link Facebook" className="w-full bg-transparent border-none text-[10px] font-bold py-3 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fidelidade */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden">
                
                {/* OVERLAY DE BLOQUEIO PARA VITRINE */}
                {isVitrine && (
                  <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-[32px]">
                    <div className="bg-white text-slate-900 p-3 rounded-full mb-3 shadow-xl">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-xs font-black uppercase text-white mb-1">Fidelidade Bloqueada</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Exclusivo plano Empreendedor</p>
                  </div>
                )}

                {/* CONTEÚDO FIDELIDADE */}
                <div className={isVitrine ? 'opacity-20 pointer-events-none select-none' : ''}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-black italic text-lg flex items-center gap-2">🎁 Programa Fidelidade</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isLoyaltyEnabled ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isLoyaltyEnabled} onChange={(e) => setIsLoyaltyEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-600 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                  {isLoyaltyEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
                      <div className="bg-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Modo de Pontuação</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setLoyaltyPointMode('por_valor')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${loyaltyPointMode === 'por_valor' ? 'bg-white text-slate-900' : 'bg-black/20 text-slate-400'}`}>R$ Gasto</button>
                          <button type="button" onClick={() => setLoyaltyPointMode('por_item')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${loyaltyPointMode === 'por_item' ? 'bg-white text-slate-900' : 'bg-black/20 text-slate-400'}`}>Por Item</button>
                        </div>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Meta (Pontos)</p>
                        <input name="metaPontos" type="number" defaultValue={adminBusiness.loyalty.metaPontos} className="w-full bg-black/20 rounded-lg py-2 px-3 text-sm font-black text-white outline-none" />
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Recompensa</p>
                        <div className="flex gap-2">
                          <select name="tipoRecompensa" defaultValue={adminBusiness.loyalty.tipoRecompensa} className="bg-black/20 rounded-lg text-[9px] font-black text-white outline-none"><option value="valor_fixo">R$</option><option value="porcentagem">%</option></select>
                          <input name="valorRecompensa" type="number" defaultValue={adminBusiness.loyalty.valorRecompensa} className="w-full bg-black/20 rounded-lg py-2 px-3 text-sm font-black text-white outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horários */}
              <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
                <h3 className="font-black italic text-slate-800 text-lg mb-6 flex items-center gap-2">⏰ Horário de Funcionamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                    const config = businessHoursConfig?.[day] || { open: '08:00', close: '22:00', enabled: true, is24h: false };
                    return (
                      <div key={day} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${config.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-transparent opacity-60'}`}>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={config.enabled} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, enabled: e.target.checked } } : null)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-slate-900 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        </label>
                        <div className="w-16 font-black text-[10px] uppercase text-slate-500">{DAY_LABELS[day]}</div>
                        {config.enabled && (
                          <div className="flex-1 flex items-center justify-end gap-2">
                            {!config.is24h ? (
                              <>
                                <input type="time" value={config.open} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, open: e.target.value } } : null)} className="bg-slate-50 border rounded-lg p-1 text-[10px] font-bold w-16 text-center outline-none" />
                                <span className="text-slate-300 font-black text-[9px]">ATÉ</span>
                                <input type="time" value={config.close} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, close: e.target.value } } : null)} className="bg-slate-50 border rounded-lg p-1 text-[10px] font-bold w-16 text-center outline-none" />
                              </>
                            ) : <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">24 Horas</span>}
                            <button type="button" onClick={() => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, is24h: !config.is24h } } : null)} className={`w-6 h-6 rounded-full flex items-center justify-center border ${config.is24h ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-300'}`} title="24 Horas">↺</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botão salvar fixo */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-6">
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-full shadow-2xl uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2 border border-white/10 backdrop-blur-md active:scale-95">
                <span>💾 Salvar Configurações</span>
              </button>
            </div>
          </form>
        )}

</div>
         </div>
		 {/* ── BANNER DE INSTALAÇÃO DO LOJISTA AQUI NO TOPO DA ROLAGEM ── */}
 <InstallBanner currentCondo={adminCondo} />

      </main>
    </div>
  );
}