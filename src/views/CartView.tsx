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
        <div className="min-h-screen bg-slate-50 pb-20 md:p-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-5xl mx-auto bg-white min-h-screen md:min-h-auto md:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col border border-slate-100">
                
                <header className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('business')} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-200 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black italic uppercase text-slate-800">Seu Carrinho</h1>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{selectedBusiness.name}</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        
                        <div className="flex-1 w-full space-y-4">
                            <div className="flex items-center justify-between mb-2 px-2">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Itens Selecionados</h3>
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
                                }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Limpar Carrinho
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-[32px] p-3 border border-slate-100 shadow-inner">
                                {cart.map((i, idx) => (
                                    <div key={i.product.id} className={`p-4 flex items-center gap-4 md:gap-6 ${idx !== cart.length - 1 ? 'border-b border-slate-200/60' : ''}`}>
                                        <div className="relative">
                                            <img src={i.product.image} className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl shadow-sm border border-slate-200" />
                                            {i.product.isQuoteOnly && (
                                                <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg">
                                                    PERSONALIZADO
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 text-sm md:text-base italic leading-tight mb-1">
                                                {i.product.name}
                                            </h4>
                                            
                                            {i.product.isQuoteOnly ? (
                                                <div className="space-y-1">
                                                    <p className="text-blue-600 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1">
                                                        <span>📝</span> Sob Consulta
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">
                                                        Lojista definirá o preço
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-red-600 font-black text-sm">
                                                    R$ {i.product.price.toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 bg-white p-1 md:p-1.5 rounded-xl border border-slate-200 shadow-sm">
                                            <button 
                                                onClick={() => i.quantity > 1 ? updateQuantity(i.product.id, i.quantity - 1) : removeFromCart(i.product.id)} 
                                                className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/>
                                                </svg>
                                            </button>
                                            
                                            <span className="w-6 text-center font-black text-slate-800 text-sm">
                                                {i.quantity}
                                            </span>
                                            
                                            <button 
                                                onClick={() => updateQuantity(i.product.id, i.quantity + 1)} 
                                                disabled={!i.product.isQuoteOnly && i.product.controlaEstoque && i.quantity >= i.product.estoqueAtual}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-white transition-all 
                                                    ${i.product.isQuoteOnly ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}
                                                    ${(!i.product.isQuoteOnly && i.product.controlaEstoque && i.quantity >= i.product.estoqueAtual) ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-full lg:w-96 lg:sticky lg:top-32 space-y-6">
                            {selectedBusiness.loyalty?.ativo && cart.length > 0 && (
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 text-7xl opacity-20">🎁</div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-1">Programa Fidelidade</p>
                                                <h4 className="text-2xl font-black italic tracking-tighter">Saldo: {bizPointsBalance} pts</h4>
                                            </div>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex justify-between items-center mb-6">
                                            <div>
                                                <p className="text-[9px] font-bold uppercase opacity-80 mb-0.5">Ganhos previstos</p>
                                                <p className={`text-lg font-black italic ${pointsToEarn > 0 ? 'text-emerald-200' : 'text-slate-300'}`}>+{pointsToEarn} pts</p>
                                            </div>
                                        </div>
                                        {canRedeem ? (
                                            <button onClick={() => setAppliedLoyalty(!appliedLoyalty)} className={`w-full py-4 rounded-xl border-2 transition-all font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 ${appliedLoyalty ? 'bg-white text-emerald-800 border-white shadow-lg' : 'bg-transparent text-white border-white/40 hover:bg-white/10'}`}>
                                                {appliedLoyalty ? 'Desconto Aplicado ✓' : 'Resgatar Benefício'}
                                            </button>
                                        ) : (
                                            <div className="w-full py-3 rounded-xl bg-black/20 text-center border border-white/10">
                                                <p className="text-[9px] font-bold uppercase opacity-80 tracking-widest">Faltam {selectedBusiness.loyalty.metaPontos - bizPointsBalance} pts</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-lg space-y-4">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">Resumo do Pedido</h3>
                                <div className="space-y-3 pb-6 border-b border-slate-100">
                                    <div className="flex justify-between text-slate-500 font-bold uppercase text-[11px]"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                                    {appliedLoyalty && displayDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-black uppercase text-[11px]"><span>Desconto Fidelidade</span><span>- R$ {displayDiscount.toFixed(2)}</span></div>
                                    )}
                                </div>
                                <div className="flex justify-between items-end pt-2">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total a Pagar</p>
                                    <p className="text-3xl font-black text-red-600 italic tracking-tighter leading-none">R$ {totalFinal.toFixed(2)}</p>
                                </div>
                                <button onClick={finalizeOrder} disabled={cart.length === 0 || !isOpen} className="w-full mt-4 bg-red-600 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl shadow-red-500/30 uppercase tracking-widest text-xs hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50">
                                    {isOpen ? (totalFinal === 0 ? 'Resgatar Agora' : 'Finalizar Pedido') : 'Loja Fechada'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}