import React from 'react';
import { User, Business, CartItem } from '../types';
import { ViewType } from '../hooks/useAppState';
import { isStoreCurrentlyOpen } from '../components/shared';
import Swal from 'sweetalert2';

interface CartViewProps {
    user: User | null;
    selectedBusiness: Business | null;
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    appliedLoyalty: boolean;
    setAppliedLoyalty: (v: boolean) => void;
    setView: (v: ViewType) => void;
    finalizeOrder: () => void;
}

export default function CartView({
    user, selectedBusiness, cart, setCart, appliedLoyalty, setAppliedLoyalty, setView, finalizeOrder
}: CartViewProps) {
    
    const removeFromCart = (productId: string) => {
        setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, newQuantity: number) => {
        setCart(prevCart => prevCart.map(item => 
            item.product.id === productId ? { ...item, quantity: newQuantity } : item
        ));
    };

    if (!selectedBusiness || cart.length === 0) {
        Swal.fire({
            title: 'Carrinho Vazio',
            text: 'Escolha uma loja e adicione itens antes de acessar o carrinho.',
            icon: 'info',
            confirmButtonColor: '#0f172a'
        });
        setTimeout(() => setView('dashboard'), 0);
        return null; 
    }

    const subtotal = cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
    const allQuoteOnly = cart.every(i => i.product.isQuoteOnly);
    const hasQuoteOnly = cart.some(i => i.product.isQuoteOnly);
    const bizPointsBalance = user?.points?.[selectedBusiness.id] || 0;
    const canRedeem = selectedBusiness.loyalty?.ativo && bizPointsBalance >= selectedBusiness.loyalty.metaPontos;
    
    let rawDiscount = 0;
    if (appliedLoyalty && canRedeem) {
        rawDiscount = selectedBusiness.loyalty.tipoRecompensa === 'valor_fixo' 
            ? selectedBusiness.loyalty.valorRecompensa 
            : (subtotal * selectedBusiness.loyalty.valorRecompensa / 100);
    }
    
    const displayDiscount = Math.min(rawDiscount, subtotal); 
    const totalFinal = Math.max(0, subtotal - rawDiscount); 
    
    let pointsToEarn = 0;
    if (totalFinal > 0) {
        if (selectedBusiness.loyalty.tipoPontuacao === 'por_valor') {
            pointsToEarn = Math.floor(totalFinal);
        } else {
            let totalItemPoints = cart.reduce((acc, i) => acc + ((i.product.pontosGanhos || 0) * i.quantity), 0);
            if (appliedLoyalty && cart.length > 0) {
                totalItemPoints = Math.max(0, totalItemPoints - (cart[0].product.pontosGanhos || 0));
            }
            pointsToEarn = totalItemPoints;
        }
    }

    const isOpen = isStoreCurrentlyOpen(selectedBusiness);

    return (
        <div className="min-h-screen bg-cream-100 pb-20 md:p-6 animate-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="max-w-5xl mx-auto bg-cream-50 min-h-screen md:min-h-auto md:rounded-[32px] shadow-2xl shadow-ink-900/10 overflow-hidden relative flex flex-col border border-black/[0.05]">

                <header className="p-5 md:p-8 border-b border-black/[0.06] flex items-center justify-between bg-cream-50/90 backdrop-blur-md sticky top-0 z-40">
                    <div className="flex items-center gap-3.5">
                        <button onClick={() => setView('business')} className="w-10 h-10 bg-black/[0.04] hover:bg-black/[0.07] rounded-2xl flex items-center justify-center text-ink-700 active:scale-90 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h1 className="font-display text-lg md:text-xl font-semibold text-ink-900 tracking-tight">Seu Carrinho</h1>
                            <p className="text-[10px] font-semibold uppercase text-ink-500 tracking-widest">{selectedBusiness.name}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">

                        <div className="flex-1 w-full space-y-3">
                            <div className="flex items-center justify-between mb-1 px-1">
                                <h3 className="font-semibold text-ink-700 text-[13px] uppercase tracking-widest">Itens Selecionados</h3>
                                <button onClick={() => {
                                    Swal.fire({
                                        title: 'Limpar carrinho?',
                                        text: "Todos os itens serão removidos.",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonText: 'Sim, limpar',
                                        cancelButtonText: 'Cancelar',
                                        confirmButtonColor: '#ef4444'
                                    }).then((result) => { if (result.isConfirmed) setCart([]); });
                                }} className="text-[11px] font-semibold text-red-500 uppercase tracking-wider hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Limpar
                                </button>
                            </div>

                            <div className="bg-black/[0.025] rounded-[24px] p-2.5">
                                {cart.map((i, idx) => (
                                    <div key={i.product.id} className={`p-3.5 flex items-center gap-3.5 md:gap-5 ${idx !== cart.length - 1 ? 'border-b border-black/[0.05]' : ''}`}>
                                        <div className="relative shrink-0">
                                            <img src={i.product.image} className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl border border-black/[0.05]" />
                                            {i.product.isQuoteOnly && (
                                                <div className="absolute -top-2 -right-2 bg-brand-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                                                    CUSTOM
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-display font-semibold text-ink-900 text-sm md:text-[15px] leading-tight mb-1 truncate">
                                                {i.product.name}
                                            </h4>

                                            {i.product.isQuoteOnly ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-brand-600 font-semibold text-[11px] uppercase tracking-tight">
                                                        Sob Consulta
                                                    </p>
                                                    <p className="text-[10px] text-ink-400 font-medium leading-tight">
                                                        Lojista definirá o preço
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-ink-900 font-semibold text-sm">
                                                    R$ {i.product.price.toFixed(2)}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-black/[0.06] shadow-sm shrink-0">
                                            <button
                                                onClick={() => i.quantity > 1 ? updateQuantity(i.product.id, i.quantity - 1) : removeFromCart(i.product.id)}
                                                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-black/[0.04] rounded-lg text-ink-700 hover:bg-black/[0.08] active:scale-90 transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4"/>
                                                </svg>
                                            </button>

                                            <span className="w-5 text-center font-semibold text-ink-900 text-sm tabular-nums">
                                                {i.quantity}
                                            </span>

                                            <button
                                                onClick={() => updateQuantity(i.product.id, i.quantity + 1)}
                                                disabled={!i.product.isQuoteOnly && i.product.controlaEstoque && i.quantity >= i.product.estoqueAtual}
                                                className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg text-white transition-all active:scale-90
                                                    ${i.product.isQuoteOnly ? 'bg-brand-600 hover:bg-brand-700' : 'bg-ink-900 hover:bg-ink-700'}
                                                    ${(!i.product.isQuoteOnly && i.product.controlaEstoque && i.quantity >= i.product.estoqueAtual) ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-full lg:w-96 lg:sticky lg:top-28 space-y-4">
                            {selectedBusiness.loyalty?.ativo && cart.length > 0 && (
                                <div className="bg-emerald-600 rounded-[24px] p-6 text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-80 mb-1">Programa Fidelidade</p>
                                        <h4 className="font-display text-2xl font-bold tracking-tight mb-5">Saldo: {bizPointsBalance} pts</h4>
                                        <div className="bg-black/15 rounded-2xl p-3.5 flex justify-between items-center mb-5">
                                            <p className="text-[10px] font-semibold uppercase opacity-80">Ganhos previstos</p>
                                            <p className={`text-[15px] font-display font-bold ${pointsToEarn > 0 ? 'text-emerald-100' : 'text-white/60'}`}>+{pointsToEarn} pts</p>
                                        </div>
                                        {canRedeem ? (
                                            <button onClick={() => setAppliedLoyalty(!appliedLoyalty)} className={`w-full py-3.5 rounded-xl transition-all font-semibold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] ${appliedLoyalty ? 'bg-white text-emerald-700 shadow-sm' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                                                {appliedLoyalty ? 'Desconto Aplicado ✓' : 'Resgatar Benefício'}
                                            </button>
                                        ) : (
                                            <div className="w-full py-3 rounded-xl bg-black/15 text-center">
                                                <p className="text-[10px] font-medium opacity-80 tracking-wide">Faltam {selectedBusiness.loyalty.metaPontos - bizPointsBalance} pts</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-[24px] p-6 border border-black/[0.05] shadow-sm space-y-3">
                                <h3 className="font-semibold text-ink-700 text-[13px] uppercase tracking-widest mb-3">Resumo do Pedido</h3>
                                <div className="space-y-2.5 pb-5 border-b border-black/[0.06]">
                                    <div className="flex justify-between text-ink-500 font-medium text-[13px]"><span>Subtotal</span><span className="tabular-nums">R$ {subtotal.toFixed(2)}</span></div>
                                    {appliedLoyalty && displayDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-semibold text-[13px]"><span>Desconto Fidelidade</span><span className="tabular-nums">- R$ {displayDiscount.toFixed(2)}</span></div>
                                    )}
                                </div>
                                <div className="flex justify-between items-end pt-1">
                                    <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-widest leading-none mb-1">{allQuoteOnly ? 'Valor' : 'Total a Pagar'}</p>
                                    <p className="font-display text-3xl font-bold text-ink-900 tracking-tight leading-none tabular-nums">{allQuoteOnly ? 'Sob Consulta' : `R$ ${totalFinal.toFixed(2)}`}</p>
                                </div>
                                {hasQuoteOnly && (
                                    <p className="text-[11px] font-medium text-ink-500 -mt-1">Itens sob consulta terão o preço combinado diretamente com a loja.</p>
                                )}
                                <button onClick={finalizeOrder} disabled={cart.length === 0 || !isOpen} className="w-full mt-3 bg-brand-600 text-white font-display font-semibold py-4 rounded-2xl shadow-lg shadow-brand-600/25 uppercase tracking-widest text-xs hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {isOpen ? (allQuoteOnly ? 'Solicitar Orçamento' : (totalFinal === 0 ? 'Resgatar Agora' : 'Finalizar Pedido')) : 'Loja Fechada'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}