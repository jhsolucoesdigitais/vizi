import React from 'react';
import { User, Business, ViewType } from '../types';
import { StatusBadge, PaymentStatusBadge } from '../components/shared';

interface MyOrdersViewProps {
  user: User;
  userOrders: any[];
  businesses: Business[];
  setView: (v: ViewType) => void;
}

export default function MyOrdersView({ user, userOrders, businesses, setView }: MyOrdersViewProps) {
  
  // ── LÓGICA DE FILTRO INFALÍVEL COM DATAS FORMATADAS ───────────────────────────
  const filteredOrders = userOrders.filter(o => {
    // 1. Pegamos a data de hoje no formato do Brasil (ex: "17/03/2026")
    const todayStr = new Date().toLocaleDateString('pt-BR');

    // 2. Formatamos a data de Criação do pedido para o mesmo padrão
    const createTime = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt;
    const createStr = createTime ? new Date(createTime).toLocaleDateString('pt-BR') : '';

    // 3. Formatamos a data de Finalização (usando o campo finishedAt correto do banco)
    // Usamos || o.updatedAt apenas como garantia caso pedidos muito antigos usem outro campo
    const finishTime = o.finishedAt?.seconds ? o.finishedAt.seconds * 1000 : (o.finishedAt || o.updatedAt);
    const finishStr = finishTime ? new Date(finishTime).toLocaleDateString('pt-BR') : createStr;

    // 4. Verificamos se foi criado HOJE ou finalizado HOJE
    const isCreatedToday = createStr === todayStr;
    const isFinishedToday = finishStr === todayStr;
    
    // 5. Verifica se o pedido já encerrou o ciclo (Concluído ou Cancelado)
    const statusStr = String(o.status || '').toLowerCase();
    const isFinalizado = statusStr.includes('concluído') || 
                         statusStr.includes('concluido') || 
                         statusStr.includes('cancelado') || 
                         statusStr.includes('cancelar');
                         
    const isStatusAtivo = !isFinalizado; // Se não está finalizado, é porque está ativo!

    // REGRA DE EXIBIÇÃO:
    // Mostrar se estiver ATIVO (Pendente, Preparo, Em rota...)
    // OU se foi CRIADO na data de HOJE
    // OU se foi FINALIZADO na data de HOJE
    return isStatusAtivo || isCreatedToday || isFinishedToday;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans text-left">
      <header className="p-6 pt-12 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-50 shadow-sm">
        <button 
          onClick={() => setView('dashboard')} 
          className="p-3 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-slate-800">Histórico Unidade</h1>
      </header>

      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Card da Unidade */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black italic text-lg shadow-lg">
            {user.block}{user.floor}{user.apartment}
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase italic">Pedidos do Apartamento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {filteredOrders.length} registros visíveis
            </p>
          </div>
        </div>

        {/* Lista de Pedidos */}
        {filteredOrders.length > 0 ? (
          filteredOrders
            .sort((a, b) => {
                // Ordenar usando finishedAt primeiro, caindo para createdAt
                const timeA = a.finishedAt?.seconds ? a.finishedAt.seconds * 1000 : (a.finishedAt || a.updatedAt || a.createdAt || 0);
                const timeB = b.finishedAt?.seconds ? b.finishedAt.seconds * 1000 : (b.finishedAt || b.updatedAt || b.createdAt || 0);
                return timeB - timeA;
            })
            .map((o) => {
              const statusStr = String(o.status || '').toLowerCase();
              const isFinalizado = statusStr.includes('concluí') || statusStr.includes('conclui') || statusStr.includes('cancel');

              // Verifica o tempo de finalização correto
              const finishTime = o.finishedAt?.seconds ? o.finishedAt.seconds * 1000 : (o.finishedAt || o.updatedAt);

              return (
                <div key={o.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-4">
                    <div>
                      <div className="flex flex-col mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Pedido: {new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          {/* Só mostra a data de "Finalizado" se o status for concluído ou cancelado */}
                          {isFinalizado && finishTime && (
                              <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${statusStr.includes('cancel') ? 'text-red-500' : 'text-emerald-500'}`}>
                                Finalizado: {new Date(finishTime).toLocaleDateString('pt-BR')}
                              </span>
                          )}
                      </div>
                      <h3 className="font-black text-slate-800 italic uppercase text-sm leading-tight">
                        {businesses.find(b => b.id === o.businessId)?.name || 'Loja não encontrada'}
                      </h3>
                      <p className="text-[8px] font-black text-slate-400 uppercase mt-1 flex items-center gap-1">
                        Por: {o.userName} 
                        {o.userTag && <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md font-black">{o.userTag}</span>}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl text-[11px] font-bold text-slate-600 space-y-2 border border-slate-100 shadow-inner">
                    {o.items.map((it: any, idx: number) => (
                      <p key={idx} className="flex justify-between items-center">
                        <span>{it.quantity}x {it.product.name}</span>
                        <span className="text-slate-400 font-black">R$ {(it.product.price * it.quantity).toFixed(2)}</span>
                      </p>
                    ))}
                  </div>

                  {o.observation && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl">
                      <p className="text-[9px] font-black uppercase text-amber-600 mb-1">Observação:</p>
                      <p className="text-amber-800 text-xs font-medium italic leading-relaxed">"{o.observation}"</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex flex-col">
                      <PaymentStatusBadge status={o.paymentStatus} />
                      <span className="text-[8px] font-black uppercase text-slate-300 mt-1.5 tracking-widest">
                        {o.paymentMethod || 'Não informado'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Total</p>
                      <p className="text-2xl font-black text-red-600 italic tracking-tighter leading-none">
                        R$ {o.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
            <span className="text-4xl block mb-4 grayscale opacity-20">🛒</span>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Sem pedidos para exibir</p>
            <p className="text-slate-300 text-[9px] font-bold uppercase mt-2">Pedidos finalizados em dias anteriores são arquivados.</p>
          </div>
        )}
      </div>
    </div>
  );
}