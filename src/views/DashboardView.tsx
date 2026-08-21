import React, { useMemo } from 'react';
import { User, Business, Product, CartItem, CategoryType, Condominio } from '../types';
import { ViewType } from '../hooks/useAppState';
import { isStoreCurrentlyOpen } from '../components/shared';
import { Search, MapPin, ShoppingCart, LogOut, RefreshCw, ChevronRight, UtensilsCrossed, Wrench, LayoutGrid,ClipboardList } from 'lucide-react';
import InstallBanner from '../components/InstallBanner';
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

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:p-6 font-sans text-left">
      
      {/* Container Principal Mobile/Desktop */}
      <div className="max-w-[480px] md:max-w-4xl mx-auto bg-white min-h-screen md:min-h-[calc(100vh-3rem)] md:rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col relative border-x border-slate-100">

        {/* ── HEADER (Endereço e Ações) ──────────────────────── */}
        <header className="bg-white px-5 md:px-8 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3 max-w-[55%] md:max-w-[70%]">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex flex-col items-start overflow-hidden leading-tight">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate w-full">
                {currentCondo?.name}
              </span>
              <span className="font-black text-slate-900 text-sm truncate w-full flex items-center gap-1">
                Apto {user.block}{user.floor}{user.apartment}
                <ChevronRight className="w-4 h-4 text-red-500" />
              </span>
            </div>
          </div>
		
		 
          <div className="flex items-center gap-0.5 md:gap-2 relative z-10">
            {/* Atualizar */}
            <button onClick={onRefresh} disabled={isRefreshing} className={`p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all ${isRefreshing ? 'animate-spin text-red-500' : ''}`} title="Atualizar App">
              <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Histórico de Pedidos */}
				<button 
				  onClick={async () => { 
					setNotificationCount(0); 
					if (onRefreshOrders) {
					  await onRefreshOrders(); 
					}
					setView('my-orders'); 
				  }} 
				  className="relative p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all" 
				  title="Meus Pedidos"
				>
				  {notificationCount > 0 && (
					<span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
					  {notificationCount}
					</span>
				  )}
				  <ClipboardList className="w-5 h-5" strokeWidth={2.5} />
				</button>

            {/* Botão de Carrinho (Header) */}
            <button onClick={() => setView('cart')} className="relative p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all" title="Ver Carrinho">
              {cart.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                  {cart.length}
                </span>
              )}
              <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
            </button>
            
            {/* Sair */}
            <button onClick={onLogout} className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Sair da Conta">
              <LogOut className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </header>

 
        <main className="animate-in fade-in duration-700 overflow-y-auto custom-scrollbar pb-32 bg-slate-50">

          {/* ── Bloco Topo: Banner + Busca + Categorias (Fundo Branco) ──────────────── */}
          <div className="bg-white rounded-b-[24px] shadow-sm mb-6">
            
			
			
            {/* 1. BANNER PROMOCIONAL VIBRANTE (No Topo) */}
            <div className="px-5 md:px-8 pt-6 pb-2">
              <div onClick={() => setView('landing-seller')} className="w-full bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl p-6 flex items-center justify-between overflow-hidden relative shadow-lg shadow-red-500/20 cursor-pointer group hover:scale-[1.02] transition-transform duration-300">
                <div className="relative z-10 text-left">
                  <span className="bg-white text-red-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block shadow-sm">Seja Parceiro</span>
                  <h3 className="text-white text-xl font-black italic tracking-tight leading-tight mb-1">
                    Vende no condomínio?
                  </h3>
                  <p className="text-white/90 text-xs font-medium mb-3 max-w-[200px]">
                    Crie sua loja digital e venda para seus vizinhos.
                  </p>
                  <span className="text-white text-xs font-bold underline decoration-2 underline-offset-4 flex items-center gap-1">
                    Saiba mais <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-20 transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  🍔
                </div>
              </div>
            </div>
			
			{/* ── FAVORITOS (Cards Arredondados) ──────────────────────── */}
          {userFavorites.length > 0 && (
            <div className="mb-8 bg-white py-6 rounded-3xl shadow-sm mx-5 md:mx-8 px-5 border border-slate-100">
              <div className="flex items-center gap-2 text-left mb-4">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">Favoritos</h3>
                <span className="text-red-500">❤️</span>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {userFavorites.map(fav => (
                  <div key={fav.id} onClick={() => onSelectBusiness(fav)} className="flex-none w-24 md:w-28 group cursor-pointer text-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full overflow-hidden relative shadow-sm border border-slate-100 mb-2 p-0.5 bg-white group-hover:border-red-500 transition-colors">
                      <img src={fav.image} className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500" alt={fav.name} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs truncate group-hover:text-red-600 transition-colors tracking-tight">{fav.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}
 
            {/* 3. CATEGORIAS (Grid estilo App) */}
            <div className="px-5 md:px-8 pb-6">
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setCategoryFilter('food')} className={`flex flex-col items-center justify-center text-center gap-2 p-3 rounded-2xl transition-all border-2 ${categoryFilter === 'food' ? 'border-red-500 bg-red-50 shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${categoryFilter === 'food' ? 'bg-red-500 text-white' : 'bg-white text-red-500 shadow-sm'}`}>
                    <UtensilsCrossed className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-tight ${categoryFilter === 'food' ? 'text-red-600' : 'text-slate-600'}`}>Delivery</span>
                </button>
                
                <button onClick={() => setCategoryFilter('service')} className={`flex flex-col items-center justify-center text-center gap-2 p-3 rounded-2xl transition-all border-2 ${categoryFilter === 'service' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${categoryFilter === 'service' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                    <Wrench className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-tight ${categoryFilter === 'service' ? 'text-blue-700' : 'text-slate-600'}`}>Serviços</span>
                </button>
                
                <button onClick={() => setCategoryFilter('all')} className={`flex flex-col items-center justify-center text-center gap-2 p-3 rounded-2xl transition-all border-2 ${categoryFilter === 'all' ? 'border-slate-800 bg-slate-100 shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${categoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                    <LayoutGrid className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-tight ${categoryFilter === 'all' ? 'text-slate-900' : 'text-slate-600'}`}>Tudo</span>
                </button>
              </div>
            </div>
          </div>
          {/* ── Fim do Bloco Topo ──────────────── */}

          {/* 2. BARRA DE BUSCA */}
            <div className="px-5 md:px-8 py-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Item ou loja"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 rounded-xl pl-12 pr-4 py-4 text-sm font-bold text-slate-800 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-red-100 border border-transparent focus:border-red-200 outline-none transition-all shadow-sm"
                />
                <Search className="w-5 h-5 absolute left-4 top-4 text-red-500" strokeWidth={2.5} />
              </div>
            </div>

          {/* ── LISTA DE LOJAS (Cards App Style) ──────────────────────── */}
          <section className="px-5 md:px-8 pb-10">
            <h3 className="font-black text-slate-800 text-xl tracking-tight mb-4 flex items-center gap-2">
              Lojas
              {searchTerm && <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">"{searchTerm}"</span>}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {filtered.length > 0 ? filtered.map(biz => {
                const isOpen = isStoreCurrentlyOpen(biz);
                return (
                  <div
                    key={biz.id}
                    onClick={() => onSelectBusiness(biz)}
                    className="group cursor-pointer bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-100 transition-all duration-300 relative flex flex-col h-full"
                  >
                    {/* Capa da Loja */}
                    <div className="h-28 md:h-36 w-full relative overflow-hidden bg-slate-100">
                      <img src={biz.bannerUrl || biz.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={biz.name} loading="lazy" />
                      
                      {/* Selo Aberto/Fechado */}
                      <div className="absolute top-3 left-3">
                        {isOpen ? (
                            <span className="bg-white/90 backdrop-blur-md text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aberto
                            </span>
                        ) : (
                            <span className="bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Fechado
                            </span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-4 pt-1 pb-5 relative flex-1 flex flex-col justify-between">
                      {/* Logo Redonda Sobreposta */}
                      <div className="w-14 h-14 bg-white rounded-full p-1 shadow-md absolute -top-7 right-4 border border-slate-100 group-hover:-translate-y-1 transition-transform">
                        <img src={biz.image} className="w-full h-full rounded-full object-cover" alt="Logo" />
                      </div>
                      
                      <div className="mt-3 pr-16">
                        <h3 className="font-black text-lg text-slate-800 tracking-tight truncate group-hover:text-red-600 transition-colors">
                            {biz.name}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 truncate mb-2">{biz.subCategory}</p>
                      </div>

                      {/* Rodapé do Card: Nota e Tempo/Categoria */}
                      <div className="flex items-center gap-3 mt-auto pt-3">
                        <div className="flex items-center gap-1 text-amber-500 font-black text-xs">
                          <span>★</span>
                          <span className="text-slate-700">{biz.rating}</span>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {biz.category === 'food' ? 'Delivery' : 'Serviços'}
                        </span>
                        {biz.loyalty?.ativo && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-1">
                                    🎁 Pontos
                                </span>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="col-span-full py-16 text-center bg-white border border-slate-100 rounded-3xl shadow-sm">
                  <Search className="w-10 h-10 text-slate-300 mx-auto block mb-3" strokeWidth={2}/>
                  <h4 className="text-slate-800 font-black text-lg">Poxa, não encontramos!</h4>
                  <p className="text-slate-500 font-medium text-sm mt-1">Tente buscar por outro nome ou categoria.</p>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ── BOTÃO DE CARRINHO FLUTUANTE (Inferior) ──────────────── */}
        {cart.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-[calc(100%-40px)] animate-in slide-in-from-bottom-6">
            <button
              onClick={() => setView('cart')}
              className="w-full bg-red-600 rounded-2xl p-4 flex justify-between items-center text-white shadow-xl shadow-red-500/30 active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-700/50 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                  {cart.length}
                </div>
                <span className="font-black text-sm">Ver carrinho</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base">R$ {cartTotal.toFixed(2)}</span>
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