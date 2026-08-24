import React from 'react';
import { User, Business, ViewType } from '../types';
import { StatusBadge, PaymentStatusBadge } from '../components/shared';
import NotificationPrompt from '../components/NotificationPrompt';

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
    <div className="min-h-screen bg-cream-100 pb-10 font-sans text-left">
      <header className="p-5 pt-11 bg-cream-50/90 backdrop-blur-md border-b border-black/[0.06] flex items-center gap-3.5 sticky top-0 z-50">
        <button
          onClick={() => setView('dashboard')}
          className="p-2.5 bg-black/[0.04] rounded-xl text-ink-600 hover:bg-black/[0.07] active:scale-90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="font-display text-lg font-semibold tracking-tight text-ink-900">Histórico Unidade</h1>
      </header>

      <div className="p-5 space-y-4 max-w-2xl mx-auto">
        <NotificationPrompt />

        {/* Card da Unidade */}
        <div className="bg-white p-5 rounded-[24px] border border-black/[0.05] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-display font-semibold text-sm shadow-sm shadow-brand-600/25">
            {user.block}{user.floor}{user.apartment}
          </div>
          <div>
            <h3 className="font-semibold text-ink-900 text-[13px]">Pedidos do Apartamento</h3>
            <p className="text-[11px] text-ink-500 font-medium">
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
                <div key={o.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-black/[0.05] space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-start border-b border-black/[0.05] pb-3.5">
                    <div>
                      <div className="flex flex-col mb-1.5">
                          <span className="text-[10px] font-medium text-ink-400 tracking-tight">
                            Pedido: {new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                          {/* Só mostra a data de "Finalizado" se o status for concluído ou cancelado */}
                          {isFinalizado && finishTime && (
                              <span className={`text-[10px] font-medium mt-0.5 ${statusStr.includes('cancel') ? 'text-red-500' : 'text-emerald-600'}`}>
                                Finalizado: {new Date(finishTime).toLocaleDateString('pt-BR')}
                              </span>
                          )}
                      </div>
                      <h3 className="font-display font-semibold text-ink-900 text-[15px] leading-tight">
                        {businesses.find(b => b.id === o.businessId)?.name || 'Loja não encontrada'}
                      </h3>
                      <p className="text-[10px] font-medium text-ink-400 mt-1 flex items-center gap-1.5">
                        Por: {o.userName}
                        {o.userTag && <span className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded-md font-semibold">{o.userTag}</span>}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div className="bg-black/[0.025] p-4 rounded-2xl text-[12px] font-medium text-ink-700 space-y-1.5">
                    {o.items.map((it: any, idx: number) => (
                      <p key={idx} className="flex justify-between items-center">
                        <span>{it.quantity}x {it.product.name}</span>
                        <span className="text-ink-500 font-semibold tabular-nums">R$ {(it.product.price * it.quantity).toFixed(2)}</span>
                      </p>
                    ))}
                  </div>

                  {o.observation && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-3.5 rounded-xl">
                      <p className="text-[10px] font-semibold uppercase text-amber-600 mb-1">Observação</p>
                      <p className="text-amber-800 text-[13px] font-medium leading-relaxed">"{o.observation}"</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex flex-col">
                      <PaymentStatusBadge status={o.paymentStatus} />
                      <span className="text-[10px] font-medium text-ink-400 mt-1.5">
                        {o.paymentMethod || 'Não informado'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-ink-400 mb-0.5">Total</p>
                      <p className="font-display text-xl font-bold text-ink-900 tracking-tight leading-none tabular-nums">
                        R$ {o.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
        ) : (
          <div className="py-16 text-center bg-white rounded-[24px] border border-dashed border-black/10">
            <p className="text-ink-500 font-semibold text-[13px]">Sem pedidos para exibir</p>
            <p className="text-ink-400 text-[11px] font-medium mt-1.5">Pedidos finalizados em dias anteriores são arquivados.</p>
          </div>
        )}
      </div>
    </div>
  );
}