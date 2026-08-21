import React from 'react';
import { Business, OrderStatus } from '../types';

// ─────────────────────────────────────────────
//  Utilitários de lógica
// ─────────────────────────────────────────────

/**
 * Verifica se a loja está aberta agora com base em businessHours e status.aberto
 */
export const isStoreCurrentlyOpen = (biz: Business): boolean => {
  if (!biz.status.aberto) return false;
  if (!biz.businessHours) return true;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDayKey = days[now.getDay()];
  const schedule = biz.businessHours[currentDayKey];

  if (!schedule.enabled) return false;
  if (schedule.is24h) return true;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return currentTime >= schedule.open && currentTime <= schedule.close;
};

/**
 * Retorna a data local no formato ISO (YYYY-MM-DD), sem conversão UTC.
 */
export const getLocalISODate = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().split('T')[0];
};

/**
 * Retorna o label de status do pedido de acordo com a categoria (serviço ou produto).
 */
export const getStatusLabel = (status: OrderStatus, category: string): string => {
  const isService = category === 'service';

  const labels: Record<OrderStatus, string> = {
    pendente:                        isService ? 'Solicitação'          : 'Pendente',
    preparando:                      isService ? 'Em Execução'          : 'Em Preparo',
    saiu_entrega:                    isService ? 'Técnico a Caminho'    : 'Saiu p/ Entrega',
    entregue_aguardando_pagamento:   isService ? 'Serviço Finalizado'   : 'Entregue (Aguard. Pagto)',
    concluido:                       'Concluído',
    cancelado:                       'Cancelado',
  };

  return labels[status] || status;
};

// ─────────────────────────────────────────────
//  Componentes visuais compartilhados
// ─────────────────────────────────────────────

/**
 * Overlay de carregamento — fullScreen ou relativo ao container pai.
 */
export const LoadingOverlay = ({
  fullScreen = false,
  type = 'customer',
}: {
  fullScreen?: boolean;
  type?: 'customer' | 'admin';
}) => (
  <div
    className={`
      ${fullScreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-10'}
      flex flex-col items-center justify-center
      ${type === 'admin' ? 'bg-slate-900/30 backdrop-blur-[2px]' : 'bg-white/80 backdrop-blur-[2px]'}
      animate-in fade-in duration-300
    `}
  >
    <div
      className={`
        w-12 h-12 border-4 rounded-full animate-spin mb-4 shadow-xl
        ${type === 'admin' ? 'border-slate-400 border-t-white' : 'border-red-100 border-t-red-600'}
      `}
    />
    <p
      className={`
        text-[10px] font-black uppercase tracking-[0.3em] animate-pulse
        ${type === 'admin' ? 'text-white' : 'text-gray-400'}
      `}
    >
      Sincronizando...
    </p>
  </div>
);

/**
 * Badge colorido para o status do pedido.
 */
export const StatusBadge = ({
  status,
  category = 'food',
}: {
  status: OrderStatus;
  category?: string;
}) => {
  const configs: Record<OrderStatus, { bg: string; text: string }> = {
    pendente:                       { bg: 'bg-orange-100', text: 'text-orange-600' },
    preparando:                     { bg: 'bg-blue-100',   text: 'text-blue-600'   },
    saiu_entrega:                   { bg: 'bg-purple-100', text: 'text-purple-600' },
    entregue_aguardando_pagamento:  { bg: 'bg-cyan-100',   text: 'text-cyan-700'   },
    concluido:                      { bg: 'bg-green-100',  text: 'text-green-600'  },
    cancelado:                      { bg: 'bg-red-100',    text: 'text-red-600'    },
  };

  const cfg   = configs[status] || configs.pendente;
  const label = getStatusLabel(status, category);

  return (
    <span
      className={`
        ${cfg.bg} ${cfg.text}
        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
        text-center border border-current/10 whitespace-nowrap
      `}
    >
      {label}
    </span>
  );
};

/**
 * Badge de status de pagamento (pago / pendente).
 */
export const PaymentStatusBadge = ({ status }: { status: 'pago' | 'pendente' }) => (
  <span
    className={`
      px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm
      ${status === 'pago'
        ? 'bg-emerald-500 text-white shadow-emerald-100'
        : 'bg-rose-50 text-rose-500 border border-rose-100'}
    `}
  >
    {status === 'pago' ? 'Pago ✓' : 'Pendente !'}
  </span>
);

/**
 * Estrelas de avaliação (1–5).
 */
export const Stars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg
        key={s}
        className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-200'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);