import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Business, Product, Order, OrderStatus, BusinessHours, PaymentMethod } from '../types';
import { Condominio } from '../types';
import { ViewType, AdminTab, TimeFilter } from '../hooks/useAppState';
import { Stars, StatusBadge, PaymentStatusBadge, LoadingOverlay } from '../components/shared';
import { maskPhone, decryptData } from '../utils/crypto';
import { supabase } from "../../db";
import Swal from 'sweetalert2';
import DashboardAdminView from './DashboardAdminView';
import InstallBanner from '../components/InstallBanner';
import {
  LayoutDashboard, ClipboardList, Store, Star, Users, BarChart3, Settings,
  RefreshCw, Menu as MenuIcon, X as XIcon, LogOut, Megaphone,
} from 'lucide-react';

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
//  Cartão de pedido — reaproveitado na esteira em colunas (desktop)
//  e na lista compacta (mobile). Mesma lógica de ação, densidade diferente.
// ─────────────────────────────────────────────

const ORDER_ACCENT: Record<string, string> = {
  pendente: 'border-accent-500',
  preparando: 'border-brand-500',
  saiu_entrega: 'border-brand-700',
  entregue_aguardando_pagamento: 'border-cyan-500',
  concluido: 'border-emerald-500',
  cancelado: 'border-red-400',
};

function formatElapsed(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h${mins % 60 ? (mins % 60) + 'm' : ''}`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

function OrderCard({ order, adminBusiness, props, compact, draggable, onViewDetails, bare }: {
  order: Order;
  adminBusiness: Business;
  props: AdminDashViewProps;
  compact: boolean;
  draggable?: boolean;
  onViewDetails?: (order: Order) => void;
  bare?: boolean;
}) {
  const isService = adminBusiness.category === 'service';
  const accent = ORDER_ACCENT[order.status] || 'border-ink-900';
  const isOpen = order.status !== 'concluido' && order.status !== 'cancelado';

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: order.id, status: order.status }));
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
      className={bare ? '' : `bg-white rounded-[20px] shadow-sm border-l-4 ${accent} ${compact ? 'p-4' : 'p-5'} transition-all ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {!bare && (
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <span className="text-[10px] font-medium text-ink-400 block mb-0.5">#{order.id}</span>
          <h4 className={`font-display font-semibold text-ink-900 truncate ${compact ? 'text-[13px]' : 'text-[15px]'}`}>{order.userName}</h4>
          <p className="text-[10px] font-medium text-ink-400">{order.userTag}</p>
        </div>
        {isOpen && (
          <span className="shrink-0 text-[10px] font-semibold text-accent-600 bg-accent-50 px-2 py-1 rounded-lg whitespace-nowrap">
            {formatElapsed(order.createdAt)}
          </span>
        )}
      </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-medium text-ink-400">
          {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
          {bare && isOpen && <span className="text-accent-600 font-semibold ml-1.5">· {formatElapsed(order.createdAt)}</span>}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <StatusBadge status={order.status} category={adminBusiness.category} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {!compact && (
        <div className="space-y-2 mb-3 text-[12px] font-medium text-ink-700 bg-black/[0.025] p-4 rounded-xl">
          {order.items.map((it, idx) => (
            <div key={idx} className="flex justify-between items-center gap-2">
              <span className="truncate"><b className="text-ink-900">{it.quantity}x</b> {it.product.name}</span>
              <span className="text-ink-900 font-semibold shrink-0">{it.product.isQuoteOnly ? 'Sob Consulta' : `R$ ${(it.product.price * it.quantity).toFixed(2)}`}</span>
            </div>
          ))}
        </div>
      )}
      {compact && (
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-medium text-ink-500 truncate">
            {order.items.length}x item{order.items.length !== 1 ? 's' : ''} · R$ {order.total.toFixed(2)}
          </p>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(order)}
              className="shrink-0 text-[10px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg hover:bg-brand-100 transition-colors"
            >
              Ver Pedido
            </button>
          )}
        </div>
      )}

      {!compact && order.observation && (
        <div className="bg-ink-900 text-white p-4 rounded-xl mb-3">
          <p className="text-[9px] font-semibold uppercase tracking-widest opacity-50 mb-1">Observação</p>
          <p className="text-[13px] font-medium">"{order.observation}"</p>
        </div>
      )}

      {!compact && (
        <div className="flex items-center justify-between text-[11px] font-semibold mb-3 bg-black/[0.03] p-3.5 rounded-xl">
          <div><span className="text-[9px] text-ink-400 block">Método</span><span className="text-ink-900">{order.paymentMethod || '-'}</span></div>
          <div className="text-right"><span className="text-[9px] text-ink-400 block">Total</span><p className="text-base font-display font-bold text-ink-900 tabular-nums">R$ {order.total.toFixed(2)}</p></div>
        </div>
      )}

      <div className={`grid gap-1.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {order.status === 'entregue_aguardando_pagamento' ? (
          <button onClick={() => { if (props.onFinalizeOrder) props.onFinalizeOrder(order.id); }} className="col-span-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm active:scale-[0.97] transition-all">
            {isService ? 'Confirmar Recebimento' : 'Confirmar & Concluir'}
          </button>
        ) : (
          <>
            {order.paymentStatus === 'pendente' && order.status !== 'cancelado' && order.status !== 'concluido' && (
              <button onClick={() => props.onUpdatePayment(order.id, 'pago')} className="bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-[10px] uppercase tracking-wide active:scale-[0.97] transition-all">Baixar Pagamento</button>
            )}
            {order.status === 'pendente' && (
              <button onClick={() => props.onUpdateStatus(order.id, 'preparando')} className="col-span-full bg-brand-600 text-white py-3 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm active:scale-[0.97] transition-all">
                {isService ? 'Aceitar e Iniciar' : 'Mover para Preparo'}
              </button>
            )}
            {order.status === 'preparando' && (
              <button onClick={() => props.onUpdateStatus(order.id, 'saiu_entrega')} className="col-span-full bg-brand-700 text-white py-3 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm active:scale-[0.97] transition-all">
                {isService ? 'Técnico em Deslocamento' : 'Sair para Entrega'}
              </button>
            )}
            {order.status === 'saiu_entrega' && (
              <button
                onClick={() => {
                  if (order.paymentStatus === 'pago') {
                    if (props.onFinalizeOrder) props.onFinalizeOrder(order.id);
                  } else {
                    props.onUpdateStatus(order.id, 'entregue_aguardando_pagamento');
                  }
                }}
                className="col-span-full bg-cyan-600 text-white py-3 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm active:scale-[0.97] transition-all"
              >
                {isService ? 'Finalizar Execução' : 'Confirmar Entrega'}
              </button>
            )}
            {order.status !== 'cancelado' && order.status !== 'concluido' && (
              <button onClick={() => props.onUpdateStatus(order.id, 'cancelado')} className="bg-red-50 text-red-600 py-2.5 rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-red-100 transition-colors">Cancelar</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Componente
// ─────────────────────────────────────────────

export default function AdminDashView(props: AdminDashViewProps) {



// Estados para controlar o Menu Mobile, o Modal de Produtos e as Categorias expandidas
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false); // NOVO
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]); // NOVO
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [reviewSearchTerm, setReviewSearchTerm] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'todos'>('todos');
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [promoEligibleCount, setPromoEligibleCount] = useState<number | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [sendingPromo, setSendingPromo] = useState(false);


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
    activeTimeFilter, totalOrdersCount, FIN_ITEMS_PER_PAGE, reportData, finSearched,
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

  useEffect(() => {
    if (activeAdminTab === 'relatorio' && !finSearched) {
      handleFinancialSearch(true);
    }
  }, [activeAdminTab]);

  useEffect(() => {
    if (activeAdminTab === 'notificacoes' && adminBusiness?.condominioId) {
      supabase.rpc('get_condo_push_enabled_count', { input_condominio_id: adminBusiness.condominioId })
        .then(({ data }) => { if (typeof data === 'number') setPromoEligibleCount(data); });
    }
  }, [activeAdminTab, adminBusiness?.condominioId]);

  const pendingCount  = adminOrders.filter(o => o.status === 'pendente').length;
  const isVitrine     = adminBusiness.tipoPlano === 'vitrine';
  const isService     = adminBusiness.category === 'service';

  const TABS = [
    { id: 'dashboard',  label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'pedidos',    label: 'Pedidos',      icon: ClipboardList   },
    { id: 'cardapio',   label: 'Catálogo',     icon: Store           },
    { id: 'avaliacoes', label: 'Avaliações',   icon: Star            },
    { id: 'clientes',   label: 'Clientes',     icon: Users           },
    { id: 'relatorio',  label: 'Financeiro',   icon: BarChart3       },
    { id: 'notificacoes', label: 'Notificações', icon: Megaphone     },
    { id: 'config',     label: 'Config',       icon: Settings        },
  ] as const;

  const DAY_LABELS: Record<string, string> = {
    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
  };

 return (
    <div className="flex h-screen bg-cream-100 overflow-hidden font-sans">
      {isAdminRefreshing && <LoadingOverlay type="admin" />}

      {/* ── Overlay Mobile ──────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar Lateral ──────────────────────── */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-ink-900 text-white transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl md:shadow-none`}
      >
         {/* Logo / Header da Sidebar */}
         <div className="p-6 md:p-7 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-3.5 min-w-0">
             <img src={adminBusiness.image} className="w-11 h-11 rounded-2xl object-cover border-2 border-white/10 shrink-0" alt="Logo" />
             <div className="overflow-hidden">
               <h1 className="font-display text-[15px] font-semibold truncate">{adminBusiness.name}</h1>
               <p className="text-[9px] text-brand-300 font-semibold uppercase tracking-widest mt-0.5">Painel Parceiro</p>
             </div>
           </div>
           <button className="md:hidden text-white/50 hover:text-white transition-colors p-2 active:scale-90" onClick={() => setIsMobileMenuOpen(false)}>
             <XIcon className="w-5 h-5" />
           </button>
         </div>

         {/* Menu de Navegação */}
         <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-1 custom-scrollbar">
           <p className="text-[10px] font-semibold uppercase text-white/30 tracking-[0.15em] mb-3 ml-2.5">Menu Principal</p>
           {TABS.map(t => {
             const isActive = activeAdminTab === t.id;
             const Icon = t.icon;
             return (
               <button
                  key={t.id}
                  onClick={() => { setActiveAdminTab(t.id as AdminTab); setIsMobileMenuOpen(false); }}
                  className="relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors duration-150"
               >
                  {isActive && (
                    <motion.div
                      layoutId="admin-tab-active"
                      className="absolute inset-0 bg-white rounded-xl shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-3 ${isActive ? 'text-ink-900' : 'text-white/55 hover:text-white'}`}>
                    <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-600' : ''}`} strokeWidth={2.25} />
                    {t.label}
                  </span>
                  {t.id === 'pedidos' && pendingCount > 0 && (
                     <span className="relative z-10 flex h-5 min-w-5 px-1 relative">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-60" />
                       <span className="relative inline-flex w-full rounded-full bg-accent-500 items-center justify-center text-[9px] font-bold text-white px-1.5">{pendingCount}</span>
                     </span>
                  )}
               </button>
             );
           })}
         </nav>

         {/* Footer da Sidebar */}
         <div className="p-5 border-t border-white/10">
           <button
             onClick={async () => {
               // Pega o slug do condomínio atual (ex: 'maxi') para manter na URL
               const slug = adminCondo?.slug || new URLSearchParams(window.location.search).get('c') || 'maxi';
               // Encerra a sessão de verdade antes de voltar pro portal — sem isso,
               // a restauração silenciosa de sessão do BusinessPortal loga de volta sozinho.
               await supabase.auth.signOut();
               window.location.href = `/?c=${slug}&portal=business`;
             }}
             className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-red-500/90 font-semibold text-[12px] uppercase tracking-wide transition-all duration-150 active:scale-[0.98]"
           >
              <LogOut className="w-4 h-4" strokeWidth={2.25} />
              Sair do Painel
           </button>
         </div>
      </aside>

      {/* ── Conteúdo Principal ──────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-cream-100 relative">

         {/* Topbar (Header do Painel) */}
         <header className="bg-cream-50/90 backdrop-blur-md px-5 md:px-6 py-4 flex items-center justify-between z-20 border-b border-black/[0.06]">
            <div className="flex items-center gap-3.5">
               {/* Hamburger Button (Mobile) */}
               <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-ink-900 hover:bg-black/[0.04] p-2 rounded-xl transition-colors active:scale-90">
                 <MenuIcon className="w-5 h-5" strokeWidth={2.25} />
               </button>

               {/* Ícone da Aba Atual */}
               <div className="hidden md:flex w-10 h-10 bg-black/[0.04] rounded-xl items-center justify-center text-brand-600">
                  {(() => { const Icon = TABS.find(t => t.id === activeAdminTab)?.icon || LayoutDashboard; return <Icon className="w-5 h-5" strokeWidth={2.25} />; })()}
               </div>
               <div>
                 <h1 className="font-display text-lg md:text-xl font-semibold tracking-tight text-ink-900">{TABS.find(t => t.id === activeAdminTab)?.label}</h1>
                 <p className="text-[10px] font-medium text-ink-400 hidden md:block">Gestão em tempo real</p>
               </div>
            </div>

            <button onClick={refreshAdminData} disabled={isAdminRefreshing} className={`flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-2.5 bg-brand-600 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide transition-all shadow-sm active:scale-[0.97] ${isAdminRefreshing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-700'}`}>
                <RefreshCw className={`w-4 h-4 ${isAdminRefreshing ? 'animate-spin' : ''}`} strokeWidth={2.25} />
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
                  <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[32px] border-2 border-dashed border-black/10 mt-6 min-h-[400px]">
                      <div className="bg-ink-900 text-white p-4 rounded-full mb-4 shadow-lg">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">Painel Desabilitado</h3>
                      <p className="text-ink-500 text-[13px] font-medium max-w-xs mb-6">
                          As estatísticas de vendas e relatórios em tempo real são exclusivos do plano Empreendedor.
                      </p>
                  </div>
              )}

              {/* CONTEÚDO (Fica opaco se for vitrine) */}
              <div className={isVitrine ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>
                 <DashboardAdminView
                    adminBusiness={adminBusiness}
                    adminCondo={adminCondo}
                    adminProducts={adminProducts}
                    setActiveAdminTab={setActiveAdminTab}
                 />
              </div>
           </div>
        )}
		
		
        {/* ══════════════════════════════════════════
            ABA PEDIDOS
        ══════════════════════════════════════════ */}
         {activeAdminTab === 'pedidos' && (() => {
             const term = adminOrderSearchTerm.toLowerCase();
             const searchedOrders = adminOrders.filter(o =>
               (o.userName || '').toLowerCase().includes(term) ||
               (o.userTag || '').toLowerCase().includes(term) ||
               (o.id || '').toLowerCase().includes(term)
             );
             const BOARD_COLUMNS: { status: OrderStatus; label: string; dot: string }[] = [
               { status: 'pendente',                      label: isService ? 'Solicitações'  : 'Pendentes',      dot: 'bg-accent-500' },
               { status: 'preparando',                     label: isService ? 'Execução'      : 'Preparo',        dot: 'bg-brand-500'  },
               { status: 'saiu_entrega',                   label: isService ? 'Técnico'       : 'Em Rota',        dot: 'bg-brand-700'  },
               { status: 'entregue_aguardando_pagamento',   label: isService ? 'Pgto Pendente' : 'Aguard. Pagto',  dot: 'bg-cyan-500'   },
               { status: 'concluido',                      label: isService ? 'Finalizados'   : 'Concluídos',     dot: 'bg-emerald-500'},
             ];

             return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 pb-20 relative">

        {/* OVERLAY DE BLOQUEIO PARA VITRINE */}
        {adminBusiness?.tipoPlano === 'vitrine' && (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[32px] border-2 border-dashed border-black/10 min-h-[400px] mt-20">
                <div className="bg-ink-900 text-white p-4 rounded-full mb-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">Pedidos Desabilitados</h3>
                <p className="text-ink-500 text-[13px] font-medium max-w-xs mb-6">
                    No modo Vitrine você não recebe pedidos pelo App. Ative o plano Empreendedor para liberar sua esteira de vendas.
                </p>
                <button className="bg-ink-900 text-white px-7 py-3.5 rounded-2xl font-semibold text-[11px] uppercase tracking-wide shadow-md active:scale-[0.97] transition-all">
                    Migrar para Empreendedor
                </button>
            </div>
        )}

        {/* CONTEÚDO DA ABA (Fica opaco/desabilitado se for vitrine) */}
        <div className={adminBusiness?.tipoPlano === 'vitrine' ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>

            {/* Busca (comum às duas visualizações) */}
            <div className="bg-white p-4 md:p-5 rounded-[22px] shadow-sm mb-4">
                <div className="relative">
                    <svg className="w-[18px] h-[18px] text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input
                        type="text"
                        placeholder="Buscar morador, apto ou ID..."
                        className="w-full bg-black/[0.03] rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-ink-400 outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 border border-transparent focus:border-brand-200 transition-all"
                        value={adminOrderSearchTerm}
                        onChange={(e) => setAdminOrderSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loadingOrders ? (
                <div className="p-12 text-center space-y-3">
                    <div className="w-7 h-7 border-[3px] border-black/10 border-t-brand-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-ink-400 text-[11px] font-medium">Sincronizando...</p>
                </div>
            ) : (
              <>
                {/* ── DESKTOP: quadro em colunas por status ─────────────── */}
                <div className="hidden lg:flex gap-4 overflow-x-auto pb-4">
                  {BOARD_COLUMNS.map(col => {
                    const colOrders = searchedOrders.filter(o => o.status === col.status);
                    return (
                      <div
                        key={col.status}
                        onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                        onDragLeave={() => setDragOverColumn(prev => prev === col.status ? null : prev)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverColumn(null);
                          let payload: { id: string; status: OrderStatus };
                          try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
                          if (!payload?.id || payload.status === col.status) return;

                          const draggedOrder = adminOrders.find(o => o.id === payload.id);
                          const fromLabel = BOARD_COLUMNS.find(c => c.status === payload.status)?.label || payload.status;
                          const result = await Swal.fire({
                            title: 'Mover pedido?',
                            html: `Mover o pedido <b>#${payload.id}</b>${draggedOrder ? ` de <b>${draggedOrder.userName}</b>` : ''} de <b>${fromLabel}</b> para <b>${col.label}</b>?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Mover',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#0d7d75',
                          });
                          if (result.isConfirmed) {
                            props.handleAdminUpdateStatus(payload.id, col.status);
                          }
                        }}
                        className={`w-[300px] shrink-0 rounded-[20px] p-3 flex flex-col max-h-[calc(100vh-230px)] transition-colors ${dragOverColumn === col.status ? 'bg-brand-50 ring-2 ring-brand-300' : 'bg-black/[0.02]'}`}
                      >
                        <div className="flex items-center gap-2 px-2 py-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <h4 className="text-[12px] font-semibold text-ink-700">{col.label}</h4>
                          <span className="ml-auto text-[11px] font-semibold text-ink-400 bg-black/[0.04] px-2 py-0.5 rounded-full">{colOrders.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-0.5 pb-1">
                          {colOrders.map(order => (
                            <OrderCard key={order.id} order={order} adminBusiness={adminBusiness} props={props} compact draggable onViewDetails={setViewingOrder} />
                          ))}
                          {colOrders.length === 0 && (
                            <div className="py-10 text-center text-ink-400/60 text-[11px] font-medium">Nenhum pedido</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── MOBILE: filtro por status + lista ─────────────── */}
                <div className="lg:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-1">
                      <button onClick={() => setAdminOrderFilter('ativos')} className={`flex-none px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${adminOrderFilter === 'ativos' ? 'bg-ink-900 text-white shadow-sm' : 'bg-black/[0.04] text-ink-500'}`}>
                          <span className="text-[13px] font-semibold">{adminOrders.filter(o => o.status !== 'concluido' && o.status !== 'cancelado').length}</span>
                          <span className="text-[10px] font-semibold uppercase">Ativos</span>
                      </button>
                      <button onClick={() => setAdminOrderFilter('todos')} className={`flex-none px-4 py-2.5 rounded-xl text-[10px] font-semibold uppercase transition-all ${adminOrderFilter === 'todos' ? 'bg-white text-ink-900 shadow-sm' : 'bg-black/[0.04] text-ink-400'}`}>
                          Visão do Dia
                      </button>
                      <div className="w-px bg-black/10 mx-0.5"></div>
                      {BOARD_COLUMNS.map(col => (
                        <button key={col.status} onClick={() => setAdminOrderFilter(col.status)} className={`flex-none px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all ${adminOrderFilter === col.status ? `${col.dot} text-white shadow-sm` : 'bg-black/[0.04] text-ink-500'}`}>
                            <span className="text-[12px] font-semibold">{adminOrders.filter(o => o.status === col.status).length}</span>
                            <span className="text-[9px] font-semibold uppercase">{col.label}</span>
                        </button>
                      ))}
                  </div>

                  <div className="space-y-3">
                    {filteredAdminOrders.map(order => (
                      <OrderCard key={order.id} order={order} adminBusiness={adminBusiness} props={props} compact={false} />
                    ))}
                    {filteredAdminOrders.length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-black/10 rounded-[22px]">
                            <p className="text-ink-400 text-[12px] font-medium">{isService ? 'Nenhuma solicitação no momento.' : 'Sem movimentação no momento.'}</p>
                        </div>
                    )}
                  </div>

                  {(adminOrderFilter === 'concluido' || adminOrderFilter === 'cancelado') && (
                    <div className="mt-4 py-6 text-center bg-black/[0.02] border-2 border-dashed border-black/10 rounded-[22px]">
                      <p className="text-ink-500 font-medium text-[12px]">
                        Mostrando apenas os {adminOrderFilter === 'concluido' ? 'concluídos' : 'cancelados'} de hoje.
                      </p>
                      <p className="text-ink-400 text-[11px] font-medium mt-1 max-w-xs mx-auto">
                        Para o histórico completo e extratos, acesse a aba Financeiro.
                      </p>
                      <button onClick={() => setActiveAdminTab('relatorio')} className="mt-3 bg-white px-5 py-2.5 rounded-xl text-ink-700 text-[10px] font-semibold uppercase shadow-sm hover:bg-ink-900 hover:text-white transition-all">
                        Ir para Financeiro →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
    </div>
             );
         })()}
        {/* ══════════════════════════════════════════
            ABA CATÁLOGO
        ══════════════════════════════════════════ */}
         {activeAdminTab === 'cardapio' && (
            <div className="pb-24 animate-in fade-in slide-in-from-bottom-4">

			{/* OVERLAY DE BLOQUEIO PARA VITRINE */}
                {isVitrine && (
                    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 md:p-8 rounded-[32px] border-2 border-dashed border-black/10 min-h-[400px] mt-20">
                        <div className="bg-ink-900 text-white p-4 rounded-full mb-4 shadow-lg">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">Catálogo Desabilitado</h3>
                        <p className="text-ink-500 text-[13px] font-medium max-w-[280px] mb-6">
                            No modo Vitrine você não pode adicionar produtos. Ative o plano Empreendedor para criar o seu catálogo online.
                        </p>
                    </div>
                )}


                {/* Cabeçalho da Aba */}
                <div className={isVitrine ? 'opacity-20 grayscale pointer-events-none select-none' : ''}>

                    {/* Cabeçalho da Aba */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div>
                            <h2 className="font-display text-xl font-semibold text-ink-900">Seu Catálogo</h2>
                            <p className="text-[11px] font-medium text-ink-400">Organize em categorias e produtos</p>
                        </div>
                        <button
                            onClick={() => {
                                props.resetProductForm();
                                setIsProductModalOpen(true);
                            }}
                            className="bg-brand-600 text-white px-6 py-3.5 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm hover:bg-brand-700 active:scale-[0.97] transition-all flex items-center gap-2 shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Novo Produto
                        </button>
                    </div>

                    {/* Busca por nome */}
                    <div className="bg-white p-4 rounded-[20px] shadow-sm mb-6">
                        <div className="relative">
                            <svg className="w-[18px] h-[18px] text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <input
                                type="text"
                                placeholder="Buscar produto pelo nome..."
                                value={catalogSearchTerm}
                                onChange={(e) => setCatalogSearchTerm(e.target.value)}
                                className="w-full bg-black/[0.03] rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-ink-400 outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 border border-transparent focus:border-brand-200 transition-all"
                            />
                        </div>
                    </div>

                {/* Lista de Categorias em Acordeão */}
                <div className="space-y-4">
                    {props.adminCategories.length === 0 && (
                         <div className="text-center p-12 bg-white rounded-[24px] border-2 border-dashed border-black/10">
                             <span className="text-4xl block mb-2 opacity-30 grayscale">📦</span>
                             <p className="text-[13px] font-semibold text-ink-700 mb-1">Seu catálogo está vazio</p>
                             <p className="text-[11px] font-medium text-ink-400">Clique em "Novo Produto" para começar a vender.</p>
                         </div>
                    )}

                    {catalogSearchTerm.trim() !== '' && props.adminProducts.filter(p => p.name.toLowerCase().includes(catalogSearchTerm.toLowerCase())).length === 0 && (
                         <div className="text-center p-10 bg-white rounded-[24px] border-2 border-dashed border-black/10">
                             <p className="text-[13px] font-semibold text-ink-700">Nenhum produto encontrado para "{catalogSearchTerm}"</p>
                         </div>
                    )}

                    {props.adminCategories.map(cat => {
                        const term = catalogSearchTerm.trim().toLowerCase();
                        const isSearching = term !== '';
                        const isExpanded = isSearching || expandedCategories.includes(cat);
                        const categoryProducts = props.adminProducts
                            .filter(p => p.category === cat)
                            .filter(p => !isSearching || p.name.toLowerCase().includes(term))
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

                        if (isSearching && categoryProducts.length === 0) return null;

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
                                className={`bg-white rounded-[24px] shadow-sm border overflow-hidden transition-all duration-300 ${draggedCategory === cat ? 'border-dashed border-brand-500 opacity-50' : 'border-black/[0.04]'}`}
                            >
                                {/* Botão para expandir a Categoria */}
                                <div className="w-full flex items-stretch hover:bg-black/[0.015] transition-colors">
                                    {/* Puxador (Drag Handle) */}
                                    <div className="w-10 flex items-center justify-center cursor-grab active:cursor-grabbing border-r border-black/[0.04] text-ink-400 hover:text-brand-500 transition-colors" title="Arraste para reordenar">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M4 8h16M4 16h16" /></svg>
                                    </div>

                                    {/* Área clicável para abrir o acordeão */}
                                    <button
                                        onClick={() => toggleCategory(cat)}
                                        className="flex-1 px-5 py-4 flex items-center justify-between focus:outline-none"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 bg-ink-900 text-white rounded-xl flex items-center justify-center font-display font-semibold text-base pointer-events-none">
                                                {cat.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left pointer-events-none">
                                                <h3 className="text-[13px] font-semibold text-ink-900">{cat}</h3>
                                                <p className="text-[10px] font-medium text-ink-400">{categoryProducts.length} {categoryProducts.length === 1 ? 'produto' : 'produtos'}</p>
                                            </div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 pointer-events-none ${isExpanded ? 'bg-ink-900 text-white rotate-45' : 'bg-black/[0.04] text-ink-500'}`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </button>
                                </div>


                                {/* Lista de Produtos daquela Categoria (Abre/Fecha) */}
                                {isExpanded && (
                                    <div className="border-t border-black/[0.04] bg-black/[0.012] p-4 md:p-5 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                            {categoryProducts.map(prod => {
                                                const isLowStock = prod.controlaEstoque && (prod.estoqueAtual ?? 0) <= 5 && (prod.estoqueAtual ?? 0) > 0;
                                                const isOutOfStock = prod.controlaEstoque && (prod.estoqueAtual ?? 0) <= 0;
                                                return (
                                                <div key={prod.id} className={`bg-white p-4 rounded-[20px] flex items-center gap-4 border transition-all ${prod.isVisible ? 'border-black/[0.04]' : 'border-red-100 bg-red-50/30'}`}>
                                                    <img
  src={prod.image}
  alt={prod.name}
  className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-black/[0.04] shadow-sm ${
    !prod.isVisible ? 'grayscale opacity-50' : ''
  }`}
/>

													<div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <div>
                                                                <h4 className="text-[13px] font-semibold text-ink-900 line-clamp-1" title={prod.name}>{prod.name}</h4>
                                                                {!prod.isVisible && <span className="text-[9px] font-semibold uppercase tracking-wide bg-red-100 text-red-600 px-2 py-0.5 rounded-md">Oculto</span>}
                                                            </div>
                                                            <div className="flex items-center gap-0.5 shrink-0 bg-black/[0.03] rounded-lg p-1">
                                                                {/* Botão de Visibilidade */}
                                                                <button onClick={() => props.handleProductToggleVisibility(prod)} className={`p-1.5 rounded-md transition-colors ${prod.isVisible ? 'text-emerald-500 hover:bg-emerald-100' : 'text-ink-400 hover:bg-black/[0.06]'}`} title={prod.isVisible ? "Ocultar" : "Mostrar"}>
                                                                    {prod.isVisible ?
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                                    }
                                                                </button>
                                                                {/* Botão de Edição */}
                                                                <button onClick={() => { props.handleStartEdit(prod); setIsProductModalOpen(true); }} className="p-1.5 rounded-md text-brand-600 hover:bg-brand-50 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                </button>
                                                                {/* Botão de Excluir */}
                                                                <button onClick={() => props.handleProductDelete(prod.id)} className="p-1.5 rounded-md text-red-500 hover:bg-red-100 transition-colors">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[11px] font-medium text-ink-400 line-clamp-2 mb-2">{prod.description || 'Nenhuma descrição fornecida.'}</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[13px] font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg">
                                                                {prod.isQuoteOnly ? 'Sob Consulta' : `R$ ${prod.price.toFixed(2)}`}
                                                            </span>
                                                            {prod.controlaEstoque && (
                                                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-lg ${isOutOfStock ? 'text-red-600 bg-red-50' : isLowStock ? 'text-accent-700 bg-accent-50' : 'text-ink-500 bg-black/[0.04]'}`}>
                                                                    {isOutOfStock ? 'Esgotado' : `Estoque: ${prod.estoqueAtual}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-ink-900/60 backdrop-blur-md">
                        {/* Overlay clicável para fechar ao clicar fora */}
                        <div className="absolute inset-0" onClick={() => setIsProductModalOpen(false)}></div>

                        {/* Caixa do Modal */}
                        <div className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-[28px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                            {/* Cabeçalho do Modal */}
                            <div className="px-6 md:px-8 py-5 border-b border-black/[0.05] flex items-center justify-between bg-black/[0.012] shrink-0">
                                <div>
                                    <h3 className="font-display text-lg font-semibold text-ink-900">{props.editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                                    <p className="text-[11px] font-medium text-ink-400">Preencha os detalhes do seu item</p>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="w-9 h-9 flex items-center justify-center bg-black/[0.04] rounded-full text-ink-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M6 18L18 6M6 6l12 12" /></svg>
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
                                            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Foto do Produto</label>
                                            <div className="w-full aspect-square bg-black/[0.02] border-2 border-dashed border-black/10 rounded-[24px] flex flex-col items-center justify-center relative overflow-hidden group">
                                                {props.productImageBase64 || props.editingProduct?.image ? (
                                                    <img src={props.productImageBase64 || props.editingProduct?.image} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <span className="text-4xl opacity-20 block mb-2 grayscale">📸</span>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Clique para adicionar</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-ink-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                                    <span className="text-white text-[10px] font-semibold uppercase tracking-wide bg-white/10 border border-white/20 px-4 py-2 rounded-full">Mudar Foto</span>
                                                </div>
                                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => props.handleImageUpload(e, 'product')} />
                                            </div>
                                        </div>

                                        {/* Coluna dos Dados */}
                                        <div className="w-full md:w-2/3 space-y-5">
                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Nome do Item</label>
                                                <input required name="name" defaultValue={props.editingProduct?.name || ''} placeholder="Ex: Hambúrguer Artesanal..." className="w-full bg-black/[0.03] border border-transparent rounded-xl p-3.5 text-sm font-medium outline-none focus:border-brand-300 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 transition-all" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Categoria</label>
                                                    <input required name="category" defaultValue={props.editingProduct?.category || ''} placeholder="Ex: Bebidas" list="category-list" className="w-full bg-black/[0.03] border border-transparent rounded-xl p-3.5 text-sm font-medium outline-none focus:border-brand-300 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 transition-all" />
                                                    <datalist id="category-list">
                                                        {props.adminCategories.map(c => <option key={c} value={c} />)}
                                                    </datalist>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Preço Final (R$)</label>
                                                    <input type="number" step="0.01" name="price" defaultValue={props.editingProduct?.price || ''} placeholder="0.00" className="w-full bg-black/[0.03] border border-transparent rounded-xl p-3.5 text-sm font-medium outline-none focus:border-brand-300 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 transition-all" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Descrição / Ingredientes</label>
                                                <textarea name="description" defaultValue={props.editingProduct?.description || ''} placeholder="O que vem neste produto?" className="w-full bg-black/[0.03] border border-transparent rounded-xl p-3.5 text-sm font-medium outline-none h-28 resize-none focus:border-brand-300 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 transition-all custom-scrollbar" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opções extras (Checkbox) */}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-black/[0.05]">
                                        <label className="flex items-center gap-4 p-4 rounded-2xl bg-black/[0.02] border border-black/[0.05] cursor-pointer hover:border-black/15 transition-colors">
                                            <input type="checkbox" name="isQuoteOnly" defaultChecked={props.editingProduct?.isQuoteOnly || false} className="w-5 h-5 rounded text-ink-900 border-black/20 focus:ring-ink-900" />
                                            <div>
                                                <p className="text-[12px] font-semibold text-ink-900">Sob Consulta</p>
                                                <p className="text-[10px] font-medium text-ink-400 leading-tight mt-0.5">Oculta o preço para orçamentos.</p>
                                            </div>
                                        </label>

                                        <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-colors ${props.isStockEnabled ? 'bg-accent-50/60 border-accent-200' : 'bg-black/[0.02] border-black/[0.05] hover:border-black/15'}`}>
                                            <label className="flex items-center gap-4 cursor-pointer">
                                                <input type="checkbox" checked={props.isStockEnabled} onChange={(e) => props.setIsStockEnabled(e.target.checked)} className="w-5 h-5 rounded text-accent-500 border-black/20 focus:ring-accent-500" />
                                                <div>
                                                    <p className="text-[12px] font-semibold text-ink-900">Controlar Estoque</p>
                                                </div>
                                            </label>
                                            {props.isStockEnabled && (
                                                <div className="pl-9 animate-in slide-in-from-top-2">
                                                    <input type="number" name="estoqueAtual" defaultValue={props.editingProduct?.estoqueAtual || ''} placeholder="Quantidade atual" className="w-full bg-white border border-black/10 rounded-xl p-3 text-xs font-semibold outline-none focus:border-accent-400 transition-colors" />
                                                </div>
                                            )}
                                        </div>

                                        {/* NOVO: CAMPO DE PONTOS DE FIDELIDADE (POR ITEM) */}
                                        {props.isLoyaltyEnabled && props.loyaltyPointMode === 'por_item' && (
                                            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border bg-brand-50/60 border-brand-200 animate-in slide-in-from-top-2">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 shrink-0">⭐</div>
                                                    <div>
                                                        <p className="text-[12px] font-semibold text-ink-900">Pontos Fidelidade</p>
                                                        <p className="text-[10px] font-medium text-brand-700/70 leading-tight mt-0.5">Quantos pontos o cliente ganha ao comprar 1 unidade deste produto.</p>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-32 shrink-0 pl-11 sm:pl-0">
                                                    <input
                                                        type="number"
                                                        name="pontosGanhos"
                                                        defaultValue={props.editingProduct?.pontosGanhos || ''}
                                                        placeholder="Ex: 10"
                                                        className="w-full bg-white border border-brand-200 rounded-xl p-3 text-xs font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-center text-brand-700"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Rodapé do Modal (Botões de Ação) */}
                            <div className="px-6 md:px-8 py-5 border-t border-black/[0.05] flex flex-col-reverse sm:flex-row justify-end gap-3 bg-black/[0.012] shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-ink-500 font-semibold text-[11px] uppercase tracking-wide border border-black/10 hover:bg-black/[0.03] hover:text-ink-900 transition-all active:scale-[0.97]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    form="product-form"
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-ink-900 text-white font-semibold text-[11px] uppercase tracking-wide shadow-sm hover:bg-black transition-all active:scale-[0.97] flex items-center justify-center gap-2"
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
        {activeAdminTab === 'avaliacoes' && (() => {
            const allReviews = parseReviews(adminBusiness.reviews);
            const term = reviewSearchTerm.trim().toLowerCase();
            const filteredReviews = [...allReviews]
              .filter((r: any) => reviewRatingFilter === 'todos' || r.rating === reviewRatingFilter)
              .filter((r: any) => !term || (r.comment || '').toLowerCase().includes(term) || (r.userName || '').toLowerCase().includes(term))
              .sort((a: any, b: any) => b.date - a.date);
            const ratingCounts = [5, 4, 3, 2, 1].map(n => allReviews.filter((r: any) => r.rating === n).length);

            return (
          <div className="space-y-4 pb-20">
            <div className="bg-white p-6 md:p-7 rounded-[28px] shadow-sm">
              <h3 className="font-display text-xl font-semibold text-ink-900 mb-1">Mural de Avaliações</h3>
              <p className="text-[12px] font-medium text-ink-400 flex items-center gap-2">
                <span className="text-accent-500 font-semibold">★ {adminBusiness.rating} de média</span>
                <span className="w-1 h-1 bg-black/20 rounded-full" />
                <span>{allReviews.length} vizinhos comentaram</span>
              </p>
            </div>

            {/* Filtros: nota + busca por palavra-chave */}
            <div className="bg-white p-4 rounded-[20px] shadow-sm space-y-3">
                <div className="relative">
                    <svg className="w-[18px] h-[18px] text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input
                        type="text"
                        placeholder="Buscar por palavra-chave no comentário ou nome..."
                        value={reviewSearchTerm}
                        onChange={(e) => setReviewSearchTerm(e.target.value)}
                        className="w-full bg-black/[0.03] rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-ink-400 outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 border border-transparent focus:border-brand-200 transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setReviewRatingFilter('todos')} className={`flex-none px-4 py-2 rounded-xl text-[11px] font-semibold uppercase transition-all ${reviewRatingFilter === 'todos' ? 'bg-ink-900 text-white shadow-sm' : 'bg-black/[0.04] text-ink-500'}`}>
                        Todas ({allReviews.length})
                    </button>
                    {[5, 4, 3, 2, 1].map((n, idx) => (
                      <button key={n} onClick={() => setReviewRatingFilter(n)} className={`flex-none px-4 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all ${reviewRatingFilter === n ? 'bg-accent-500 text-white shadow-sm' : 'bg-black/[0.04] text-ink-500'}`}>
                        {n} ★ <span className="opacity-70">({ratingCounts[idx]})</span>
                      </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((r: any) => (
                    <div key={r.id} className="bg-white p-5 rounded-[24px] shadow-sm flex gap-4 items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-ink-900 text-[13px] truncate">{r.userName}</h4>
                            <p className="text-[10px] font-medium text-ink-400">{new Date(r.date).toLocaleString('pt-BR')}</p>
                          </div>
                          <Stars rating={r.rating} />
                        </div>
                        <p className="text-ink-700 text-[13px] font-medium">"{r.comment}"</p>
                      </div>
                      <button onClick={() => handleAdminDeleteReview(r.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
              ) : (
                <div className="col-span-full py-24 text-center bg-white rounded-[28px] border-2 border-dashed border-black/10">
                  <p className="text-ink-400 font-medium text-[12px]">{allReviews.length === 0 ? 'Nenhuma avaliação recebida' : 'Nenhuma avaliação encontrada para esse filtro'}</p>
                </div>
              )}
            </div>
          </div>
            );
        })()}

        {/* ══════════════════════════════════════════
            ABA CLIENTES
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'clientes' && (
          <div className="space-y-5 pb-20 animate-in fade-in slide-in-from-bottom-4 relative">

            {/* Busca livre por nome/apartamento */}
            <div className="bg-white p-4 rounded-[20px] shadow-sm">
                <div className="relative">
                    <svg className="w-[18px] h-[18px] text-ink-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou apartamento..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="w-full bg-black/[0.03] rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium placeholder:text-ink-400 outline-none focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 border border-transparent focus:border-brand-200 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">

                {/* 1. Filtro de Bloco / Torre */}
                <div className="space-y-1.5 group">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">{adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'}</label>
                        <select
                            value={clientFilterBlock}
                            onChange={(e) => setClientFilterBlock(e.target.value as any)}
                            className="w-full bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-300 border border-black/10 transition-all cursor-pointer"
                        >
                            <option value="todos">Todos os Blocos</option>
                            {adminCondo && Array.from({ length: adminCondo.settings.quantity }, (_, i) => {
                                const label = adminCondo.settings.namingType === 'number' ? String(i + 1) : String.fromCharCode(65 + i);
                                return <option key={label} value={label}>{adminCondo.settings.type === 'torre' ? 'Torre' : 'Bloco'} {label}</option>;
                            })}
                        </select>
                    </div>

                    {/* 2. Andar */}
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Andar</label>
                        <select
                            value={clientFilterFloor}
                            onChange={(e) => setClientFilterFloor(e.target.value)}
                            className="w-full bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-300 border border-black/10 transition-all cursor-pointer"
                        >
                            <option value="todos">Qualquer Andar</option>
                            {Array.from({ length: (adminCondo?.settings.floors || 0) + 1 }, (_, i) => (
                                <option key={i} value={i.toString()}>{i === 0 ? 'Térreo' : `${i}º Andar`}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Coluna / Final */}
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Final (apartamento)</label>
                        <select
                            value={clientFilterUnit}
                            onChange={(e) => setClientFilterUnit(e.target.value)}
                            className="w-full bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-300 border border-black/10 transition-all cursor-pointer"
                        >
                            <option value="todos">Todos os finais de ap</option>
                            {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                                <option key={num} value={num}>Aptos Final {num}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Status & Ação */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1.5 group">
                            <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Filtro Rápido</label>
                            <select
                                value={clientFilterStatus}
                                onChange={(e) => setClientFilterStatus(e.target.value as any)}
                                disabled={isVitrine}
                                className="w-full bg-white rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15 focus:border-brand-300 border border-black/10 transition-all cursor-pointer disabled:opacity-50"
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
                            className="bg-ink-900 text-white h-[46px] w-[46px] md:w-auto md:px-6 rounded-xl font-semibold uppercase text-[11px] tracking-wide shadow-sm hover:bg-black active:scale-[0.97] transition-all flex items-center justify-center shrink-0"
                            title="Aplicar Filtros"
                        >
                            {loadingClients ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    <span className="hidden md:inline">Filtrar</span>
                                </div>
                            )}
                        </button>
                </div>
              </div>

            <div className="bg-white rounded-[24px] shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-5 bg-black/[0.02] border-b border-black/[0.05] text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                <div className="col-span-1 text-center">Ver</div>
                <div className="col-span-4 md:col-span-3">Morador</div>
                <div className="col-span-3 text-right hidden md:block">Última / Total</div>
                <div className="col-span-4 md:col-span-3 text-right">Pendente</div>
                <div className="col-span-3 md:col-span-2 text-center">Fidelidade</div>
              </div>

              {!hasSearchedClients ? (
                <div className="p-16 text-center"><p className="text-ink-400 font-medium text-[12px]">Clique em buscar para carregar dados</p></div>
              ) : loadingClients ? (
                <div className="p-16 text-center"><div className="w-7 h-7 border-[3px] border-black/10 border-t-brand-600 rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  {adminClients
                    .filter(client => {
                      const term = clientSearchTerm.trim().toLowerCase();
                      if (!term) return true;
                      const unitLabel = `${client.block}${client.floor}${client.apartment}`.toLowerCase();
                      return (client.name || '').toLowerCase().includes(term) || unitLabel.includes(term);
                    })
                    .map(client => {
                    const clientOrders = adminOrders.filter(o => o.userId === client.id && o.status !== 'cancelado');
                    const totalPaid    = clientOrders.filter(o => o.paymentStatus === 'pago').reduce((a, o) => a + o.total, 0);
                    const totalPending = clientOrders.filter(o => o.paymentStatus === 'pendente' || o.status === 'entregue_aguardando_pagamento').reduce((a, o) => a + o.total, 0);
                    const lastOrder    = [...clientOrders].sort((a, b) => b.createdAt - a.createdAt)[0];
                    const points       = client.points[adminBusiness.id] || 0;
                    const hasReward    = adminBusiness.loyalty.ativo && points >= adminBusiness.loyalty.metaPontos;
                    const isExpanded   = expandedClientId === client.id;

                    return (
                      <div key={client.id} className={`border-b border-black/[0.04] transition-all ${isExpanded ? 'bg-black/[0.015]' : 'bg-white hover:bg-black/[0.01]'}`}>
                        <div className="grid grid-cols-12 gap-2 p-4 md:p-5 items-center">
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => setExpandedClientId(isExpanded ? null : client.id)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-ink-900 text-white rotate-45' : 'bg-black/[0.04] text-ink-400'}`}>
                              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            </button>
                          </div>
                          <div className="col-span-4 md:col-span-3">
                            <p className="font-semibold text-ink-900 text-[13px] truncate">{client.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="bg-black/[0.05] text-ink-500 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">{adminCondo?.settings.type === 'torre' ? 'T' : 'B'}{client.block}-{client.floor}{client.apartment}</span>
                              {hasReward && <span className="bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase">🎁 Cupom</span>}
                            </div>
                          </div>
                          <div className="col-span-3 text-right hidden md:block">
                            {isVitrine ? (
                              <p className="font-semibold text-xs blur-[5px] opacity-30 select-none">R$ 00.00</p>
                            ) : (
                              <>
                                <p className="text-[10px] font-medium text-ink-400">{lastOrder ? new Date(lastOrder.createdAt).toLocaleDateString('pt-BR') : '—'}</p>
                                <p className="font-semibold text-[13px] text-ink-700 tabular-nums">R$ {totalPaid.toFixed(2)}</p>
                              </>
                            )}
                          </div>
                          <div className="col-span-4 md:col-span-3 text-right">
                            {isVitrine ? <span className="blur-[5px] opacity-30 text-xs font-semibold select-none">R$ 00.00</span> : totalPending > 0 ? (
                              <p className="font-semibold text-xs text-red-500 bg-red-50 px-2 py-1 rounded-lg inline-block">R$ {totalPending.toFixed(2)}</p>
                            ) : <span className="text-[10px] font-medium text-ink-400">Ok</span>}
                          </div>
                          <div className="col-span-3 md:col-span-2 flex items-center justify-center gap-2">
  <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${isVitrine ? 'bg-black/[0.03] text-ink-300' : hasReward ? 'bg-accent-100 text-accent-700' : 'bg-black/[0.04] text-ink-400'}`}>
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
      className="p-1.5 text-ink-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
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
                          <div className="px-5 pb-5 animate-in slide-in-from-top-2">
                            <div className="bg-black/[0.012] rounded-[20px] p-4">
                              <div className="flex flex-col md:flex-row justify-between items-center mb-5 pb-5 border-b border-black/[0.05] gap-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.58-1.76-1.752-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 leading-none mb-1">Contato do Morador</p>
                                    <p className="text-[14px] font-semibold text-ink-900">{maskPhone(client.whatsapp)}</p>
                                  </div>
                                </div>
                                {isVitrine ? (
                                  <button disabled className="bg-black/[0.05] text-ink-400 px-5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wide cursor-not-allowed flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    Bloqueado (Plano Vitrine)
                                  </button>
                                ) : (
                                  <button onClick={() => { const p = decryptData(client.whatsapp); if (p) window.open(`https://wa.me/55${p}`, '_blank'); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all shadow-sm active:scale-[0.97]">
                                    Iniciar WhatsApp
                                  </button>
                                )}
                              </div>

                              <div className="relative">
                                {isVitrine && (
                                  <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-black/10">
                                    <p className="text-[12px] font-semibold text-ink-900 mb-1">Histórico Bloqueado</p>
                                    <p className="text-[10px] text-ink-500 font-medium max-w-[220px]">Exclusivo para Plano Empreendedor.</p>
                                  </div>
                                )}
                                <div className={isVitrine ? 'opacity-10 grayscale blur-[2px] pointer-events-none' : ''}>
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Histórico de Consumo</h4>
                                    <span className="text-[10px] font-medium text-ink-300">Últimos registros</span>
                                  </div>
                                  {clientOrders.length > 0 ? (
                                    <div className="space-y-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                                      {[...clientOrders].sort((a, b) => b.createdAt - a.createdAt).map(order => (
                                        <div key={order.id} className={`p-3.5 rounded-2xl border transition-all ${order.status === 'cancelado' ? 'bg-red-50/30 border-red-100 opacity-60' : 'bg-white border-black/[0.04]'}`}>
                                          <div className="flex justify-between items-start mb-2.5">
                                            <span className="text-[10px] font-medium text-ink-400">#{order.id.substring(0, 8)} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                                            <div className="flex flex-col items-end gap-1">
                                              <StatusBadge status={order.status} />
                                              <PaymentStatusBadge status={order.paymentStatus} />
                                            </div>
                                          </div>
                                          <div className="space-y-1.5 mb-2.5 border-t border-black/[0.04] pt-2.5">
                                            {order.items.map((item, idx) => (
                                              <div key={idx} className="flex flex-col border-b border-black/[0.03] pb-1.5 last:border-0">
                                                <div className="flex justify-between text-[12px] font-medium text-ink-700">
                                                  <span><b className="text-ink-900">{item.quantity}x</b> {item.product.name}</span>
                                                  <span>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                                                </div>
                                                <span className="text-[9px] font-semibold uppercase text-brand-600 tracking-wide mt-0.5">Categoria: {item.product.category}</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex flex-col gap-1 border-t border-black/[0.04] pt-2.5">
                                            {order.discount > 0 && (
                                              <div className="flex justify-between items-center text-emerald-600">
                                                <span className="text-[9px] font-semibold uppercase tracking-wide">🎁 Fidelidade Aplicada</span>
                                                <span className="text-[11px] font-semibold">- R$ {order.discount.toFixed(2)}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between items-center mt-1">
                                              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Valor Final</span>
                                              <span className={`text-sm font-semibold ${order.status === 'cancelado' ? 'text-ink-300 line-through' : 'text-ink-900'}`}>R$ {order.total.toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-10 text-center bg-white rounded-2xl border-2 border-dashed border-black/10">
                                      <p className="text-ink-400 text-[11px] font-medium">Nenhum pedido realizado</p>
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
                  {adminClients.length === 0 && <div className="p-12 text-center"><p className="text-ink-400 text-[12px] font-medium">Nenhum cliente encontrado.</p></div>}
                </>
              )}
            </div>

            {totalClientsCount > 0 && (
              <div className="flex items-center justify-between p-4 bg-black/[0.02] rounded-2xl">
                <span className="text-[11px] font-medium text-ink-400">Mostrando {adminClients.length} de {totalClientsCount} moradores</span>
                <div className="flex gap-2">
                  <button onClick={() => handleFilterClients(Math.max(0, (clientPage || 0) - 1))} disabled={(clientPage || 0) === 0 || loadingClients} className="px-4 py-2 rounded-xl bg-white text-ink-600 text-[10px] font-semibold uppercase disabled:opacity-40">⬅ Anterior</button>
                  <div className="px-4 py-2 rounded-xl bg-black/[0.06] text-ink-600 text-[10px] font-semibold min-w-[30px] text-center">{(clientPage || 0) + 1}</div>
                  <button onClick={() => handleFilterClients((clientPage || 0) + 1)} disabled={((clientPage || 0) + 1) * ITEMS_PER_PAGE >= totalClientsCount || loadingClients} className="px-4 py-2 rounded-xl bg-ink-900 text-white text-[10px] font-semibold uppercase disabled:opacity-40">Próxima ➡</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            ABA FINANCEIRO
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'relatorio' && (() => {
            const delta = reportData.faturamentoAnterior > 0
              ? ((reportData.faturamento - reportData.faturamentoAnterior) / reportData.faturamentoAnterior) * 100
              : (reportData.faturamento > 0 ? 100 : 0);
            const exportCSV = () => {
              const header = ['Data', 'Finalizado', 'Morador', 'Apto', 'Itens', 'Status', 'Pagamento', 'Metodo', 'Total'];
              const rows = reportData.history.map((o: Order) => [
                new Date(o.createdAt).toLocaleString('pt-BR'),
                o.finishedAt ? new Date(o.finishedAt).toLocaleString('pt-BR') : '',
                o.userName,
                o.userTag,
                o.items.map(it => `${it.quantity}x ${it.product.name}`).join(' | '),
                o.status,
                o.paymentStatus,
                o.paymentMethod || '',
                o.total.toFixed(2),
              ]);
              const csv = [header, ...rows]
                .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
                .join('\n');
              const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `financeiro_${adminBusiness.name.replace(/\s+/g, '_')}_${adminDateStart}_a_${adminDateEnd}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
          <div className="space-y-5 animate-in fade-in duration-500 pb-10">
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-ink-900 text-white p-6 rounded-[28px] relative overflow-hidden md:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-50 mb-2">Faturamento Bruto</p>
                <div className="flex items-end gap-3 mb-4">
                  <h4 className={`font-display text-3xl font-bold tracking-tight ${isVitrine ? 'blur-md select-none' : ''}`}>R$ {reportData.faturamento.toFixed(2)}</h4>
                  {!isVitrine && reportData.faturamentoAnterior > 0 && (
                    <span className={`text-[11px] font-semibold mb-1 px-1.5 py-0.5 rounded-md ${delta >= 0 ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10'}`}>
                      {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs período anterior
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className={`text-[10px] font-semibold uppercase opacity-80 ${isVitrine ? 'blur-sm' : ''}`}>Liquidados: R$ {reportData.liquidados.toFixed(2)}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent-400" /><span className={`text-[10px] font-semibold uppercase opacity-80 ${isVitrine ? 'blur-sm' : ''}`}>Pendentes: R$ {reportData.pendente.toFixed(2)}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /><span className={`text-[10px] font-semibold uppercase opacity-80 ${isVitrine ? 'blur-sm' : ''}`}>Cancelados: R$ {reportData.totalCancelado.toFixed(2)}</span></div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 rotate-12 select-none">💰</div>
                {isVitrine && <div className="absolute inset-0 z-20 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>}
              </div>
              <div className="bg-white p-6 rounded-[28px] shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-2">Total de Pedidos</p>
                <h4 className={`font-display text-4xl font-bold text-ink-900 ${isVitrine ? 'blur-md' : ''}`}>{reportData.pedidos}</h4>
                <p className="text-[10px] font-semibold text-emerald-600 uppercase mt-2 bg-emerald-50 px-3 py-1 rounded-full">No Período</p>
              </div>
              <div className="bg-white p-6 rounded-[28px] shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-2">Ticket Médio</p>
                <h4 className={`font-display text-3xl font-bold text-accent-600 ${isVitrine ? 'blur-md' : ''}`}>R$ {reportData.ticketMedio.toFixed(2)}</h4>
                <p className="text-[10px] font-medium text-ink-400 uppercase mt-2">Média por Venda</p>
              </div>
            </div>

            {/* Painel de controle / filtros */}
            <div className="bg-white p-6 md:p-7 rounded-[28px] shadow-sm space-y-6 relative">
              {isVitrine && (
                <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-[28px]">
                  <div className="bg-ink-900 text-white p-4 rounded-full mb-3"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                  <p className="text-[13px] font-semibold text-ink-900">Relatórios Bloqueados</p>
                  <p className="text-[11px] text-ink-500 font-medium">Disponível apenas no plano Empreendedor</p>
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Períodos Rápidos</p>
                  <div className="flex flex-wrap gap-2">
                    {(['today', 'week', 'month', 'all'] as const).map(t => (
                      <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-2 rounded-xl text-[11px] font-semibold uppercase transition-all ${activeTimeFilter === t ? 'bg-ink-900 text-white shadow-sm' : 'bg-black/[0.04] text-ink-500 hover:bg-black/[0.07]'}`}>
                        {t === 'today' ? 'Hoje' : t === 'week' ? '7 Dias' : t === 'month' ? 'Mês Atual' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/[0.03] p-2.5 rounded-xl">
                  <input type="date" value={adminDateStart} onChange={e => setAdminDateStart(e.target.value)} className="bg-transparent border-none text-[12px] font-semibold outline-none cursor-pointer text-ink-700" />
                  <span className="text-ink-300 font-semibold">→</span>
                  <input type="date" value={adminDateEnd} onChange={e => setAdminDateEnd(e.target.value)} className="bg-transparent border-none text-[12px] font-semibold outline-none cursor-pointer text-ink-700" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Status do Pedido</label>
                  <select value={financeStatusFilter} onChange={e => setFinanceStatusFilter(e.target.value as any)} className="w-full bg-black/[0.03] border-none rounded-xl p-3.5 text-[12px] font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15">
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
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Status Pagamento</label>
                  <select value={financePaymentFilter} onChange={e => setFinancePaymentFilter(e.target.value as any)} className="w-full bg-black/[0.03] border-none rounded-xl p-3.5 text-[12px] font-semibold outline-none focus:ring-[3px] focus:ring-brand-500/15">
                    <option value="todos">Todos (Pagos e Pendentes)</option>
                    <option value="pago">✅ Pago</option>
                    <option value="pendente">⚠️ Pendente</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => handleFinancialSearch(true)} disabled={finLoading} className="w-full bg-ink-900 text-white h-[48px] rounded-xl font-semibold uppercase text-[12px] tracking-wide shadow-sm active:scale-[0.97] disabled:opacity-50">
                    {finLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : '🔍 Aplicar Filtros'}
                  </button>
                </div>
                <div className="flex items-end">
                  <button onClick={exportCSV} disabled={isVitrine || reportData.history.length === 0} className="w-full bg-brand-600 text-white h-[48px] rounded-xl font-semibold uppercase text-[12px] tracking-wide shadow-sm hover:bg-brand-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>
                    Exportar CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de resultados */}
            <div className="bg-white rounded-[28px] shadow-sm overflow-hidden relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                      <th className="px-6 py-4">Data Venda</th>
                      <th className="px-6 py-4">Morador</th>
                      <th className="px-6 py-4">Itens Detalhados</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody className={isVitrine ? 'blur-sm grayscale pointer-events-none' : ''}>
                    {reportData.history.map((o: Order) => (
                      <tr key={o.id} className="border-t border-black/[0.04] hover:bg-black/[0.012] transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-semibold text-ink-900">Pedido: {new Date(o.createdAt).toLocaleDateString('pt-BR')}</p>
                          {o.status === 'concluido' && o.finishedAt ? (
                            <p className="text-[10px] font-semibold uppercase text-emerald-600 flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Finalizado: {new Date(o.finishedAt).toLocaleDateString('pt-BR')}</p>
                          ) : (
                            <p className="text-[10px] text-ink-400 font-medium">#{o.id.substring(0, 8)}</p>
                          )}
                        </td>
                        <td className="px-6 py-5 font-semibold text-ink-900">
                          {o.userName}
                          <span className="block text-[10px] text-ink-400 font-medium">{o.userTag}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex flex-col border-b border-black/[0.03] pb-1 mb-1 last:border-0">
                                <span className="text-[11px] text-ink-700"><b className="text-ink-900">{item.quantity}x</b> {item.product.name}</span>
                                <span className="text-[9px] font-semibold uppercase text-brand-600">{item.product.category}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col items-center gap-2">
                            <select value={o.status} onChange={(e) => handleAdminUpdateStatus(o.id, e.target.value as any)} className="bg-black/[0.03] rounded-lg p-1.5 text-[10px] font-semibold uppercase outline-none focus:ring-2 focus:ring-brand-500/20 transition-all cursor-pointer">
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
                        <td className="px-6 py-5 text-right">
                          <p className="font-semibold text-ink-900 text-[14px]">R$ {o.total.toFixed(2)}</p>
                          <span className="text-[10px] font-medium text-ink-400 uppercase">{o.paymentMethod}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalOrdersCount > 0 && adminBusiness.tipoPlano === 'empreendedor' && (
                <div className="p-6 bg-black/[0.02] flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-[11px] font-medium text-ink-400">Exibindo {reportData.history.length} de {totalOrdersCount} registros</p>
                  <div className="flex items-center gap-2">
                    <button disabled={finPage === 0 || finLoading} onClick={() => { setFinPage((p: number) => p - 1); handleFinancialSearch(false); }} className="px-5 py-2.5 bg-white rounded-xl text-[11px] font-semibold uppercase transition-all disabled:opacity-30">Anterior</button>
                    <div className="bg-ink-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-[13px]">{finPage + 1}</div>
                    <button disabled={(finPage + 1) * FIN_ITEMS_PER_PAGE >= totalOrdersCount || finLoading} onClick={() => { setFinPage((p: number) => p + 1); handleFinancialSearch(false); }} className="px-5 py-2.5 bg-white rounded-xl text-[11px] font-semibold uppercase transition-all disabled:opacity-30">Próxima</button>
                  </div>
                </div>
              )}
            </div>
          </div>
            );
        })()}

        {/* ══════════════════════════════════════════
            ABA NOTIFICAÇÕES (Promoções via Push)
        ══════════════════════════════════════════ */}
        {activeAdminTab === 'notificacoes' && (
          <div className="max-w-xl space-y-5 animate-in fade-in slide-in-from-bottom-4 pb-20">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Notificações Push</h2>
              <p className="text-[11px] font-medium text-ink-400">Envie uma promoção ou aviso para os moradores do seu condomínio</p>
            </div>

            <div className="bg-ink-900 rounded-[24px] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <Megaphone className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-white tabular-nums leading-none">
                  {promoEligibleCount === null ? '—' : promoEligibleCount}
                </p>
                <p className="text-[11px] font-medium text-white/50 mt-1">
                  {promoEligibleCount === 1 ? 'morador apto a receber notificação' : 'moradores aptos a receber notificação'}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[24px] shadow-sm p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Título</label>
                <input
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Ex: Promoção especial hoje!"
                  maxLength={65}
                  className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-[3px] focus:ring-brand-500/15"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Mensagem</label>
                <textarea
                  value={promoMessage}
                  onChange={(e) => setPromoMessage(e.target.value)}
                  placeholder="Ex: Hoje o brigadeiro está com 20% de desconto! Faça já seu pedido pelo VIZI."
                  maxLength={180}
                  className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium h-24 resize-none outline-none focus:ring-[3px] focus:ring-brand-500/15"
                />
                <p className="text-[10px] font-medium text-ink-400 text-right">{promoMessage.length}/180</p>
              </div>

              <button
                onClick={async () => {
                  if (!promoTitle.trim() || !promoMessage.trim()) {
                    Swal.fire('Preencha tudo', 'Título e mensagem são obrigatórios.', 'warning');
                    return;
                  }
                  const result = await Swal.fire({
                    title: 'Enviar notificação?',
                    html: `Isso vai enviar para <b>${promoEligibleCount ?? 0}</b> ${promoEligibleCount === 1 ? 'morador' : 'moradores'} agora mesmo.`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#0d7d75',
                  });
                  if (!result.isConfirmed) return;

                  setSendingPromo(true);
                  try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    const { data, error } = await supabase.functions.invoke('send-promo-notification', {
                      body: {
                        condominioId: adminBusiness.condominioId,
                        title: promoTitle.trim(),
                        message: promoMessage.trim(),
                      },
                      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
                    });
                    if (error || data?.error) throw new Error(data?.error ? JSON.stringify(data.error) : error?.message);

                    Swal.fire('Enviado!', 'Sua notificação foi disparada.', 'success');
                    setPromoTitle('');
                    setPromoMessage('');
                  } catch (err: any) {
                    Swal.fire('Erro ao enviar', err?.message || 'Tente novamente.', 'error');
                  } finally {
                    setSendingPromo(false);
                  }
                }}
                disabled={sendingPromo || !promoEligibleCount}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold text-[12px] uppercase tracking-wide shadow-sm hover:bg-brand-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Megaphone className="w-4 h-4" strokeWidth={2.25} />
                {sendingPromo ? 'Enviando...' : 'Enviar Notificação'}
              </button>
              {!promoEligibleCount && (
                <p className="text-[11px] font-medium text-ink-400 text-center">Nenhum morador ativou notificações ainda neste condomínio.</p>
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
            className="pb-24 space-y-5 animate-in fade-in duration-500"
          >
            {/* Cabeçalho com preview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink-900">Configurações</h2>
                <p className="text-[11px] font-medium text-ink-400">Ajuste identidade, pagamento, fidelidade e horários da sua loja</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const slug = adminCondo?.slug || new URLSearchParams(window.location.search).get('c') || 'maxi';
                  window.open(`/?c=${slug}&storeId=${adminBusiness.slug || adminBusiness.id}`, '_blank');
                }}
                className="bg-white text-ink-700 px-5 py-3 rounded-xl font-semibold text-[11px] uppercase tracking-wide shadow-sm hover:bg-black/[0.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Ver como o cliente vê
              </button>
            </div>

            {/* Status da loja */}
            <div className={`relative overflow-hidden rounded-[28px] p-6 md:p-7 transition-all ${isStoreOpenConfig ? 'bg-emerald-600 text-white' : 'bg-ink-900 text-white/50'}`}>
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="text-center md:text-left">
                  <h3 className="font-display text-xl font-semibold text-white mb-1">{isStoreOpenConfig ? 'Loja Aberta' : 'Loja Fechada'}</h3>
                  <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{isStoreOpenConfig ? 'Clientes podem fazer pedidos' : 'Sua loja está oculta no app'}</p>
                </div>
                <div className="flex bg-black/20 p-1.5 rounded-full">
                  <button type="button" onClick={() => setIsStoreOpenConfig(true)} className={`px-5 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all ${isStoreOpenConfig ? 'bg-white text-emerald-600 shadow-sm' : 'text-white/50 hover:text-white'}`}>Abrir</button>
                  <button type="button" onClick={() => setIsStoreOpenConfig(false)} className={`px-5 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all ${!isStoreOpenConfig ? 'bg-red-500 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>Fechar</button>
                </div>
              </div>
              {!isStoreOpenConfig && (
                <div className="mt-5 pt-5 border-t border-white/10 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wide mb-2 block text-red-300">Mensagem de Ausência</label>
                  <input name="mensagemAusencia" defaultValue={adminBusiness.status.mensagemAusencia} placeholder="Ex: Voltamos amanhã às 08h..." className="w-full bg-black/30 rounded-xl p-3.5 text-white text-sm font-medium outline-none" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Identidade visual */}
              <div className="bg-white p-6 md:p-7 rounded-[28px] shadow-sm space-y-5">
                <h3 className="font-display font-semibold text-ink-900 text-[15px] flex items-center gap-2">🎨 Identidade da Loja</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Nome da Loja</label>
                    <input id="edit-business-name" defaultValue={adminBusiness.name} placeholder="Nome da sua empresa" className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-[3px] focus:ring-brand-500/15" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Subtítulo / Especialidade</label>
                    <input id="edit-business-subcategory" defaultValue={adminBusiness.subCategory} placeholder="Ex: Pizzas Artesanais" className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-[3px] focus:ring-brand-500/15" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Slug (link curto para compartilhar)</label>
                  <div className="flex gap-2">
                    <input
                      id="edit-business-slug"
                      defaultValue={adminBusiness.slug || ''}
                      placeholder="ex: pizzaria-do-joao"
                      className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium outline-none focus:ring-[3px] focus:ring-brand-500/15 lowercase"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const condoSlug = adminCondo?.slug || new URLSearchParams(window.location.search).get('c') || 'maxi';
                        const storeSlug = (document.getElementById('edit-business-slug') as HTMLInputElement)?.value.trim() || adminBusiness.id;
                        const url = `${window.location.origin}/?c=${condoSlug}&storeId=${storeSlug}`;
                        navigator.clipboard.writeText(url);
                        Swal.fire({ toast: true, position: 'top-end', title: 'Link copiado!', showConfirmButton: false, timer: 1500, icon: 'success' });
                      }}
                      className="shrink-0 px-4 rounded-xl bg-brand-600 text-white text-[11px] font-semibold uppercase tracking-wide hover:bg-brand-700 active:scale-[0.97] transition-all"
                    >
                      Copiar Link
                    </button>
                  </div>
                  <p className="text-[10px] font-medium text-ink-400 ml-1">Sem slug, o link usa um código longo. Salve as configurações depois de definir.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">Sobre a Loja</label>
                  <textarea id="edit-business-description" defaultValue={adminBusiness.description} placeholder="Conte um pouco sobre seu negócio..." className="w-full bg-black/[0.03] rounded-xl p-3.5 text-sm font-medium h-32 resize-none outline-none focus:ring-[3px] focus:ring-brand-500/15" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-black/[0.02] rounded-2xl p-4 border-2 border-dashed border-black/10 text-center relative overflow-hidden group">
                    <img src={adminLogoBase64 || adminBusiness.image} className="w-16 h-16 mx-auto rounded-xl object-cover mb-2 group-hover:scale-105 transition-transform" alt="Logo" />
                    <p className="text-[10px] font-semibold uppercase text-ink-400">Logo</p>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo')} />
                  </div>
                  <div className="flex-[2] bg-black/[0.02] rounded-2xl p-4 border-2 border-dashed border-black/10 text-center relative overflow-hidden group">
                    <img src={adminBannerBase64 || adminBusiness.bannerUrl} className="w-full h-16 rounded-xl object-cover mb-2 group-hover:scale-105 transition-transform" alt="Capa" />
                    <p className="text-[10px] font-semibold uppercase text-ink-400">Capa</p>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'banner')} />
                  </div>
                </div>
              </div>

              {/* Pagamento e contato */}
              <div className="bg-white p-6 md:p-7 rounded-[28px] shadow-sm space-y-5">
                <h3 className="font-display font-semibold text-ink-900 text-[15px] flex items-center gap-2"><span className="text-lg">💳</span> Pagamento & Contato</h3>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold text-[10px] tracking-wide uppercase">Chave PIX</div>
                  <input name="chavePix" defaultValue={adminBusiness.pagamento.chavePix} placeholder="E-mail, CPF, Celular ou Chave Aleatória" className="w-full bg-black/[0.03] rounded-xl pl-24 pr-4 py-3 text-xs font-semibold outline-none focus:ring-[3px] focus:ring-emerald-500/15 transition-all" />
                </div>
                <div className="flex gap-2">
                  {[{ id: 'pay_pix', label: 'Pix', value: 'PIX' }, { id: 'pay_money', label: 'Dinheiro', value: 'Dinheiro' }, { id: 'pay_card', label: 'Cartão', value: 'Cartão' }].map(m => (
                    <label key={m.id} className="flex-1 cursor-pointer">
                      <input type="checkbox" name={m.id} defaultChecked={adminBusiness.pagamento.metodosAceitos.some(met => met.toUpperCase() === m.value.toUpperCase())} className="peer hidden" />
                      <div className="py-2 text-center rounded-xl bg-black/[0.03] text-ink-400 text-[10px] font-semibold uppercase peer-checked:bg-ink-900 peer-checked:text-white transition-all">{m.label}</div>
                    </label>
                  ))}
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 ml-1">WhatsApp de Atendimento</label>
                  <div className="flex items-center bg-black/[0.03] rounded-xl px-3 focus-within:ring-[3px] focus-within:ring-emerald-500/15 transition-all group">
                    <div className="w-8 h-8 flex items-center justify-center text-ink-400 group-focus-within:text-emerald-600 transition-colors mr-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                    </div>
                    <input type="text" value={whatsappValue} onChange={(e) => setWhatsappValue(formatWhatsApp(e.target.value))} placeholder="(00) 00000-0000" className="w-full bg-transparent border-none text-[11px] font-semibold py-3 outline-none text-ink-700" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center bg-black/[0.03] rounded-xl px-3 focus-within:ring-[3px] focus-within:ring-pink-500/15 transition-all group">
                      <div className="w-8 h-8 flex items-center justify-center text-ink-400 group-focus-within:text-pink-500 mr-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                      </div>
                      <input name="insta" defaultValue={adminBusiness.social.instagram} placeholder="@instagram" className="w-full bg-transparent border-none text-[11px] font-semibold py-3 outline-none" />
                    </div>
                    <div className="flex-1 flex items-center bg-black/[0.03] rounded-xl px-3 focus-within:ring-[3px] focus-within:ring-brand-500/15 transition-all group">
                      <div className="w-8 h-8 flex items-center justify-center text-ink-400 group-focus-within:text-brand-600 mr-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                      </div>
                      <input name="fb" defaultValue={adminBusiness.social.facebook} placeholder="Link Facebook" className="w-full bg-transparent border-none text-[11px] font-semibold py-3 outline-none" />
                    </div>
                  </div>
                  <div className="flex items-center bg-black/[0.03] rounded-xl px-3 focus-within:ring-[3px] focus-within:ring-accent-500/15 transition-all group">
                    <div className="w-8 h-8 flex items-center justify-center text-ink-400 group-focus-within:text-accent-600 mr-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z" /></svg>
                    </div>
                    <input name="website" type="url" defaultValue={adminBusiness.social.website || ''} placeholder="Site (ex: https://minhaloja.com.br)" className="w-full bg-transparent border-none text-[11px] font-semibold py-3 outline-none" />
                  </div>
                </div>
              </div>

              {/* Fidelidade */}
              <div className="lg:col-span-2 bg-ink-900 p-6 md:p-7 rounded-[28px] text-white relative overflow-hidden">

                {/* OVERLAY DE BLOQUEIO PARA VITRINE */}
                {isVitrine && (
                  <div className="absolute inset-0 z-30 bg-ink-900/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-[28px]">
                    <div className="bg-white text-ink-900 p-3 rounded-full mb-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-[13px] font-semibold text-white mb-1">Fidelidade Bloqueada</p>
                    <p className="text-[10px] text-white/50 font-medium uppercase tracking-wide">Exclusivo plano Empreendedor</p>
                  </div>
                )}

                {/* CONTEÚDO FIDELIDADE */}
                <div className={isVitrine ? 'opacity-20 pointer-events-none select-none' : ''}>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="font-display font-semibold text-[15px] flex items-center gap-2">🎁 Programa Fidelidade</h3>
                      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{isLoyaltyEnabled ? 'Ativo' : 'Inativo'}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isLoyaltyEnabled} onChange={(e) => setIsLoyaltyEnabled(e.target.checked)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-white/15 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                  {isLoyaltyEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-4">
                      <div className="bg-white/[0.06] p-4 rounded-2xl">
                        <p className="text-[10px] font-semibold uppercase text-white/40 mb-2">Modo de Pontuação</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setLoyaltyPointMode('por_valor')} className={`flex-1 py-2 rounded-lg text-[10px] font-semibold uppercase ${loyaltyPointMode === 'por_valor' ? 'bg-white text-ink-900' : 'bg-white/[0.06] text-white/50'}`}>R$ Gasto</button>
                          <button type="button" onClick={() => setLoyaltyPointMode('por_item')} className={`flex-1 py-2 rounded-lg text-[10px] font-semibold uppercase ${loyaltyPointMode === 'por_item' ? 'bg-white text-ink-900' : 'bg-white/[0.06] text-white/50'}`}>Por Item</button>
                        </div>
                      </div>
                      <div className="bg-white/[0.06] p-4 rounded-2xl">
                        <p className="text-[10px] font-semibold uppercase text-white/40 mb-2">Meta (Pontos)</p>
                        <input name="metaPontos" type="number" defaultValue={adminBusiness.loyalty.metaPontos} className="w-full bg-white/[0.08] rounded-lg py-2 px-3 text-sm font-semibold text-white outline-none" />
                      </div>
                      <div className="bg-white/[0.06] p-4 rounded-2xl">
                        <p className="text-[10px] font-semibold uppercase text-white/40 mb-2">Recompensa</p>
                        <div className="flex gap-2">
                          <select name="tipoRecompensa" defaultValue={adminBusiness.loyalty.tipoRecompensa} className="bg-white/[0.08] rounded-lg text-[10px] font-semibold text-white outline-none"><option value="valor_fixo">R$</option><option value="porcentagem">%</option></select>
                          <input name="valorRecompensa" type="number" defaultValue={adminBusiness.loyalty.valorRecompensa} className="w-full bg-white/[0.08] rounded-lg py-2 px-3 text-sm font-semibold text-white outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Horários */}
              <div className="lg:col-span-2 bg-white p-6 md:p-7 rounded-[28px] shadow-sm">
                <h3 className="font-display font-semibold text-ink-900 text-[15px] mb-5 flex items-center gap-2">⏰ Horário de Funcionamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                    const config = businessHoursConfig?.[day] || { open: '08:00', close: '22:00', enabled: true, is24h: false };
                    return (
                      <div key={day} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${config.enabled ? 'bg-black/[0.02]' : 'bg-black/[0.015] opacity-50'}`}>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={config.enabled} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, enabled: e.target.checked } } : null)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-black/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-ink-900 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                        </label>
                        <div className="w-16 font-semibold text-[11px] uppercase text-ink-500">{DAY_LABELS[day]}</div>
                        {config.enabled && (
                          <div className="flex-1 flex items-center justify-end gap-2">
                            {!config.is24h ? (
                              <>
                                <input type="time" value={config.open} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, open: e.target.value } } : null)} className="bg-white rounded-lg p-1 text-[10px] font-semibold w-16 text-center outline-none border border-black/10" />
                                <span className="text-ink-300 font-semibold text-[10px]">ATÉ</span>
                                <input type="time" value={config.close} onChange={(e) => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, close: e.target.value } } : null)} className="bg-white rounded-lg p-1 text-[10px] font-semibold w-16 text-center outline-none border border-black/10" />
                              </>
                            ) : <span className="text-[10px] font-semibold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">24 Horas</span>}
                            <button type="button" onClick={() => setBusinessHoursConfig(prev => prev ? { ...prev, [day]: { ...config, is24h: !config.is24h } } : null)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${config.is24h ? 'bg-emerald-500 text-white' : 'bg-black/[0.05] text-ink-400'}`} title="24 Horas">↺</button>
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
              <button type="submit" className="w-full bg-ink-900 text-white font-semibold py-3.5 rounded-full shadow-lg uppercase tracking-wide text-[12px] hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-[0.97]">
                <span>💾 Salvar Configurações</span>
              </button>
            </div>
          </form>
        )}

</div>
         </div>

        {/* ── MODAL: VER PEDIDO (detalhes completos a partir da esteira) ── */}
        <AnimatePresence>
          {viewingOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink-900/55 backdrop-blur-md"
              onClick={() => setViewingOrder(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                className="relative w-full sm:max-w-md max-h-[88vh] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className={`shrink-0 flex items-start justify-between gap-3 p-6 border-l-4 ${ORDER_ACCENT[viewingOrder.status] || 'border-ink-900'} bg-black/[0.015]`}>
                  <div className="min-w-0">
                    <span className="text-[10px] font-medium text-ink-400 block mb-0.5">Pedido #{viewingOrder.id}</span>
                    <h3 className="font-display text-lg font-semibold text-ink-900 truncate">{viewingOrder.userName}</h3>
                    <p className="text-[11px] font-medium text-ink-400">{viewingOrder.userTag}</p>
                  </div>
                  <button onClick={() => setViewingOrder(null)} className="shrink-0 w-9 h-9 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-ink-500 transition-colors">
                    <XIcon className="w-4 h-4" strokeWidth={2.25} />
                  </button>
                </div>

                {/* Corpo (rola se o pedido tiver muitos itens) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                  <OrderCard order={viewingOrder} adminBusiness={adminBusiness} props={props} compact={false} bare />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

		 {/* ── BANNER DE INSTALAÇÃO DO LOJISTA AQUI NO TOPO DA ROLAGEM ── */}
 <InstallBanner currentCondo={adminCondo} />

      </main>
    </div>
  );
}