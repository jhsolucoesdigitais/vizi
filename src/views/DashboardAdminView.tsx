import React, { useState, useEffect } from 'react';
import { supabase } from '../../db'; 
import { 
  TrendingUp, AlertCircle, ShoppingBag, DollarSign, 
  Target, Flame, Activity, Zap, PieChart as PieChartIcon, CalendarDays, Trophy
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Business, Condominio } from '../types'; 

interface DashboardAdminViewProps {
  adminBusiness: Business;
  adminCondo: Condominio | null;
}

export default function DashboardAdminView({ adminBusiness, adminCondo }: DashboardAdminViewProps) {
  const [loading, setLoading] = useState(true);
  const [biData, setBiData] = useState({
    revMes: 0,
    pendenteTotal: 0,
    pedidosMes: 0,
    ticketMedio: 0,
    revenueHistory: [] as any[],
    revenueByBlock: [] as any[],
    top10Products: [] as any[],
    top10Customers: [] as any[], // NOVO: Histórico dos clientes que mais gastaram
    dailyHistory: [] as any[]
  });

  // ========================================================
  // BUSCA INTELIGENTE DE DADOS (BI)
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
            .eq('businessId', adminBusiness.id)
            .neq('status', 'cancelado'),
          supabase
            .from('usuarios')
            .select('id, name, block')  
            .eq('condominioId', adminBusiness.condominioId)
        ]);

        const orders = ordersRes.data || [];
        const users = usersRes.data || [];

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const prefixMesAtual = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        let revMes = 0;
        let pendenteTotal = 0;
        let pedidosMes = 0;

        // 1. Prepara os últimos 6 meses para o Gráfico de Montanha
        const historyMap: Record<string, number> = {};
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          historyMap[key] = 0;
        }

        // 2. Prepara os DIAS DO MÊS ATUAL (Ex: 01 a 31)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dailyMap: Record<string, { time: string, Pago: number, Pendente: number }> = {};
        for (let i = 1; i <= daysInMonth; i++) {
          const dayStr = String(i).padStart(2, '0');
          dailyMap[dayStr] = { 
            time: `${dayStr}/${String(currentMonth + 1).padStart(2, '0')}`, 
            Pago: 0, 
            Pendente: 0 
          };
        }

        const blockMap: Record<string, number> = {};
        const productMap: Record<string, { name: string, category: string, qty: number, rev: number }> = {};
        const customerMap: Record<string, { name: string, block: string, totalSpent: number, ordersCount: number }> = {}; // NOVO

        orders.forEach(o => {
          // PROTEÇÃO: Ignora se o pedido não tiver data válida
          if (!o.createdAt && !o.finishedAt) return; 

          const dateRef = new Date(o.finishedAt || o.createdAt);
          // PROTEÇÃO: Ignora se o JS não conseguir ler a data
          if (isNaN(dateRef.getTime())) return;

          // Extracão segura baseada no timezone local, sem usar "split"
          const orderYear = dateRef.getFullYear();
          const orderMonth = String(dateRef.getMonth() + 1).padStart(2, '0');
          const orderDay = String(dateRef.getDate()).padStart(2, '0');

          const monthKey = `${orderYear}-${orderMonth}`;
          const prefixMesPedido = `${orderYear}-${orderMonth}`;

          // KPIs do MÊS ATUAL
          if (prefixMesPedido === prefixMesAtual) {
            pedidosMes++;
            if (o.paymentStatus === 'pago') revMes += o.total;

            // Alimentar Gráfico Dia a Dia
            if (dailyMap[orderDay]) {
              if (o.paymentStatus === 'pago') {
                dailyMap[orderDay].Pago += o.total;
              } else if (o.paymentStatus === 'pendente' || o.status === 'pendente' || !o.paymentStatus) {
                dailyMap[orderDay].Pendente += o.total;
              }
            }
          }

          // Pendentes Globais
          if (o.paymentStatus === 'pendente' || (!o.paymentStatus && o.status !== 'concluido')) {
            pendenteTotal += o.total;
          }

          // Histórico de Receita 6 Meses
          if (historyMap[monthKey] !== undefined && o.paymentStatus === 'pago') {
            historyMap[monthKey] += o.total;
          }

          // Faturamento por Bloco e Top Clientes
          if (o.paymentStatus === 'pago') {
            const user = users.find((u: any) => u.id === o.userId);
            const block = user?.block || 'Outros';
            
            // Faturamento por Bloco
            if (!blockMap[block]) blockMap[block] = 0;
            blockMap[block] += o.total;

            // Top Clientes
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
          }

          // Produtos Vendidos
          o.items.forEach((item: any) => {
            if (!productMap[item.product.id]) {
              productMap[item.product.id] = { name: item.product.name, category: item.product.category, qty: 0, rev: 0 };
            }
            productMap[item.product.id].qty += item.quantity;
            productMap[item.product.id].rev += (item.product.price * item.quantity);
          });
        });

        // Formatação final dos arrays
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const revenueHistory = Object.keys(historyMap).map(key => {
          const [y, m] = key.split('-');
          return { name: monthNames[parseInt(m) - 1], Receita: historyMap[key] };
        });

        const dailyHistory = Object.values(dailyMap).sort((a, b) => {
          const diaA = parseInt(a.time.split('/'), 10);
          const diaB = parseInt(b.time.split('/'), 10);
          return diaA - diaB;
        });

        const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
        const revenueByBlock = Object.keys(blockMap)
          .map((key, idx) => ({ name: `${adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'} ${key}`, value: blockMap[key], color: COLORS[idx % COLORS.length] }))
          .sort((a, b) => b.value - a.value);

        const top10Products = Object.values(productMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 10);

        // Ordenar os Top 10 Clientes
        const top10Customers = Object.values(customerMap)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10);

        setBiData({
          revMes,
          pendenteTotal,
          pedidosMes,
          ticketMedio: pedidosMes > 0 ? (revMes / pedidosMes) : 0,
          revenueHistory,
          revenueByBlock,
          top10Products,
          top10Customers, // Adicionado ao estado
          dailyHistory
        });

      } catch (error) {
        console.error("Erro ao carregar BI do Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [adminBusiness, adminCondo]);

  const formatBRL = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ========================================================
  // LOADING STATE
  // ========================================================
  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse" />
          <Activity className="w-16 h-16 text-emerald-500 animate-bounce relative z-10" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest italic">Processando BI</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Cruzando dados em tempo real...</p>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER
  // ========================================================
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 md:pb-10 text-left">
      
      {/* HEADER ELITE ESTILO SENSEI */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden gap-5 md:gap-6">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-md flex items-center gap-3">
            <Zap className="text-emerald-400 w-8 h-8 md:w-10 md:h-10 shrink-0" />
            Inteligência de Negócios

          </h2>
          <p className="text-slate-400 text-[9px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] mt-1 md:mt-2 flex items-center gap-2">
            Visão Estratégica <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Atualizado Agora
          </p>
        </div>

        <div className="relative z-10 bg-black/30 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm hidden sm:block">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status da Loja</p>
           <p className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operação Ativa
           </p>
        </div>
      </header>

      {/* 4 KPIs DE ALTA PERFORMANCE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={60} className="text-emerald-500 group-hover:scale-110 transition-transform" /></div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturamento (Mês Atual)</p>
          <h4 className="text-3xl font-black text-slate-800 italic tracking-tighter">{formatBRL(biData.revMes)}</h4>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5"><AlertCircle size={60} className="text-orange-500 group-hover:scale-110 transition-transform" /></div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 mb-4 border border-orange-100">
            <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valores Pendentes</p>
          <h4 className="text-3xl font-black text-orange-500 italic tracking-tighter">{formatBRL(biData.pendenteTotal)}</h4>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5"><ShoppingBag size={60} className="text-blue-500 group-hover:scale-110 transition-transform" /></div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Pedidos (Mês)</p>
          <h4 className="text-3xl font-black text-slate-800 italic tracking-tighter">{biData.pedidosMes}</h4>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={60} className="text-purple-500 group-hover:scale-110 transition-transform" /></div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4 border border-purple-100">
            <Target className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Médio (Mês)</p>
          <h4 className="text-3xl font-black text-slate-800 italic tracking-tighter">{formatBRL(biData.ticketMedio)}</h4>
        </div>

      </div>

      {/* GRÁFICO: VENDAS DO MÊS ATUAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 h-[380px] shadow-2xl flex flex-col relative">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-blue-400" /> Movimentação do Mês Atual (Pagos vs Pendentes)</span>
        </h5>
        <div className="flex-1 w-full min-h-">
            <ResponsiveContainer width="99%" height="100%" minHeight={100}>
              <AreaChart data={biData.dailyHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHojePago" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHojePendente" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} dy={10} minTickGap={15} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatBRL(value), name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', color: '#64748b', paddingTop: '15px' }} />
                <Area type="monotone" dataKey="Pendente" name="Aguardando Pgto" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorHojePendente)" activeDot={{ r: 6, fill: '#fff', stroke: '#f59e0b', strokeWidth: 3 }} />
                <Area type="monotone" dataKey="Pago" name="Receitas Concluídas" stroke="#34d399" strokeWidth={4} fillOpacity={1} fill="url(#colorHojePago)" activeDot={{ r: 6, fill: '#fff', stroke: '#34d399', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* DASHBOARD GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: Evolução Mês a Mês */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 md:p-8 h-[380px] shadow-2xl flex flex-col relative">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> Evolução de Faturamento (6 Meses)</span>
          </h5>
          <div className="flex-1 w-full min-h-">
              <ResponsiveContainer width="99%" height="100%" minHeight={100}>
                <AreaChart data={biData.revenueHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    formatter={(value: number) => [formatBRL(value), 'Faturamento']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#34d399' }}
                  />
                  <Area type="monotone" dataKey="Receita" stroke="#34d399" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, fill: '#fff', stroke: '#34d399', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Receita por Bloco/Torre */}
        <div className="xl:col-span-1 bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 h-[380px] shadow-sm flex flex-col">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 flex items-center gap-2 justify-center">
            <PieChartIcon className="w-4 h-4 text-blue-500" /> Faturamento por {adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'}
          </h5>
          <div className="flex-1 w-full min-h-">
              <ResponsiveContainer width="99%" height="100%" minHeight={100}>
                <PieChart>
                  <Pie data={biData.revenueByBlock} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {biData.revenueByBlock.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => [formatBRL(val), 'Faturamento']}
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: '900', color: '#64748b', paddingTop: '20px'}} />
                </PieChart>
              </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RANKING TOP 10 MAIS VENDIDOS */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 italic">
              <Flame className="w-5 h-5 text-orange-500 shrink-0" /> Top 10 Produtos Mais Vendidos
            </h3>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4 rounded-l-2xl">Posição</th>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4 text-center">Unid. Vendidas</th>
                        <th className="px-6 py-4 text-right rounded-r-2xl">Receita Gerada</th>
                    </tr>
                </thead>
                <tbody>
                    {biData.top10Products.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : idx === 1 ? 'bg-slate-200 text-slate-500 border border-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-50 text-slate-400'}`}>
                                    {idx + 1}º
                                </div>
                            </td>
                            <td className="px-6 py-4 font-black uppercase text-slate-800">{p.name}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{p.category}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-black">{p.qty}x</span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">
                                {formatBRL(p.rev)}
                            </td>
                        </tr>
                    ))}
                    {biData.top10Products.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl mt-4">
                                Nenhum produto vendido ainda.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {/* RANKING TOP 10 MELHORES CLIENTES */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 italic">
              <Trophy className="w-5 h-5 text-amber-500 shrink-0" /> Top 10 Melhores Clientes
            </h3>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4 rounded-l-2xl">Posição</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Localização</th>
                        <th className="px-6 py-4 text-center">Nº de Pedidos</th>
                        <th className="px-6 py-4 text-right rounded-r-2xl">Total Gasto na Loja</th>
                    </tr>
                </thead>
                <tbody>
                    {biData.top10Customers.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : idx === 1 ? 'bg-slate-200 text-slate-500 border border-slate-300' : idx === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-slate-50 text-slate-400'}`}>
                                    {idx + 1}º
                                </div>
                            </td>
                            <td className="px-6 py-4 font-black uppercase text-slate-800">{c.name}</td>
                            <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                                {adminCondo?.settings.type === 'torre' ? 'Torre' : 'Bloco'} {c.block}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-black">{c.ordersCount}</span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">
                                {formatBRL(c.totalSpent)}
                            </td>
                        </tr>
                    ))}
                    {biData.top10Customers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl mt-4">
                                Nenhum cliente com compras concluídas.
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