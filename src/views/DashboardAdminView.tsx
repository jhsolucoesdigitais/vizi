import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../db';
import {
  TrendingUp, TrendingDown, AlertCircle, ShoppingBag, DollarSign,
  Target, Flame, Activity, Zap, PieChart as PieChartIcon, CalendarDays, Trophy,
  PackageX, XCircle, ArrowRight, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Business, Condominio, Product } from '../types';
import { AdminTab } from '../hooks/useAppState';

// Paleta do dashboard — mesmos tokens do tailwind.config.js (oklch é aceito nativamente pelo SVG do recharts).
const BRAND        = 'oklch(0.52 0.120 195)'; // brand-500
const BRAND_LIGHT   = 'oklch(0.72 0.090 195)'; // brand-300
const BRAND_DARK    = 'oklch(0.36 0.095 195)'; // brand-700
const ACCENT        = 'oklch(0.62 0.170 40)';  // accent-500
const ACCENT_LIGHT  = 'oklch(0.78 0.120 48)';  // accent-300
const INK_500       = 'oklch(0.45 0.012 200)'; // ink-500
const BLOCK_COLORS  = [BRAND, ACCENT, BRAND_LIGHT, ACCENT_LIGHT, INK_500, BRAND_DARK];

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface DashboardAdminViewProps {
  adminBusiness: Business;
  adminCondo: Condominio | null;
  adminProducts: Product[];
  setActiveAdminTab: (t: AdminTab) => void;
}

function formatBRL(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Calcula variação percentual entre o mês selecionado e o anterior para exibir a seta de tendência. */
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {Math.abs(pct).toFixed(0)}% vs mês anterior
    </span>
  );
}

export default function DashboardAdminView({ adminBusiness, adminCondo, adminProducts, setActiveAdminTab }: DashboardAdminViewProps) {
  const [loading, setLoading] = useState(true);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawUsers, setRawUsers] = useState<any[]>([]);

  // Deslocamento de meses em relação ao mês atual (0 = mês atual, -1 = mês passado, etc.)
  const [monthOffset, setMonthOffset] = useState(0);

  // ========================================================
  // BUSCA DE DADOS BRUTOS (uma única vez por loja) — a navegação por mês
  // só recalcula os agregados em memória, sem refazer a consulta ao banco.
  // ========================================================
  useEffect(() => {
    async function fetchDashboardData() {
      if (!adminBusiness) return;
      setLoading(true);

      try {
        const [ordersRes, usersRes] = await Promise.all([
          supabase
            .from('pedidos')
            .select('id, userId, total, status, paymentStatus, createdAt, finishedAt, items')
            .eq('businessId', adminBusiness.id),
          supabase
            .from('usuarios')
            .select('id, name, block')
            .eq('condominioId', adminBusiness.condominioId)
        ]);

        setRawOrders(ordersRes.data || []);
        setRawUsers(usersRes.data || []);
      } catch (error) {
        console.error("Erro ao carregar BI do Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [adminBusiness, adminCondo]);

  // Data de referência do mês selecionado
  const today = new Date();
  const selectedDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const isCurrentMonth = monthOffset === 0;

  // ========================================================
  // AGREGAÇÃO — recalculada apenas quando os dados brutos ou o mês mudam
  // ========================================================
  const biData = useMemo(() => {
    const prefixMesSelecionado = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    const prevMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prefixMesAnterior = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let revMes = 0;
    let revMesAnterior = 0;
    let pendenteTotal = 0;
    let pedidosMes = 0;
    let pedidosMesAnterior = 0;
    let pedidosCanceladosMes = 0;

    // 1. Últimos 6 meses (contando a partir do mês selecionado) para o gráfico de evolução
    const historyMap: Record<string, { receita: number; pedidos: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      historyMap[key] = { receita: 0, pedidos: 0 };
    }

    // 2. Dias do mês selecionado (Ex: 01 a 31)
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyMap: Record<string, { time: string, Pago: number, Pendente: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = String(i).padStart(2, '0');
      dailyMap[dayStr] = {
        time: `${dayStr}/${String(selectedMonth + 1).padStart(2, '0')}`,
        Pago: 0,
        Pendente: 0
      };
    }

    const blockMap: Record<string, number> = {};
    const productMap: Record<string, { name: string, category: string, qty: number, rev: number }> = {};
    const customerMap: Record<string, { name: string, block: string, totalSpent: number, ordersCount: number }> = {};

    rawOrders.forEach(o => {
      if (!o.createdAt && !o.finishedAt) return;

      const dateRef = new Date(o.finishedAt || o.createdAt);
      if (isNaN(dateRef.getTime())) return;

      const orderYear = dateRef.getFullYear();
      const orderMonth = String(dateRef.getMonth() + 1).padStart(2, '0');
      const orderDay = String(dateRef.getDate()).padStart(2, '0');

      const monthKey = `${orderYear}-${orderMonth}`;
      const prefixMesPedido = monthKey;

      // Pedidos cancelados: só contamos pro KPI do mês selecionado, sem entrar em receita/ranking/blocos.
      if (o.status === 'cancelado') {
        if (prefixMesPedido === prefixMesSelecionado) pedidosCanceladosMes++;
        return;
      }

      // KPIs do MÊS SELECIONADO
      if (prefixMesPedido === prefixMesSelecionado) {
        pedidosMes++;
        if (o.paymentStatus === 'pago') revMes += o.total;

        if (dailyMap[orderDay]) {
          if (o.paymentStatus === 'pago') {
            dailyMap[orderDay].Pago += o.total;
          } else if (o.paymentStatus === 'pendente' || o.status === 'pendente' || !o.paymentStatus) {
            dailyMap[orderDay].Pendente += o.total;
          }
        }

        // Faturamento por Bloco, Top Produtos e Top Clientes — restritos ao mês selecionado
        if (o.paymentStatus === 'pago') {
          const user = rawUsers.find((u: any) => u.id === o.userId);
          const block = user?.block || 'Outros';

          if (!blockMap[block]) blockMap[block] = 0;
          blockMap[block] += o.total;

          if (o.userId) {
            if (!customerMap[o.userId]) {
              customerMap[o.userId] = {
                name: user?.name || user?.nome || 'Cliente não identificado',
                block: block,
                totalSpent: 0,
                ordersCount: 0
              };
            }
            customerMap[o.userId].totalSpent += o.total;
            customerMap[o.userId].ordersCount += 1;
          }

          o.items.forEach((item: any) => {
            if (!productMap[item.product.id]) {
              productMap[item.product.id] = { name: item.product.name, category: item.product.category, qty: 0, rev: 0 };
            }
            productMap[item.product.id].qty += item.quantity;
            productMap[item.product.id].rev += (item.product.price * item.quantity);
          });
        }
      }

      // KPIs do MÊS ANTERIOR (pra calcular a variação percentual)
      if (prefixMesPedido === prefixMesAnterior) {
        pedidosMesAnterior++;
        if (o.paymentStatus === 'pago') revMesAnterior += o.total;
      }

      // Pendentes Globais (não dependem do mês selecionado — é o total em aberto agora)
      if (o.paymentStatus === 'pendente' || (!o.paymentStatus && o.status !== 'concluido')) {
        pendenteTotal += o.total;
      }

      // Histórico de Receita + Pedidos dos últimos 6 meses
      if (historyMap[monthKey] !== undefined) {
        historyMap[monthKey].pedidos += 1;
        if (o.paymentStatus === 'pago') historyMap[monthKey].receita += o.total;
      }
    });

    const revenueHistory = Object.keys(historyMap).map(key => {
      const [, m] = key.split('-');
      return { name: MONTH_SHORT[parseInt(m) - 1], Receita: historyMap[key].receita, Pedidos: historyMap[key].pedidos };
    });

    const dailyHistory = Object.values(dailyMap).sort((a, b) => {
      const diaA = parseInt(a.time.split('/')[0], 10);
      const diaB = parseInt(b.time.split('/')[0], 10);
      return diaA - diaB;
    });

    const revenueByBlock = Object.keys(blockMap)
      .map((key, idx) => ({ name: `${adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'} ${key}`, value: blockMap[key], color: BLOCK_COLORS[idx % BLOCK_COLORS.length] }))
      .sort((a, b) => b.value - a.value);

    const top10Products = Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const top10Customers = Object.values(customerMap)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      revMes,
      revMesAnterior,
      pendenteTotal,
      pedidosMes,
      pedidosMesAnterior,
      pedidosCanceladosMes,
      ticketMedio: pedidosMes > 0 ? (revMes / pedidosMes) : 0,
      ticketMedioAnterior: pedidosMesAnterior > 0 ? (revMesAnterior / pedidosMesAnterior) : 0,
      revenueHistory,
      revenueByBlock,
      top10Products,
      top10Customers,
      dailyHistory
    };
  }, [rawOrders, rawUsers, selectedMonth, selectedYear, adminCondo]);

  // Produtos com estoque baixo (≤5) ou zerado, só entre os que controlam estoque.
  const lowStockProducts = (adminProducts || [])
    .filter(p => p.controlaEstoque && p.isVisible !== false && (p.estoqueAtual ?? 0) <= 5)
    .sort((a, b) => (a.estoqueAtual ?? 0) - (b.estoqueAtual ?? 0));

  // ========================================================
  // LOADING STATE
  // ========================================================
  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-5 animate-in fade-in duration-300">
        <Activity className="w-12 h-12 text-brand-500 animate-pulse" strokeWidth={1.75} />
        <div className="text-center">
          <h3 className="font-display text-lg font-semibold text-ink-900">Processando BI</h3>
          <p className="text-[11px] font-medium text-ink-400 mt-1">Cruzando dados em tempo real...</p>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER
  // ========================================================
  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-20 md:pb-10 text-left">

      {/* HEADER + AÇÕES RÁPIDAS */}
      <header className="flex flex-col gap-5 bg-ink-900 p-5 md:p-8 rounded-[24px] md:rounded-[28px] shadow-lg relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-500/15 rounded-full blur-[70px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="font-display text-lg md:text-2xl font-semibold text-white tracking-tight flex items-center gap-2.5">
              <Zap className="text-accent-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
              Inteligência de Negócios
            </h2>
            <p className="text-white/45 text-[11px] font-medium mt-1.5 flex items-center gap-2">
              Visão estratégica <span className="w-1 h-1 rounded-full bg-brand-400" /> Atualizado agora
            </p>
          </div>

          <div className="flex gap-2 sm:flex-wrap">
            <button onClick={() => setActiveAdminTab('pedidos')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]">
              Ver Pendentes <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setActiveAdminTab('cardapio')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-ink-900 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] shadow-sm">
              Gerenciar Catálogo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SELETOR DE MÊS — todos os valores do painel são referentes a este mês */}
        <div className="relative z-10 flex items-center justify-center gap-3 bg-white/[0.06] rounded-2xl p-2">
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90"
            title="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div className="flex-1 text-center">
            <p className="font-display text-[13px] md:text-[15px] font-semibold text-white tracking-tight">{selectedMonthLabel}</p>
            {isCurrentMonth && <p className="text-[9px] font-semibold uppercase tracking-wide text-brand-300">Mês atual</p>}
          </div>
          <button
            onClick={() => setMonthOffset(o => Math.min(0, o + 1))}
            disabled={isCurrentMonth}
            className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
            title="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* 4 KPIs PRINCIPAIS */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">

        <div className="bg-white rounded-[18px] md:rounded-[22px] p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 mb-3 md:mb-4">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
          </div>
          <p className="text-[10px] md:text-[11px] font-medium text-ink-500 mb-1">Faturamento ({MONTH_SHORT[selectedMonth]})</p>
          <h4 className="font-display text-lg md:text-[26px] font-bold text-ink-900 tracking-tight tabular-nums mb-1.5 truncate">{formatBRL(biData.revMes)}</h4>
          <TrendBadge current={biData.revMes} previous={biData.revMesAnterior} />
        </div>

        <div className="bg-white rounded-[18px] md:rounded-[22px] p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent-50 flex items-center justify-center text-accent-600 mb-3 md:mb-4">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
          </div>
          <p className="text-[10px] md:text-[11px] font-medium text-ink-500 mb-1">Valores Pendentes</p>
          <h4 className="font-display text-lg md:text-[26px] font-bold text-accent-600 tracking-tight tabular-nums truncate">{formatBRL(biData.pendenteTotal)}</h4>
        </div>

        <div className="bg-white rounded-[18px] md:rounded-[22px] p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/[0.04] flex items-center justify-center text-ink-700 mb-3 md:mb-4">
            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
          </div>
          <p className="text-[10px] md:text-[11px] font-medium text-ink-500 mb-1">Pedidos ({MONTH_SHORT[selectedMonth]})</p>
          <h4 className="font-display text-lg md:text-[26px] font-bold text-ink-900 tracking-tight tabular-nums mb-1.5">{biData.pedidosMes}</h4>
          <TrendBadge current={biData.pedidosMes} previous={biData.pedidosMesAnterior} />
        </div>

        <div className="bg-white rounded-[18px] md:rounded-[22px] p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-black/[0.04] flex items-center justify-center text-ink-700 mb-3 md:mb-4">
            <Target className="w-4 h-4 md:w-5 md:h-5" strokeWidth={2.25} />
          </div>
          <p className="text-[10px] md:text-[11px] font-medium text-ink-500 mb-1">Ticket Médio</p>
          <h4 className="font-display text-lg md:text-[26px] font-bold text-ink-900 tracking-tight tabular-nums mb-1.5 truncate">{formatBRL(biData.ticketMedio)}</h4>
          <TrendBadge current={biData.ticketMedio} previous={biData.ticketMedioAnterior} />
        </div>
      </div>

      {/* ALERTAS: CANCELADOS + ESTOQUE BAIXO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5">
        <div className="bg-white rounded-[18px] md:rounded-[20px] p-4 md:p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <XCircle className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-[11px] font-medium text-ink-500">Pedidos Cancelados ({MONTH_SHORT[selectedMonth]})</p>
            <h4 className="font-display text-lg font-semibold text-ink-900 tabular-nums">{biData.pedidosCanceladosMes}</h4>
          </div>
        </div>

        <button onClick={() => setActiveAdminTab('cardapio')} className="bg-white rounded-[18px] md:rounded-[20px] p-4 md:p-5 shadow-sm flex items-center gap-4 text-left hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lowStockProducts.length > 0 ? 'bg-accent-50 text-accent-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <PackageX className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-ink-500">Estoque Baixo / Esgotado</p>
            <h4 className="font-display text-lg font-semibold text-ink-900 tabular-nums">
              {lowStockProducts.length > 0 ? `${lowStockProducts.length} ${lowStockProducts.length === 1 ? 'produto' : 'produtos'}` : 'Tudo em dia'}
            </h4>
          </div>
          {lowStockProducts.length > 0 && <ArrowRight className="w-4 h-4 text-ink-400 shrink-0" />}
        </button>
      </div>

      {/* GRÁFICO: VENDAS DO MÊS SELECIONADO */}
      <div className="bg-ink-900 rounded-[22px] md:rounded-[28px] p-5 md:p-7 h-[280px] md:h-[340px] shadow-lg flex flex-col relative">
        <h5 className="text-[11px] font-semibold text-white/50 mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-brand-300" /> Movimentação de {selectedMonthLabel} (Pagos vs Pendentes)
        </h5>
        <div className="flex-1 w-full">
            <ResponsiveContainer width="99%" height="100%" minHeight={100}>
              <AreaChart data={biData.dailyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHojePago" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_LIGHT} stopOpacity={0.55}/>
                    <stop offset="95%" stopColor={BRAND_LIGHT} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHojePendente" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.5}/>
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.35)" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} dy={10} minTickGap={15} />
                <YAxis stroke="rgba(255,255,255,0.35)" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={44} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatBRL(value), name]}
                  contentStyle={{ backgroundColor: '#fff', border: 'none', color: '#171b21', borderRadius: '14px', fontSize: '12px', fontWeight: 600, boxShadow: '0 10px 24px -6px rgba(0,0,0,0.25)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', paddingTop: '14px' }} />
                <Area type="monotone" dataKey="Pendente" name="Aguardando Pgto" stroke={ACCENT} strokeWidth={3} fillOpacity={1} fill="url(#colorHojePendente)" activeDot={{ r: 5, fill: '#fff', stroke: ACCENT, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="Pago" name="Receitas Concluídas" stroke={BRAND_LIGHT} strokeWidth={3} fillOpacity={1} fill="url(#colorHojePago)" activeDot={{ r: 5, fill: '#fff', stroke: BRAND_LIGHT, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* DASHBOARD GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-5">

        {/* GRÁFICO 1: Evolução Mês a Mês (Receita + Pedidos) */}
        <div className="xl:col-span-2 bg-ink-900 rounded-[22px] md:rounded-[28px] p-5 md:p-7 h-[280px] md:h-[340px] shadow-lg flex flex-col relative">
          <h5 className="text-[11px] font-semibold text-white/50 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-300" /> Evolução de Faturamento e Pedidos (6 Meses)
          </h5>
          <div className="flex-1 w-full">
              <ResponsiveContainer width="99%" height="100%" minHeight={100}>
                <ComposedChart data={biData.revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND_LIGHT} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={BRAND_LIGHT} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.35)" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="left" stroke="rgba(255,255,255,0.35)" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} width={44} />
                  <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.35)" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip
                    formatter={(value: number, name: string) => [name === 'Receita' ? formatBRL(value) : `${value} pedidos`, name === 'Receita' ? 'Faturamento' : 'Pedidos']}
                    contentStyle={{ backgroundColor: '#fff', border: 'none', color: '#171b21', borderRadius: '14px', fontSize: '12px', fontWeight: 600, boxShadow: '0 10px 24px -6px rgba(0,0,0,0.25)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', paddingTop: '14px' }} formatter={(value) => value === 'Receita' ? 'Faturamento' : 'Pedidos'} />
                  <Area yAxisId="left" type="monotone" dataKey="Receita" stroke={BRAND_LIGHT} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 5, fill: '#fff', stroke: BRAND_LIGHT, strokeWidth: 2 }} />
                  <Bar yAxisId="right" dataKey="Pedidos" fill={ACCENT} radius={[6, 6, 0, 0]} barSize={18} fillOpacity={0.85} />
                </ComposedChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Receita por Bloco/Torre */}
        <div className="xl:col-span-1 bg-white rounded-[22px] md:rounded-[28px] p-5 md:p-7 h-[280px] md:h-[340px] shadow-sm flex flex-col">
          <h5 className="text-[11px] font-semibold text-ink-500 mb-2 flex items-center gap-2 justify-center">
            <PieChartIcon className="w-4 h-4 text-brand-500" /> Faturamento por {adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'} ({MONTH_SHORT[selectedMonth]})
          </h5>
          <div className="flex-1 w-full">
              <ResponsiveContainer width="99%" height="100%" minHeight={100}>
                <PieChart>
                  <Pie data={biData.revenueByBlock} innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                    {biData.revenueByBlock.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatBRL(val), 'Faturamento']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.06)', color: '#171b21', borderRadius: '14px', fontSize: '12px', fontWeight: 600, boxShadow: '0 10px 24px -6px rgba(0,0,0,0.15)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: 'rgb(120,130,145)', paddingTop: '18px' }} />
                </PieChart>
              </ResponsiveContainer>
              {biData.revenueByBlock.length === 0 && (
                <div className="text-center text-ink-400 text-[11px] font-medium -mt-24">Sem vendas neste mês.</div>
              )}
          </div>
        </div>
      </div>

      {/* RANKING TOP 10 MAIS VENDIDOS */}
      <div className="bg-white rounded-[22px] md:rounded-[28px] p-4 md:p-7 shadow-sm flex flex-col">
          <h3 className="font-display text-[14px] md:text-[15px] font-semibold text-ink-900 flex items-center gap-2.5 mb-4 md:mb-5">
            <Flame className="w-[18px] h-[18px] text-accent-500 shrink-0" /> Top 10 Produtos Mais Vendidos ({MONTH_SHORT[selectedMonth]})
          </h3>

          <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-left text-[12px] md:text-[13px] whitespace-nowrap">
                <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        <th className="px-3 md:px-4 py-3">Posição</th>
                        <th className="px-3 md:px-4 py-3">Produto</th>
                        <th className="px-3 md:px-4 py-3">Categoria</th>
                        <th className="px-3 md:px-4 py-3 text-center">Unid. Vendidas</th>
                        <th className="px-3 md:px-4 py-3 text-right">Receita Gerada</th>
                    </tr>
                </thead>
                <tbody>
                    {biData.top10Products.map((p, idx) => (
                        <tr key={idx} className="border-t border-black/[0.05]">
                            <td className="px-3 md:px-4 py-3.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[12px] ${idx === 0 ? 'bg-accent-100 text-accent-700' : idx === 1 ? 'bg-black/[0.06] text-ink-500' : idx === 2 ? 'bg-brand-100 text-brand-700' : 'bg-black/[0.03] text-ink-400'}`}>
                                    {idx + 1}º
                                </div>
                            </td>
                            <td className="px-3 md:px-4 py-3.5 font-semibold text-ink-900">{p.name}</td>
                            <td className="px-3 md:px-4 py-3.5 text-[11px] font-medium text-ink-500">{p.category}</td>
                            <td className="px-3 md:px-4 py-3.5 text-center">
                                <span className="bg-black/[0.04] text-ink-700 px-2.5 py-1 rounded-lg font-semibold">{p.qty}x</span>
                            </td>
                            <td className="px-3 md:px-4 py-3.5 text-right font-semibold text-brand-700 tabular-nums">
                                {formatBRL(p.rev)}
                            </td>
                        </tr>
                    ))}
                    {biData.top10Products.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-ink-400 text-[12px] font-medium">
                                Nenhum produto vendido neste mês.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* RANKING TOP 10 MELHORES CLIENTES */}
      <div className="bg-white rounded-[22px] md:rounded-[28px] p-4 md:p-7 shadow-sm flex flex-col">
          <h3 className="font-display text-[14px] md:text-[15px] font-semibold text-ink-900 flex items-center gap-2.5 mb-4 md:mb-5">
            <Trophy className="w-[18px] h-[18px] text-accent-500 shrink-0" /> Top 10 Melhores Clientes ({MONTH_SHORT[selectedMonth]})
          </h3>

          <div className="flex-1 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-left text-[12px] md:text-[13px] whitespace-nowrap">
                <thead>
                    <tr className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        <th className="px-3 md:px-4 py-3">Posição</th>
                        <th className="px-3 md:px-4 py-3">Cliente</th>
                        <th className="px-3 md:px-4 py-3">Localização</th>
                        <th className="px-3 md:px-4 py-3 text-center">Nº de Pedidos</th>
                        <th className="px-3 md:px-4 py-3 text-right">Total Gasto na Loja</th>
                    </tr>
                </thead>
                <tbody>
                    {biData.top10Customers.map((c, idx) => (
                        <tr key={idx} className="border-t border-black/[0.05]">
                            <td className="px-3 md:px-4 py-3.5">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-[12px] ${idx === 0 ? 'bg-accent-100 text-accent-700' : idx === 1 ? 'bg-black/[0.06] text-ink-500' : idx === 2 ? 'bg-brand-100 text-brand-700' : 'bg-black/[0.03] text-ink-400'}`}>
                                    {idx + 1}º
                                </div>
                            </td>
                            <td className="px-3 md:px-4 py-3.5 font-semibold text-ink-900">{c.name}</td>
                            <td className="px-3 md:px-4 py-3.5 text-[11px] font-medium text-ink-500">
                                {adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'} {c.block}
                            </td>
                            <td className="px-3 md:px-4 py-3.5 text-center">
                                <span className="bg-black/[0.04] text-ink-700 px-2.5 py-1 rounded-lg font-semibold">{c.ordersCount}</span>
                            </td>
                            <td className="px-3 md:px-4 py-3.5 text-right font-semibold text-brand-700 tabular-nums">
                                {formatBRL(c.totalSpent)}
                            </td>
                        </tr>
                    ))}
                    {biData.top10Customers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-12 text-center text-ink-400 text-[12px] font-medium">
                                Nenhum cliente com compras concluídas neste mês.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

    </div>
  );
}
