import { useState, useEffect, useRef, useMemo } from 'react'; 
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { Business, Product, Order, OrderStatus, BusinessHours } from '../types';
import { Condominio } from '../types';
import { getLocalISODate } from '../components/shared';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

type AdminTab = 'dashboard' | 'pedidos' | 'cardapio' | 'relatorio' | 'config' | 'avaliacoes' | 'clientes';

type RefreshTarget = 'all' | 'config' | 'cardapio' | 'avaliacoes' | 'pedidos' | 'relatorio';
 
  
// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

export function useAdminData({
  view,
  activeAdminTab,
}: {
  view: string;
  activeAdminTab: AdminTab;
  [key: string]: any; // Ignora os outros itens (como prevPendingCount) que o App envia
}) {
  // ── Estados da empresa / sessão admin ────────
  const [adminBusiness,      setAdminBusiness]      = useState<Business | null>(null);
  const [adminCondo,         setAdminCondo]          = useState<Condominio | null>(null);
  const [adminProducts,      setAdminProducts]       = useState<Product[]>([]);
  const [isAdminRefreshing,  setIsAdminRefreshing]   = useState(false);

  // ── Config sincronizada do negócio ───────────
  const [isStoreOpenConfig,   setIsStoreOpenConfig]   = useState(true);
  const [loyaltyPointMode,    setLoyaltyPointMode]    = useState<'por_valor' | 'por_item'>('por_valor');
  const [businessHoursConfig, setBusinessHoursConfig] = useState<BusinessHours | null>(null);
  const [isLoyaltyEnabled,    setIsLoyaltyEnabled]    = useState(false);
  const [whatsappValue,       setWhatsappValue]       = useState('');

  // ── Produto em edição ─────────────────────────
  const [editingProduct,       setEditingProduct]       = useState<Partial<Product> | null>(null);
  const [productImageBase64,   setProductImageBase64]   = useState<string | null>(null);
  const [adminLogoBase64,      setAdminLogoBase64]      = useState<string | null>(null);
  const [adminBannerBase64,    setAdminBannerBase64]    = useState<string | null>(null);
  const [isStockEnabled,       setIsStockEnabled]       = useState(false);
  const adminFormRef = useRef<HTMLFormElement>(null);

  // ── Pedidos (esteira) ─────────────────────────
  const [adminOrders,      setAdminOrders]      = useState<Order[]>([]);
  const [financeOrders,    setFinanceOrders]    = useState<Order[]>([]);
  const [loadingOrders,    setLoadingOrders]    = useState(false);
  const [adminOrderFilter, setAdminOrderFilter] = useState<OrderStatus | 'todos' | 'ativos'>('todos');
  const [adminOrderPage,   setAdminOrderPage]   = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [adminOrderSearchTerm, setAdminOrderSearchTerm] = useState('');
  const prevPendingCount = useRef(0);
  const initialAudioPlayed = useRef(false);

  // ── Clientes ──────────────────────────────────
  const [adminClients,       setAdminClients]       = useState<any[]>([]);
  const [loadingClients,     setLoadingClients]     = useState(false);
  const [hasSearchedClients, setHasSearchedClients] = useState(false);
  const [clientPage,         setClientPage]         = useState(0);
  const [totalClientsCount,  setTotalClientsCount]  = useState(0);
  const [clientFilterBlock,  setClientFilterBlock]  = useState<'todos' | 'A' | 'B' | 'C'>('todos');
  const [clientFilterStatus, setClientFilterStatus] = useState<'todos' | 'pendente' | 'em_dia' | 'com_cupom'>('todos');
  const [clientFilterFloor,  setClientFilterFloor]  = useState<string | 'todos'>('todos');
  const [clientFilterUnit,   setClientFilterUnit]   = useState<string | 'todos'>('todos');
  
  
  const [expandedClientId,   setExpandedClientId]   = useState<string | null>(null);
  const ITEMS_PER_PAGE = 100;
 
 
  // ── Financeiro ────────────────────────────────
  const now      = new Date();
  const firstDay = getLocalISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDay  = getLocalISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [adminDateStart,      setAdminDateStart]      = useState(firstDay);
  const [adminDateEnd,        setAdminDateEnd]        = useState(lastDay);
  const [activeTimeFilter,    setActiveTimeFilter]    = useState<'today' | 'week' | 'month' | 'all'>('month'); 
  
  const [finPage,             setFinPage]             = useState(0);
  const [finLoading,          setFinLoading]          = useState(false);
  const [finSearched,         setFinSearched]         = useState(false);
  const [financeStatusFilter, setFinanceStatusFilter] = useState<OrderStatus | 'todos'>('todos');
  const [financePaymentFilter,setFinancePaymentFilter]= useState<'pago' | 'pendente' | 'todos'>('todos');
  const FIN_ITEMS_PER_PAGE = 100;

  // ─────────────────────────────────────────────
  //  Funções de Utilitários / UI
  // ─────────────────────────────────────────────

  const setTimeFilter = (type: 'today' | 'week' | 'month' | 'all') => {
      const today = new Date();
      setActiveTimeFilter(type); 

      if (type === 'today') {
          const d = getLocalISODate(today);
          setAdminDateStart(d); 
          setAdminDateEnd(d);
      } 
      else if (type === 'week') {
          const start = new Date();
          start.setDate(today.getDate() - 6);
          setAdminDateStart(getLocalISODate(start)); 
          setAdminDateEnd(getLocalISODate(today));
      } 
      else if (type === 'month') {
          const start = new Date(today.getFullYear(), today.getMonth(), 1);
          const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          setAdminDateStart(getLocalISODate(start)); 
          setAdminDateEnd(getLocalISODate(end));
      } 
      else {
          setAdminDateStart("2024-01-01"); 
          setAdminDateEnd(getLocalISODate(today));
      }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/assets/vizi.mp3'); //Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Áudio bloqueado pelo navegador', e));
    } catch (e) {
      console.error('Erro ao tocar som', e);
    }
  };

  // ─────────────────────────────────────────────
  //  Busca de pedidos — LÓGICA ORIGINAL RESTAURADA
  // ─────────────────────────────────────────────

  const fetchAdminOrders = async (bizId?: string) => {
    // Usa o ID passado ou o do estado
    const idParaBuscar = bizId || adminBusiness?.id;

    if (!idParaBuscar) return;

    setLoadingOrders(true);
    try {
        const inicioDoDia = new Date().setHours(0,0,0,0);

        const { data, error } = await supabase
            .from('pedidos')
      
            .select(`
              id, businessId, userId, userTag, userName, items, 
              total, discount, pointsEarned, status, createdAt, 
              paymentStatus, paymentMethod, observation, 
              condominioId, finishedAt
            `)
            .eq('businessId', idParaBuscar)
            .or(`createdAt.gte.${inicioDoDia},and(status.neq.concluido,status.neq.cancelado)`)
            .order('createdAt', { ascending: false });
        
        if (!error) setAdminOrders(data || []);
    } finally {
        setLoadingOrders(false);
    }
  };
  // ─────────────────────────────────────────────
  //  Busca financeira paginada
  // ─────────────────────────────────────────────

 const handleFinancialSearch = async (resetPage = true) => {
    if (!adminBusiness) return;
    setFinLoading(true);

    const currentPage = resetPage ? 0 : finPage;
    if (resetPage) setFinPage(0);

    try {
      const startTs = new Date(adminDateStart + 'T00:00:00').getTime();
      const endTs   = new Date(adminDateEnd   + 'T23:59:59').getTime();

      let query = supabase
        .from('pedidos')
        // OTIMIZAÇÃO: Selecionando apenas o necessário para cálculos e tabela financeira
        .select(`
          id, businessId, userId, userTag, userName, items, 
          total, discount, pointsEarned, status, createdAt, 
          paymentStatus, paymentMethod, observation, 
          condominioId, finishedAt
        `, { count: 'exact' })
        .eq('businessId', adminBusiness.id)
        .eq('condominioId', adminBusiness.condominioId)
        .or(`and(createdAt.gte.${startTs},createdAt.lte.${endTs}),and(finishedAt.gte.${startTs},finishedAt.lte.${endTs})`);

      if (financeStatusFilter  !== 'todos') query = query.eq('status', financeStatusFilter);
      if (financePaymentFilter !== 'todos') query = query.eq('paymentStatus', financePaymentFilter);

      const from = currentPage * FIN_ITEMS_PER_PAGE;
      const to   = from + FIN_ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('createdAt', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setFinanceOrders(data || []);
      setTotalOrdersCount(count !== null ? count : data?.length || 0);
      setFinSearched(true);

    } catch (error) {
      console.error('Erro na busca financeira:', error);
      Swal.fire({
        icon: 'error',
        title: 'Falha na Busca',
        text: 'Não foi possível carregar os registros financeiros.',
        confirmButtonColor: '#0f172a',
      });
    } finally {
      setFinLoading(false);
    }
  };
  // ─────────────────────────────────────────────
  //  Refresh de dados admin (por target)
  // ─────────────────────────────────────────────

 const refreshAdminData = async (
    signal?: AbortSignal, 
    target: RefreshTarget = 'all',
  ) => {
    if (!adminBusiness) return;
    setIsAdminRefreshing(true);

    try {
      // 1. DADOS DA EMPRESA (Seguro: SEM password e SEM tempPassword)
      if (target === 'all' || target === 'config' || target === 'avaliacoes') {
        const { data: biz, error: bizError } = await supabase
          .from('empresas')
          .select('id, name, category, subCategory, rating, image, bannerUrl, businessHours, status, loyalty, pagamento, social, reviews, condominioId, email, licenseStatus, tipoPlano, description, "categoryOrder"').eq('id', adminBusiness.id)
          .single();

        if (biz && !bizError) {
          setAdminBusiness(biz as Business);
          setIsStoreOpenConfig(biz.status?.aberto ?? true);
          setLoyaltyPointMode(biz.loyalty?.tipoPontuacao ?? 'por_valor');
          if (biz.businessHours) setBusinessHoursConfig(biz.businessHours);

          if (biz.condominioId && !adminCondo) {
            const { data: condoData } = await supabase
              .from('condominios')
              .select('id, name, slug, settings') // Puxa apenas o necessário do condomínio
              .eq('id', biz.condominioId)
              .single();
            if (condoData) setAdminCondo(condoData as Condominio);
          }
        }
      }

      // 2. PEDIDOS (Todos os campos são seguros aqui)
      if (target === 'all' || target === 'relatorio') {
        const { data: orders, error } = await supabase
          .from('pedidos')
          .select('id, businessId, userId, userTag, userName, items, total, discount, pointsEarned, status, createdAt, paymentStatus, paymentMethod, observation, condominioId, finishedAt')
          .eq('businessId', adminBusiness.id);

        if (!error && orders) {
          setAdminOrders(orders as Order[]);
        }
      }

  
      // 3. PRODUTOS E ORDEM DAS CATEGORIAS
     if (target === 'all' || target === 'cardapio') {
        // OTIMIZAÇÃO: Busca apenas os campos necessários para a listagem e edição
        const [prodRes, bizRes] = await Promise.all([
          supabase
            .from('produtos')
            .select(`
              id, name, image, price, category, empresaId, 
              isVisible, description, isQuoteOnly, 
              estoqueAtual, controlaEstoque, pontosGanhos
            `)
            .eq('empresaId', adminBusiness.id),
            
          supabase
            .from('empresas')
            .select('"categoryOrder"')
            .eq('id', adminBusiness.id)
            .single()
        ]);

        if (prodRes.error) {
           console.error("Erro ao carregar catálogo:", prodRes.error);
        } else if (prodRes.data) {
           setAdminProducts(prodRes.data as Product[]);
        }

        if (bizRes.data && bizRes.data.categoryOrder !== undefined) {
           setAdminBusiness(prev => prev ? { ...prev, categoryOrder: bizRes.data.categoryOrder } : prev);
        }
      }

    } catch (error: any) {
      console.error('Erro geral ao atualizar dados admin:', error);
    } finally {
      setIsAdminRefreshing(false);
    }
  };
  
    // ─────────────────────────────────────────────
  //  Effects de carregamento das abas
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (!adminBusiness?.id) return;

    const loadMap: Partial<Record<AdminTab, RefreshTarget>> = {
      cardapio:   'cardapio',
      avaliacoes: 'avaliacoes',
      config:     'config',
	  clientes:   'config',  
    };

    const target = loadMap[activeAdminTab];
    if (target) {
        // Chamamos a função sem o AbortController para evitar que a requisição seja cancelada pela metade
        refreshAdminData(undefined, target);
    }
  }, [adminBusiness?.id, activeAdminTab]);
  
  // ─────────────────────────────────────────────
  //  Filtro de clientes
  // ─────────────────────────────────────────────



const handleFilterClients = async (forcedPage?: number) => {
    if (!adminBusiness || !adminBusiness.condominioId) return;

    const pageToUse = typeof forcedPage === 'number' ? forcedPage : 0;
    setLoadingClients(true);
    setHasSearchedClients(true);
    setClientPage(pageToUse);

    try {
      const colunasUsuario = 'id, name, block, floor, apartment, points, whatsapp, condominioId';

      const [usersRes, allOrdersRes] = await Promise.all([
        supabase
          .from('usuarios')
          .select(colunasUsuario)
          .eq('condominioId', adminBusiness.condominioId),
        supabase
          .from('pedidos')
          .select('*')
          .eq('businessId', adminBusiness.id)
          .neq('status', 'cancelado'),
      ]);

      if (usersRes.error) throw usersRes.error;

      let result = (usersRes.data as any[]) || [];
      const allOrders = allOrdersRes.data || [];

      setAdminOrders(allOrders as Order[]);

      // FILTRO: Bloco
      if (clientFilterBlock !== 'todos') {
        result = result.filter(u => u.block === clientFilterBlock);
      }

      // FILTRO: Andar (NOVO)
      if (clientFilterFloor !== 'todos') {
        result = result.filter(u => u.floor.toString() === clientFilterFloor);
      }

      // FILTRO: Final/Coluna (NOVO)
      if (clientFilterUnit !== 'todos') {
        result = result.filter(u => u.apartment.toString().endsWith(clientFilterUnit));
      }

      // FILTROS: Status & Fidelidade
      if (clientFilterStatus === 'com_cupom') {
        result = result.filter(u =>
          (u.points[adminBusiness.id] || 0) >= adminBusiness.loyalty.metaPontos
        );
      } else if (clientFilterStatus === 'pendente') {
        result = result.filter(u =>
          allOrders.some(o =>
            o.userId === u.id &&
            (o.paymentStatus === 'pendente' || o.status === 'entregue_aguardando_pagamento')
          )
        );
      } else if (clientFilterStatus === 'em_dia') {
        result = result.filter(u => {
          const hasPending = allOrders.some(o =>
            o.userId === u.id &&
            (o.paymentStatus === 'pendente' || o.status === 'entregue_aguardando_pagamento')
          );
          return !hasPending;
        });
      }

      result.sort((a, b) =>
        a.block.localeCompare(b.block) || a.floor - b.floor || a.apartment - b.apartment
      );

      const from = pageToUse * ITEMS_PER_PAGE;
      setAdminClients(result.slice(from, from + ITEMS_PER_PAGE));
      setTotalClientsCount(result.length);

    } catch (error) {
      console.error('Erro na busca de clientes:', error);
      Swal.fire('Erro', 'Não foi possível carregar os clientes.', 'error');
    } finally {
      setLoadingClients(false);
    }
  };









  const handlePageChange = (newPage: number) => {
    setClientPage(newPage);
    handleFilterClients(newPage);
  };

  // ─────────────────────────────────────────────
  //  DADOS DERIVADOS (Filtros, Categorias, Relatório)
  // ─────────────────────────────────────────────

  // 1. Estatísticas Rápidas
  const adminOrderStats = useMemo(() => {
    const stats = {
      ativos: 0,
      pendente: 0,
      preparando: 0,
      saiu_entrega: 0,
      entregue_aguardando_pagamento: 0,
      concluido: 0,
      cancelado: 0
    };
    adminOrders.forEach(o => {
      if (o.status !== 'concluido' && o.status !== 'cancelado') stats.ativos++;
      if (stats.hasOwnProperty(o.status)) {
        (stats as any)[o.status]++;
      }
    });
    return stats;
  }, [adminOrders]);

  // 2. Filtro da Esteira de Pedidos — LÓGICA ORIGINAL RESTAURADA
  const filteredAdminOrders = useMemo(() => {
    const agora = new Date();
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    const fimDoDia = inicioDoDia + 86399999;

    return adminOrders.filter(o => {
        const term = adminOrderSearchTerm.toLowerCase();
        // Proteção contra valores nulos
        const searchMatch = (o.userName || '').toLowerCase().includes(term) || 
                            (o.userTag || '').toLowerCase().includes(term) ||
                            (o.id || '').toLowerCase().includes(term);
        
        if (!searchMatch) return false;

        const isResolvido = ['concluido', 'cancelado'].includes(o.status);
        const isHoje = o.createdAt >= inicioDoDia || (o.finishedAt && o.finishedAt >= inicioDoDia);

        if (adminOrderFilter === 'ativos') {
		 
            return !isResolvido;
        }

        if (adminOrderFilter === 'todos') {
            return isHoje || !isResolvido;
        }

        if (o.status === adminOrderFilter) {
            if (isResolvido) return isHoje;
            return true;
        }

        return false;
    });
  }, [adminOrders, adminOrderSearchTerm, adminOrderFilter]);

  // 3. Cálculos do Relatório Financeiro
  const reportData = useMemo(() => {
    const start = new Date(adminDateStart + 'T00:00:00').getTime();
    const end = new Date(adminDateEnd + 'T23:59:59').getTime();

    const ordersInPeriod = financeOrders.filter(o => {
      const dataReferencia = (o.status === 'concluido' && o.finishedAt) ? o.finishedAt : o.createdAt;
      return dataReferencia >= start && dataReferencia <= end;
    });

    const sortedOrders = [...ordersInPeriod].sort((a, b) => {
      const timeA = a.finishedAt || a.createdAt;
      const timeB = b.finishedAt || b.createdAt;
      return timeB - timeA;
    });

    const validOrders = sortedOrders.filter(o => o.status !== 'cancelado');
    const faturamento = validOrders.reduce((acc, o) => acc + o.total, 0);
    const totalCancelado = ordersInPeriod.filter(o => o.status === 'cancelado').reduce((acc, o) => acc + o.total, 0);

    // Período anterior equivalente (mesma duração, imediatamente antes)
    const duration = end - start;
    const prevEnd = start - 1;
    const prevStart = prevEnd - duration;
    const prevOrders = financeOrders.filter(o => {
      const dataReferencia = (o.status === 'concluido' && o.finishedAt) ? o.finishedAt : o.createdAt;
      return dataReferencia >= prevStart && dataReferencia <= prevEnd && o.status !== 'cancelado';
    });
    const faturamentoAnterior = prevOrders.reduce((acc, o) => acc + o.total, 0);

    return {
      faturamento,
      pendente: validOrders.filter(o => o.paymentStatus === 'pendente').reduce((acc, o) => acc + o.total, 0),
      liquidados: validOrders.filter(o => o.paymentStatus === 'pago').reduce((acc, o) => acc + o.total, 0),
      totalCancelado,
      pedidos: validOrders.length,
      ticketMedio: validOrders.length > 0 ? faturamento / validOrders.length : 0,
      faturamentoAnterior,
      history: sortedOrders
    };
  }, [financeOrders, adminDateStart, adminDateEnd]);

  // 4. Extração das Categorias dos Produtos
const adminCategories = useMemo(() => {
    const cats = new Set(adminProducts.map(p => p.category).filter(Boolean));
    const catArray = Array.from(cats) as string[];

    const savedOrder = adminBusiness?.categoryOrder || [];

    // Ordena baseado na ordem salva. Se for uma categoria nova, vai para o final.
    catArray.sort((a, b) => {
      const indexA = savedOrder.indexOf(a);
      const indexB = savedOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return catArray;
  }, [adminProducts, adminBusiness?.categoryOrder]);
  
  
  


// ─────────────────────────────────────────────
  //  Effects (Ciclo de Vida)
  // ─────────────────────────────────────────────


  useEffect(() => {
    if (activeAdminTab !== 'clientes') {
      setHasSearchedClients(false);
      setAdminClients([]);
      setClientPage(0);
    }
  }, [activeAdminTab]);

  useEffect(() => {
    setAdminOrderPage(0);
  }, [adminOrderFilter, adminOrderSearchTerm]);

  useEffect(() => {
    if (adminBusiness) {
      setIsLoyaltyEnabled(adminBusiness.loyalty.ativo);
      setWhatsappValue(adminBusiness.social.whatsapp || '');
    }
  }, [adminBusiness]);

    useEffect(() => {
    if (view === 'admin-dash' && adminBusiness?.id) {
        if (activeAdminTab === 'pedidos') {
            fetchAdminOrders(adminBusiness.id);
			
        }
    }
  }, [activeAdminTab, view, adminBusiness?.id]);

  useEffect(() => {
    if (!adminBusiness?.id) return;

    const adminOrderSub = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'pedidos', 
          filter: `businessId=eq.${adminBusiness.id}` 
        },
        () => {
          playNotificationSound();  
          fetchAdminOrders();       
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(adminOrderSub);
    };
  }, [adminBusiness?.id]);

  useEffect(() => {
    if (adminBusiness && activeAdminTab === 'pedidos') {
      fetchAdminOrders();  
	 
    }
  }, [activeAdminTab, adminBusiness]);




  

  // ─────────────────────────────────────────────
  //  Retorno do hook
  // ─────────────────────────────────────────────

  return {
    // Empresa
    adminBusiness,      setAdminBusiness,
    adminCondo,         setAdminCondo,
    adminProducts,      setAdminProducts,
    isAdminRefreshing,  setIsAdminRefreshing,

    // Config da loja
    isStoreOpenConfig,  setIsStoreOpenConfig,
    loyaltyPointMode,   setLoyaltyPointMode,
    businessHoursConfig,setBusinessHoursConfig,
    isLoyaltyEnabled,   setIsLoyaltyEnabled,
    whatsappValue,      setWhatsappValue,

    // Produto em edição
    editingProduct,     setEditingProduct,
    productImageBase64, setProductImageBase64,
    adminLogoBase64,    setAdminLogoBase64,
    adminBannerBase64,  setAdminBannerBase64,
    isStockEnabled,     setIsStockEnabled,
    adminFormRef,

    // Pedidos & Dados Filtrados
    adminOrders,         setAdminOrders,
    filteredAdminOrders, 
    financeOrders,       setFinanceOrders,
    loadingOrders,
    adminOrderFilter,    setAdminOrderFilter,
    adminOrderPage,      setAdminOrderPage,
    totalOrdersCount,    setTotalOrdersCount,
    adminOrderSearchTerm,setAdminOrderSearchTerm,
    adminOrderStats,     
    
    // Relatórios e Categorias
    reportData,          
    adminCategories,     

    // Clientes
    adminClients,
    loadingClients,
    hasSearchedClients,
    clientPage,
    totalClientsCount,
    clientFilterBlock,  setClientFilterBlock,
    clientFilterStatus, setClientFilterStatus,
    expandedClientId,   setExpandedClientId,
	
	clientFilterFloor,  setClientFilterFloor, // ADICIONADO
    clientFilterUnit,   setClientFilterUnit,  // ADICIONADO

    // Financeiro
    adminDateStart,     setAdminDateStart,
    adminDateEnd,       setAdminDateEnd,
    finPage,            setFinPage,
    finLoading,
    finSearched,        setFinSearched,
    financeStatusFilter,  setFinanceStatusFilter,
    financePaymentFilter, setFinancePaymentFilter,
    FIN_ITEMS_PER_PAGE,
    ITEMS_PER_PAGE,

    // Aliases de compatibilidade com App.tsx
    finStartDate: adminDateStart,
    setFinStartDate: setAdminDateStart,
    finEndDate: adminDateEnd,
    setFinEndDate: setAdminDateEnd,
    finStatus: 'concluido' as string,
    setFinStatus: (_v: string) => {},
    finResults: financeOrders,

    // Funções
    fetchAdminOrders,
    handleFinancialSearch,
    refreshAdminData,
    handleFilterClients,
    handlePageChange,
    playNotificationSound,
    activeTimeFilter,
    setTimeFilter,
  };
}