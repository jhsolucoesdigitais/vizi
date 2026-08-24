import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Business, Product, CartItem, CategoryType, Condominio } from '../types';
import { ViewType } from '../hooks/useAppState';
import { isStoreCurrentlyOpen } from '../components/shared';
import { supabase } from '../../db';
import { Search, ShoppingCart, LogOut, RefreshCw, ChevronRight, UtensilsCrossed, Wrench, LayoutGrid, ClipboardList, Star } from 'lucide-react';
import InstallBanner from '../components/InstallBanner';
import NotificationPrompt from '../components/NotificationPrompt';
// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

interface DashboardViewProps {
  user: User;
  currentCondo: Condominio | null;
  businesses: Business[];
  allProducts: Product[];
  cart: CartItem[];
  notificationCount: number;
  categoryFilter: CategoryType | 'all';
  setCategoryFilter: (f: CategoryType | 'all') => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  setView: (v: ViewType) => void;
  setNotificationCount: (n: number) => void;
  
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onSelectBusiness: (business: Business) => void;
  
  userOrders?: any[];
  activeTimeFilter?: any;
  setActiveTimeFilter?: any;
  initialTab?: string;
  onToggleFavorite?: (e: React.MouseEvent, bizId: string) => void;
  onRefreshOrders?: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Utilitário — Filtra Lojas
// ─────────────────────────────────────────────

function filterBusinesses(
  businesses: Business[],
  allProducts: Product[],
  currentCondo: Condominio | null,
  categoryFilter: CategoryType | 'all',
  searchTerm: string,
): Business[] {
  return businesses.filter(b => {
 
    if (b.licenseStatus === 'blocked') return false;
 
    if (currentCondo && b.condominioId !== currentCondo.id) return false;

    const matchesTab = categoryFilter === 'all' || b.category === categoryFilter;

    const storeProducts = allProducts.filter(p => p.empresaId === b.id);
    const hasVisibleProducts = storeProducts.some(p => p.isVisible !== false);
    const isVitrine = b.tipoPlano === 'vitrine';
    const showInList = isVitrine ? true : hasVisibleProducts;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesTab && showInList;

    const matchStore = b.name?.toLowerCase().includes(term)
      || b.category?.toLowerCase().includes(term)
      || b.subCategory?.toLowerCase().includes(term);

    const matchProduct = storeProducts.some(p =>
      p.name?.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );

    return matchesTab && showInList && (matchStore || matchProduct);
  });
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────

export default function DashboardView({
  user, currentCondo, businesses, allProducts, cart, notificationCount, categoryFilter, setCategoryFilter, searchTerm, setSearchTerm, setView, onSelectBusiness, setNotificationCount, onLogout, onRefresh, isRefreshing, onRefreshOrders 
}: DashboardViewProps) {

  // Contagem de moradores cadastrados no condomínio (só o número, via RPC — sem expor linhas de usuarios)
  const [residentCount, setResidentCount] = useState<number | null>(null);
  useEffect(() => {
    if (!currentCondo?.id) return;
    supabase.rpc('get_condo_resident_count', { input_condominio_id: currentCondo.id })
      .then(({ data }) => { if (typeof data === 'number') setResidentCount(data); });
  }, [currentCondo?.id]);

  // ── NOVA LÓGICA: ORDENAÇÃO ALEATÓRIA + ABERTAS NO TOPO ──
  const sortedBusinesses = useMemo(() => {
    // 1. Embaralha todas as lojas de forma aleatória
    const shuffled = [...businesses].sort(() => Math.random() - 0.5);
    
    // 2. Move as lojas ABERTAS para o topo (mantendo o embaralhamento entre elas)
    return shuffled.sort((a, b) => {
      const aOpen = isStoreCurrentlyOpen(a);
      const bOpen = isStoreCurrentlyOpen(b);
      
      if (aOpen && !bOpen) return -1; // 'a' sobe
      if (!aOpen && bOpen) return 1;  // 'b' sobe
      return 0; // Se ambas abertas ou ambas fechadas, mantém a ordem aleatória
    });
  }, [businesses]); // Só re-embaralha se a lista de lojas mudar (ex: ao atualizar o app)

  // Agora usamos a lista "sortedBusinesses" no lugar da "businesses" original
  const userFavorites = sortedBusinesses.filter(b => user.favorites?.includes(b.id));
  const filtered = filterBusinesses(sortedBusinesses, allProducts, currentCondo, categoryFilter, searchTerm);
  const cartTotal = cart.reduce((a, i) => a + (i.product.price * i.quantity), 0);

  const categories: { key: CategoryType | 'all'; label: string; icon: typeof UtensilsCrossed }[] = [
    { key: 'food',    label: 'Delivery',  icon: UtensilsCrossed },
    { key: 'service', label: 'Serviços',  icon: Wrench },
    { key: 'all',     label: 'Tudo',      icon: LayoutGrid },
  ];

  return (
    <div className="min-h-screen bg-cream-100 pb-32 md:p-6 font-sans text-left">

      {/* Container Principal Mobile/Desktop */}
      <div className="max-w-[480px] md:max-w-4xl mx-auto bg-cream-50 min-h-screen md:min-h-[calc(100vh-3rem)] md:rounded-[32px] shadow-2xl shadow-ink-900/10 overflow-hidden flex flex-col relative border-x border-black/5">

        {/* ── HEADER (Unidade + Ações) ──────────────────────── */}
        <header className="bg-cream-50/90 backdrop-blur-md px-5 md:px-8 py-3.5 flex items-center justify-between border-b border-black/[0.06] sticky top-0 z-50">
          {/* Etiqueta de unidade — a "placa de porta" */}
          <button className="flex items-center gap-3 max-w-[58%] md:max-w-[70%] group text-left" title="Trocar apartamento">
            <div className="w-11 h-11 rounded-2xl bg-brand-500 flex flex-col items-center justify-center shrink-0 shadow-sm shadow-brand-500/30">
              <span className="font-display font-bold text-white text-[13px] leading-none tracking-tight">{user.block}{user.floor}{user.apartment}</span>
              <span className="text-[7px] font-semibold text-white/70 uppercase tracking-[0.15em] leading-none mt-0.5">apto</span>
            </div>
            <div className="flex flex-col items-start overflow-hidden leading-tight">
              <span className="text-[10px] font-medium text-ink-500 uppercase tracking-widest truncate w-full">
                {currentCondo?.name}
              </span>
              <span className="font-display font-semibold text-ink-900 text-[15px] truncate w-full flex items-center gap-1">
                {user.name?.split(' ')[0] || 'Minha unidade'}
                <ChevronRight className="w-3.5 h-3.5 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </button>

          <div className="flex items-center gap-0.5 md:gap-1.5 relative z-10">
            <button onClick={onRefresh} disabled={isRefreshing} className={`p-2.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-black/[0.04] active:scale-90 transition-all ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} title="Atualizar App">
              <RefreshCw className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>

            <button
              onClick={async () => {
                setNotificationCount(0);
                if (onRefreshOrders) await onRefreshOrders();
                setView('my-orders');
              }}
              className="relative p-2.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-black/[0.04] active:scale-90 transition-all"
              title="Meus Pedidos"
            >
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-brand-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-cream-50">
                  {notificationCount}
                </span>
              )}
              <ClipboardList className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>

            <button onClick={() => setView('cart')} className="relative p-2.5 rounded-full text-ink-400 hover:text-ink-900 hover:bg-black/[0.04] active:scale-90 transition-all" title="Ver Carrinho">
              {cart.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-brand-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-cream-50">
                  {cart.length}
                </span>
              )}
              <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>

            <button onClick={onLogout} className="p-2.5 rounded-full text-ink-400 hover:text-red-500 hover:bg-red-500/[0.06] active:scale-90 transition-all" title="Sair da Conta">
              <LogOut className="w-[18px] h-[18px]" strokeWidth={2.25} />
            </button>
          </div>
        </header>

        <main className="animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pb-32">

          {/* ── CONVITE PARA ATIVAR NOTIFICAÇÕES ──────────────────────── */}
          <div className="px-5 md:px-8 pt-5">
            <NotificationPrompt userId={user.id} />
          </div>

          {/* ── BANNER PARCEIRO ──────────────────────── */}
          <div className="px-5 md:px-8 pt-5 pb-2">
            <button
              onClick={() => window.open(window.location.origin, '_blank', 'noopener')}
              className="w-full bg-ink-900 rounded-3xl px-6 py-5 flex items-center gap-4 overflow-hidden relative shadow-lg text-left active:scale-[0.99] transition-transform duration-150"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent-500/20 rounded-full blur-[50px] pointer-events-none" />
              <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-brand-500/20 rounded-full blur-[45px] pointer-events-none" />

              <div className="relative z-10 flex-1 min-w-0">
                <span className="text-accent-400 text-[10px] font-bold uppercase tracking-[0.15em]">Seja parceiro</span>
                <h3 className="font-display text-white text-lg font-semibold tracking-tight leading-snug mt-0.5">
                  Vende ou presta algum serviço?
                </h3>
                {residentCount !== null && residentCount > 0 && (
                  <p className="text-white/60 text-[11px] font-medium mt-1">
                    {residentCount} {residentCount === 1 ? 'morador já está' : 'moradores já estão'} no VIZI — leve seu negócio até eles
                  </p>
                )}
                <span className="text-white/80 text-[13px] font-medium mt-2 inline-flex items-center gap-1 group">
                  Crie sua loja digital <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="relative z-10 shrink-0 w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-md p-1.5">
                <img src="/assets/web-app-manifest-512x512.png" alt="VIZI" className="w-full h-full object-contain" />
              </div>
            </button>
          </div>

          {/* ── FAVORITOS ──────────────────────── */}
          {userFavorites.length > 0 && (
            <div className="mt-4 mb-2 px-5 md:px-8">
              <h3 className="font-display font-semibold text-ink-900 text-[15px] tracking-tight mb-3">Favoritos</h3>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5 md:mx-0 md:px-0">
                {userFavorites.map(fav => (
                  <div key={fav.id} onClick={() => onSelectBusiness(fav)} className="flex-none w-20 group cursor-pointer text-center active:scale-95 transition-transform">
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden shadow-sm border-2 border-cream-50 ring-1 ring-black/[0.06] mb-1.5 bg-white group-hover:ring-brand-300 transition-all">
                      <img src={fav.image} className="w-full h-full object-cover" alt={fav.name} />
                    </div>
                    <h4 className="font-medium text-ink-700 text-[11px] truncate">{fav.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── NAVEGAÇÃO PRINCIPAL: segmented control ──────────────────────── */}
          <div className="px-5 md:px-8 pt-5 pb-1 sticky top-[65px] z-40 bg-cream-100/80 backdrop-blur-md -mx-0">
            <div className="relative flex bg-black/[0.05] rounded-2xl p-1 gap-1">
              {categories.map(cat => {
                const isActive = categoryFilter === cat.key;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                    className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150 active:scale-[0.97]"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="category-pill"
                        className="absolute inset-0 bg-white rounded-xl shadow-sm shadow-ink-900/5"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 ${isActive ? 'text-brand-600' : 'text-ink-500'}`}>
                      <Icon className="w-4 h-4" strokeWidth={2.25} />
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── BUSCA ──────────────────────── */}
          <div className="px-5 md:px-8 py-4">
            <div className="relative">
              <Search className="w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" strokeWidth={2.25} />
              <input
                type="text"
                placeholder="Item ou loja"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/[0.04] rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:bg-white focus:ring-[3px] focus:ring-brand-500/15 border border-transparent focus:border-brand-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* ── LISTA DE LOJAS ──────────────────────── */}
          <section className="px-5 md:px-8 pb-10">
            <h3 className="font-display font-semibold text-ink-900 text-[17px] tracking-tight mb-3.5 flex items-center gap-2">
              Lojas
              {searchTerm && <span className="text-[11px] font-medium text-ink-500 bg-black/[0.05] px-2 py-0.5 rounded-full">"{searchTerm}"</span>}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {filtered.length > 0 ? filtered.map(biz => {
                const isOpen = isStoreCurrentlyOpen(biz);
                return (
                  <div
                    key={biz.id}
                    onClick={() => onSelectBusiness(biz)}
                    className="group cursor-pointer bg-white rounded-[20px] overflow-hidden border border-black/[0.05] shadow-sm hover:shadow-lg hover:shadow-ink-900/8 active:scale-[0.98] transition-all duration-200 relative flex flex-col h-full"
                  >
                    {/* Capa da Loja */}
                    <div className="h-28 md:h-36 w-full relative overflow-hidden bg-cream-200">
                      <img src={biz.bannerUrl || biz.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={biz.name} loading="lazy" />

                      <div className="absolute top-3 left-3">
                        {isOpen ? (
                            <span className="bg-white/95 backdrop-blur-md text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aberto
                            </span>
                        ) : (
                            <span className="bg-ink-900/85 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/40" /> Fechado
                            </span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 pt-1 pb-4 relative flex-1 flex flex-col justify-between">
                      <div className="w-12 h-12 bg-white rounded-full p-0.5 shadow-md absolute -top-6 right-4 border border-black/[0.05]">
                        <img src={biz.image} className="w-full h-full rounded-full object-cover" alt="Logo" />
                      </div>

                      <div className="mt-3 pr-14">
                        <h3 className="font-display font-semibold text-[15px] text-ink-900 tracking-tight truncate">
                            {biz.name}
                        </h3>
                        <p className="text-[12px] font-medium text-ink-500 truncate mb-1.5">{biz.subCategory}</p>
                      </div>

                      <div className="flex items-center gap-2.5 mt-auto pt-2.5">
                        <div className="flex items-center gap-1 text-ink-700 font-semibold text-xs">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" strokeWidth={0} />
                          <span>{biz.rating}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-black/10" />
                        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
                          {biz.category === 'food' ? 'Delivery' : 'Serviços'}
                        </span>
                        {biz.loyalty?.ativo && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-black/10" />
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                                    Pontos
                                </span>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full py-16 text-center bg-white border border-black/[0.05] rounded-3xl">
                  <Search className="w-9 h-9 text-ink-400/50 mx-auto block mb-3" strokeWidth={1.75}/>
                  <h4 className="text-ink-900 font-display font-semibold text-base">Poxa, não encontramos!</h4>
                  <p className="text-ink-500 font-medium text-[13px] mt-1">Tente buscar por outro nome ou categoria.</p>
                </div>
              )}
            </div>
          </section>

          {/* ── RODAPÉ ──────────────────────── */}
          <footer className="px-5 md:px-8 pt-8 pb-6 flex flex-col items-center gap-3">
            <img src="/assets/web-app-manifest-512x512.png" alt="VIZI" className="w-9 h-9 object-contain opacity-80" />
            <a
              href="https://jhsolucoesdigitais.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-ink-400 hover:text-ink-600 transition-colors text-center"
            >
              Desenvolvido por <span className="font-semibold">JHS Soluções Digitais LTDA</span>
            </a>
          </footer>
        </main>

        {/* ── BOTÃO DE CARRINHO FLUTUANTE (Inferior) ──────────────── */}
        {cart.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-[calc(100%-40px)] animate-in slide-in-from-bottom-6">
            <button
              onClick={() => setView('cart')}
              className="w-full bg-brand-600 rounded-2xl p-4 flex justify-between items-center text-white shadow-xl shadow-brand-600/30 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/15 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm">
                  {cart.length}
                </div>
                <span className="font-semibold text-sm">Ver carrinho</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-base">R$ {cartTotal.toFixed(2)}</span>
              </div>
            </button>
          </div>
        )}
			<div className="px-5 md:px-8 pt-6">
              <InstallBanner currentCondo={currentCondo} />
            </div>
      </div>
    </div>
  );
}