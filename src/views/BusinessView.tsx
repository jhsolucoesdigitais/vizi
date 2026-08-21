import React, { useState, useEffect } from 'react';
import { User, Business, Product, CartItem, Review } from '../types';
import { ViewType } from '../hooks/useAppState';
import { Stars, isStoreCurrentlyOpen } from '../components/shared';
import { ProductDetailModal, StoreProductList } from '../components/StoreProducts';
import { ChevronLeft, Share2, Heart, Star, MessageSquare, Info, Smartphone, Instagram, Facebook, Copy, ShieldAlert, ArrowLeft, Store } from 'lucide-react';
import Swal from 'sweetalert2';
 
// ─────────────────────────────────────────────
//  Tipos Alinhados com o App.tsx
// ─────────────────────────────────────────────

interface BusinessViewProps {
  user:                 User | null;
  selectedBusiness:     Business;
  allProducts?:         Product[];
  cart:                 CartItem[];
  appliedLoyalty?:      any;
  setAppliedLoyalty?:   any;
  productDetailModal:   Product | null;
  setProductDetailModal:(p: Product | null) => void;
  showAboutModal:       boolean;
  setShowAboutModal:    (v: boolean) => void;

  setView:              (v: ViewType) => void;
  
  onAddToCart:          (p: Product) => void;
  onClearCart?:         () => void;
  onFinalizeOrder?:     () => void;
  onAddReview?:         () => void;
  handleAddReview?:     () => void;
  onToggleFavorite:     (e: React.MouseEvent, bizId: string) => void;
  onShareStore?:        (b: Business) => void;
  onRefreshOrders?: () => Promise<void>;
}

// ─────────────────────────────────────────────
//  Utilitários
// ─────────────────────────────────────────────

function parseReviews(raw: any): Review[] {
  try {
    if (typeof raw === 'string') return JSON.parse(raw || '[]');
    if (Array.isArray(raw)) return raw;
  } catch (e) {
    console.error('Erro no parse das avaliações:', e);
  }
  return [];
}

// ─────────────────────────────────────────────
//  Sub-componente — Modal "Sobre a Loja"
// ─────────────────────────────────────────────

function AboutModal({ business, onClose }: { business: Business; onClose: () => void; }) {
  return (
    // 👇 Alterado para 'items-center p-4' para ficar sempre flutuante e centrado com margens
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* 👇 Alterado para rounded-[32px] (arredondado em todos os cantos) e animação de zoom */}
      <div className="bg-white w-full max-w-md rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh] relative">
        
        {/* Banner da Loja */}
        <div className="relative h-32 md:h-40 bg-slate-100 shrink-0">
          <img src={business.bannerUrl || business.image} className="w-full h-full object-cover opacity-90" alt="Banner" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md w-8 h-8 flex items-center justify-center rounded-full text-white shadow-lg transition-all z-10">
            ✕
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="px-6 md:px-8 pb-6 md:pb-8 -mt-12 md:-mt-16 relative overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">
          
          {/* Logo Flutuante - Centralizada */}
          <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-full p-1.5 shadow-xl border-4 border-white relative z-10 mb-4 shrink-0">
            <img src={business.image} className="w-full h-full object-cover rounded-full" alt="Logo" />
          </div>

          {/* Títulos - Forçados a centralizar ocupando 100% do espaço */}
          <h3 className="text-2xl font-black text-center text-slate-900 tracking-tight leading-none mb-1 w-full">{business.name}</h3>
          <p className="text-[10px] font-black text-center text-red-500 uppercase tracking-[0.2em] mb-6 w-full">{business.subCategory}</p>

          {/* Bloco de Sobre Nós */}
          <div className="w-full bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col items-center text-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 text-blue-500">
                <Info className="w-5 h-5" />
             </div>
             <div className="w-full">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Sobre Nós</p>
                <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line">
                  {business.description || 'Nenhuma descrição informada por este parceiro.'}
                </p>
             </div>
          </div>

          <button onClick={onClose} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-900/20">
            Voltar para a Loja
          </button>
        </div>
        
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────
//  Componente principal
// ─────────────────────────────────────────────

export default function BusinessView({
  user, selectedBusiness, cart, productDetailModal, showAboutModal,
  setView, setProductDetailModal, setShowAboutModal, onAddToCart,
  onToggleFavorite, onAddReview, handleAddReview, onShareStore, onClearCart, onFinalizeOrder, onRefreshOrders
}: BusinessViewProps) {

  // 👇 VERIFICAÇÃO DE VITRINE E ESTADO DA ABA
  const isVitrine = selectedBusiness?.tipoPlano === 'vitrine';
  
  // Se for vitrine, força a aba a ser 'avaliacoes' logo de início
  const [activeTab, setActiveTab] = useState<'produtos' | 'avaliacoes'>(isVitrine ? 'avaliacoes' : 'produtos');

  // Garante que, se a loja mudar, a aba se ajuste
  useEffect(() => {
    if (isVitrine) setActiveTab('avaliacoes');
    else setActiveTab('produtos');
  }, [isVitrine, selectedBusiness?.id]);

  const bizPoints    = user?.points?.[selectedBusiness.id] || 0;
  const hasReward    = selectedBusiness.loyalty?.ativo && bizPoints >= selectedBusiness.loyalty.metaPontos;
  const isOpen       = isStoreCurrentlyOpen(selectedBusiness);
  const isFavorited  = user?.favorites?.includes(selectedBusiness.id) ?? false;
  const cartTotal    = cart.reduce((a, i) => a + (i.product.price * i.quantity), 0);
  const reviews      = parseReviews(selectedBusiness.reviews);

  const hasWhatsapp  = !!selectedBusiness.social?.whatsapp?.trim();
  const hasInstagram = !!selectedBusiness.social?.instagram?.trim();
  const hasPix       = !!selectedBusiness.pagamento?.chavePix?.trim();

  // ── BLOQUEIO DE INADIMPLÊNCIA ──
  if (selectedBusiness?.licenseStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20">
          <ShieldAlert size={64} className="text-red-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black italic text-white uppercase mb-2">
          Acesso Suspenso
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-sm mb-8">
          Esta loja encontra-se temporariamente indisponível. 
        </p>
        <button 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95"
        >
          <ArrowLeft size={16} /> Voltar ao Início
        </button>
      </div>
    );
  }

  const handleCopyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    Swal.fire({
      title: 'Chave copiada!',
      text: 'Agora é só colar no app do seu banco.',
      icon: 'success',
      toast: true,  
      position: 'top-end',  
      showConfirmButton: false, 
      timer: 3000,  
      timerProgressBar: true,
      customClass: { popup: 'rounded-2xl shadow-xl border border-slate-100 font-sans' }
    });
  };

  const onShareClick = () => {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('storeId', selectedBusiness.id);
    if (onShareStore) {
      onShareStore(selectedBusiness);
    } else if (navigator.share) {
      navigator.share({
        title: selectedBusiness.name,
        text: `Peça de ${selectedBusiness.name} no nosso App do Condomínio!`,
        url: shareUrl.toString()
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl.toString());
      alert("Link copiado para compartilhar!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:py-6 font-sans text-left pb-32">

      {showAboutModal && (
        <AboutModal business={selectedBusiness} onClose={() => setShowAboutModal(false)} />
      )}

      {/* Só renderiza o modal de produtos se NÃO for vitrine */}
      {!isVitrine && productDetailModal && (
        <ProductDetailModal
          product={productDetailModal}
          onClose={() => setProductDetailModal(null)}
          onAdd={(p) => { onAddToCart(p); setProductDetailModal(null); }}
          isOpen={isOpen}
        />
      )}

      <div className="max-w-[480px] md:max-w-4xl mx-auto bg-white min-h-screen md:min-h-[calc(100vh-3rem)] md:rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col relative border-x border-slate-100">

        {/* ── BANNER E AÇÕES NO TOPO ──────────────────────── */}
        <div className="relative h-48 md:h-64 w-full shrink-0 bg-slate-200">
          <img src={selectedBusiness.bannerUrl || selectedBusiness.image} className="w-full h-full object-cover" alt="Banner da Loja" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/20" />

          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <button onClick={() => setView('dashboard')} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:scale-105 transition-transform shadow-lg">
              <ChevronLeft strokeWidth={3} className="w-6 h-6 -ml-0.5" />
            </button>
            <div className="flex gap-2">
              <button onClick={onShareClick} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 hover:scale-105 transition-transform shadow-lg">
                <Share2 className="w-5 h-5" />
              </button>
              <button onClick={(e) => onToggleFavorite(e, selectedBusiness.id)} className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-105 ${isFavorited ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-700'}`}>
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD DE PERFIL DA LOJA ──────────────────────── */}
        <div className="px-5 relative z-20 shrink-0 -mt-12 md:-mt-16">
          <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center relative pt-14 md:pt-16">

            <div className="absolute -top-12 md:-top-14 left-1/2 -translate-x-1/2 w-24 h-24 md:w-28 md:h-28 bg-white rounded-full p-1.5 shadow-lg border border-slate-100">
              <img src={selectedBusiness.image} className="w-full h-full rounded-full object-cover" alt="Logo" />
            </div>

            <button onClick={() => setShowAboutModal(true)} className="absolute top-4 right-4 w-10 h-10 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full flex items-center justify-center transition-colors shadow-sm" title="Ver mais informações">
               <Info className="w-5 h-5" />
            </button>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1 w-full truncate px-8">
              {selectedBusiness.name}
            </h1>
            <p className="text-[11px] font-bold text-red-500 uppercase tracking-[0.2em] w-full truncate px-4">
              {selectedBusiness.subCategory}
            </p>

            <div className="flex items-center justify-center gap-3 mt-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 inline-flex">
              <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span>{selectedBusiness.rating}</span>
                <span className="text-slate-400 text-[10px] ml-0.5">({reviews.length})</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              {isOpen ? (
                 <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aberto
                 </span>
              ) : (
                 <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Fechado
                 </span>
              )}
            </div>

            {!isOpen && (
              <div className="mt-4 w-full bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  ⚠️ {selectedBusiness.status.mensagemAusencia || 'Fechado no momento.'}
                </p>
              </div>
            )}
            
            {/* Fidelidade: Ocultado se for vitrine */}
            {!isVitrine && selectedBusiness.loyalty?.ativo && (
              <div className={`mt-4 w-full p-4 rounded-2xl flex justify-between items-center ${hasReward ? 'bg-emerald-50 border border-emerald-100' : 'bg-purple-50 border border-purple-100'}`}>
                 <div className="flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${hasReward ? 'bg-emerald-200' : 'bg-purple-200'}`}>
                       🎁
                    </div>
                    <div>
                       <p className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 ${hasReward ? 'text-emerald-600' : 'text-purple-600'}`}>Fidelidade</p>
                       <h4 className={`text-sm font-black ${hasReward ? 'text-emerald-700' : 'text-purple-700'}`}>
                         {bizPoints} / {selectedBusiness.loyalty.metaPontos} Pontos
                       </h4>
                    </div>
                 </div>
                 {hasReward && (
                    <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse shadow-md">Liberado</span>
                 )}
              </div>
            )}

            <div className="flex justify-center flex-wrap gap-2 mt-5 w-full">
              {hasWhatsapp && (
                <a href={`https://wa.me/${selectedBusiness.social.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[100px] max-w-[140px] justify-center bg-emerald-50 text-emerald-600 px-3 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors border border-emerald-100/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>
                  WhatsApp
                </a>
              )}
              {hasInstagram && (
                <a href={`https://instagram.com/${selectedBusiness.social.instagram?.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex-1 min-w-[100px] max-w-[140px] justify-center bg-pink-50 text-pink-600 px-3 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-pink-100 transition-colors border border-pink-100/50">
                  <Instagram className="w-4 h-4" /> Insta
                </a>
              )}
              {hasPix && (
                <button onClick={() => handleCopyPix(selectedBusiness.pagamento.chavePix)} className="flex-1 min-w-[100px] max-w-[140px] justify-center bg-slate-50 text-slate-600 px-3 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors border border-slate-200/50">
                  <Copy className="w-4 h-4" /> Pix
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── NAVEGAÇÃO POR ABAS ──────────────────────── */}
        <div className="px-5 mt-4 shrink-0 bg-white sticky top-0 z-30 pt-2 shadow-sm border-b border-slate-100">
           <div className="flex gap-6">
              {/* Oculta o Cardápio se for vitrine */}
              {!isVitrine && (
                <button onClick={() => setActiveTab('produtos')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'produtos' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                   Cardápio
                   {activeTab === 'produtos' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full" />}
                </button>
              )}
              
              {/* 👇 BOTÃO DE AVALIAÇÕES QUE HAVIA SUMIDO! */}
              <button onClick={() => setActiveTab('avaliacoes')} className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'avaliacoes' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                 Avaliações
                 {activeTab === 'avaliacoes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full" />}
              </button>
           </div>
        </div>

        {/* ── CONTEÚDO PRINCIPAL ──────────────────────── */}
         <div className="flex-1 bg-slate-50">
            {activeTab === 'produtos' && !isVitrine ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <StoreProductList
                      selectedBusiness={selectedBusiness}
                      cart={cart}
                      onAdd={onAddToCart}
                      onShowDetails={setProductDetailModal}
                      onShowAbout={setShowAboutModal}
                    />
                </div>
            ) : (
                <div className="p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                    

                   <button 
                     onClick={() => {
                       if (onAddReview) {
                         onAddReview();
                       } else if (handleAddReview) {
                         handleAddReview();
                       } else {
                         alert("Função de avaliação ainda não configurada no useOrderHandlers.ts");
                       }
                     }} 
                     className="w-full mb-4 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                   >
                     <Star className="w-4 h-4 fill-white" />
                     Avaliar esta Loja
                   </button>

                   {reviews.length > 0 ? reviews.sort((a,b) => b.date - a.date).map((r, i) => (
                      <div key={i} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className="font-black text-slate-800 text-sm truncate max-w-[150px]">{r.userName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                  {new Date(r.date).toLocaleDateString('pt-BR')}
                               </p>
                            </div>
                            <div className="bg-amber-50 text-amber-500 px-2 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                               ★ {r.rating}
                            </div>
                         </div>
                         
                      
                         {r.comment && r.comment.trim() !== '' && (
                            <p className="text-slate-600 text-sm font-medium italic leading-relaxed">"{r.comment}"</p>
                         )}
                         
                      </div>
                   )) : (
                      <div className="py-16 text-center bg-white border border-slate-100 rounded-[24px]">
                         <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                         <p className="text-slate-800 font-black text-sm">Sem avaliações</p>
                         <p className="text-slate-500 text-xs font-medium mt-1">Seja o primeiro a avaliar!</p>
                      </div>
                   )}
                </div>
            )}
        </div>

        {/* ── BOTÃO DE CARRINHO FLUTUANTE ──────────────── */}
        {/* Escondido se for vitrine */}
        {!isVitrine && cart.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-[calc(100%-40px)] md:max-w-sm animate-in slide-in-from-bottom-6">
            <button
              onClick={() => setView('cart')}
              className="w-full bg-red-600 rounded-2xl p-4 flex justify-between items-center text-white shadow-xl shadow-red-500/30 active:scale-95 transition-all group border border-red-500"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-700/50 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-105 transition-transform">
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

      </div>
    </div>
  );
}