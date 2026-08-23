import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { User, Business, Product, Order } from '../types';
import { Condominio } from '../types';

// ─────────────────────────────────────────────
//  Hook — dados e sincronização do lado do morador
// ─────────────────────────────────────────────

interface UseCustomerDataParams {
  currentCondo:        Condominio | null;
  selectedBusiness:    Business | null;
  setSelectedBusiness: (b: Business | null) => void;
  playNotificationSound: () => void;
}

export function useCustomerData({
  currentCondo,
  selectedBusiness,
  setSelectedBusiness,
  playNotificationSound,
}: UseCustomerDataParams) {

  // ── Estados do morador ────────────────────────
  const [user,              setUser]              = useState<User | null>(null);
  const [userOrders,        setUserOrders]        = useState<Order[]>([]);
  const [businesses,        setBusinesses]        = useState<Business[]>([]);
  const [allProducts,       setAllProducts]       = useState<Product[]>([]);
  const [isRefreshing,      setIsRefreshing]      = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Referência para comparar status de pedidos entre renders
  const prevOrdersRef = useRef<Order[]>([]);

  // ─────────────────────────────────────────────
  //  Busca de pedidos por unidade (OTIMIZADO)
  // ─────────────────────────────────────────────

  /**
   * Busca os pedidos do apartamento filtrando pelo condomínio atual.
   * OTIMIZAÇÃO: O banco de dados já filtra para trazer APENAS pedidos pendentes
   * ou pedidos (concluídos/cancelados) que aconteceram hoje.
   */
  const fetchOrdersByApartment = async (
    block: string,
    floor: number,
    apartment: number,
  ): Promise<Order[]> => {
    if (!currentCondo) return [];

    const tag = `${block}${floor}${apartment}`;

    // 1. Pegamos a meia-noite de hoje em milissegundos
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startMs = startOfToday.getTime();

const { data, error } = await supabase
      .from('pedidos')
      // CORREÇÃO: Removidos userBlock/Floor/Apartment e updatedAt. Adicionado userTag.
      .select('id, businessId, userName, userTag, items, total, status, createdAt, finishedAt, paymentStatus, paymentMethod, observation')
      .eq('condominioId', currentCondo.id)
      .eq('userTag', tag)
      .or(`status.not.in.(concluido,cancelado,concluído),createdAt.gte.${startMs},finishedAt.gte.${startMs}`)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico da unidade:', error);
      return [];
    }

    return data as Order[];
  };

  // ─────────────────────────────────────────────
  //  Refresh completo dos dados do morador
  // ─────────────────────────────────────────────

  const refreshCustomerData = async () => {
    if (!user || !currentCondo) return;

    setIsRefreshing(true);
    try {
      const [bizRes, prodsRes, userRes] = await Promise.all([
        supabase
          .from('empresas_public')
          .select('*')
          .eq('condominioId', currentCondo.id)
          .neq('licenseStatus', 'blocked'),
 
        supabase
          .from('produtos')
          // Otimizado: Trazendo apenas os campos essenciais do produto
          .select('id, name, image, price, category, empresaId, isVisible, description, isQuoteOnly, estoqueAtual, controlaEstoque, pontosGanhos')
          .eq('condominioId', currentCondo.id),

        supabase
          .from('usuarios')
          .select('*') // Mantido '*' para não perder permissões/roles de segurança do usuário
          .eq('id', user.id)
          .single(),
      ]);

      if (bizRes.error)   throw bizRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (userRes.error)  throw userRes.error;

      const bizData   = bizRes.data   || [];
      const prodsData = prodsRes.data || [];
      const userData  = userRes.data;

      // Atualiza usuário e cache local (pontos atualizados)
      if (userData) {
        setUser(userData);
        localStorage.setItem('maxi_user_v3', JSON.stringify(userData));
      }

      setBusinesses(bizData);
      setAllProducts(prodsData);

      // Recarrega pedidos do morador (agora otimizado)
      const orders = await fetchOrdersByApartment(user.block, user.floor, user.apartment);
      setUserOrders(orders);

      // Se estiver vendo uma loja, atualiza os dados dela também
      if (selectedBusiness) {
        const freshSelected = bizData.find(b => b.id === selectedBusiness.id);
        if (freshSelected) setSelectedBusiness(freshSelected as Business);
      }

    } catch (error) {
      console.error('Erro ao atualizar dados do cliente:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erro ao atualizar',
        text: 'Não foi possível sincronizar os dados com o servidor.',
      });
    } finally {
      // Delay suave para a animação de refresh
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // ─────────────────────────────────────────────
  //  Effects
  // ─────────────────────────────────────────────

  /**
   * Realtime — sincroniza pontos e pedidos do morador logado.
   */
  useEffect(() => {
    if (!user?.id) return;

    // Canal 1: atualiza pontos ao receber UPDATE no usuário
    const userSub = supabase
      .channel('sync-user-points')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${user.id}` },
        (payload) => {
          const updatedData = payload.new as User;
          setUser(updatedData);
          localStorage.setItem('maxi_user_v3', JSON.stringify(updatedData));
        },
      )
      .subscribe();

    // Canal 2: recarrega pedidos ao receber UPDATE num pedido do usuário
    const orderSub = supabase
      .channel('sync-orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `userId=eq.${user.id}` },
        async () => {
          const orders = await fetchOrdersByApartment(user.block, user.floor, user.apartment);
          setUserOrders(orders);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSub);
      supabase.removeChannel(orderSub);
    };
  }, [user?.id]);

  /**
   * Realtime — sincroniza dados do usuário ao carregar/recarregar a página (F5).
   */
  useEffect(() => {
    if (!user?.id) return;

    const syncOnLoad = async () => {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setUser(data);
        localStorage.setItem('maxi_user_v3', JSON.stringify(data));
      }
    };
    syncOnLoad();

    const userSub = supabase
      .channel('any-name')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios', filter: `id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as User;
          setUser(updated);
          localStorage.setItem('maxi_user_v3', JSON.stringify(updated));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(userSub); };
  }, [user?.id]);

  /**
   * Notificação visual + sonora ao morador quando o status de um pedido muda.
   */
  useEffect(() => {
    if (prevOrdersRef.current.length === 0) {
      prevOrdersRef.current = userOrders;
      return;
    }

    let updates = 0;

    userOrders.forEach(newOrder => {
      const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);
      if (oldOrder && oldOrder.status !== newOrder.status) updates++;
    });

    if (updates > 0) {
      setNotificationCount(prev => prev + updates);
      playNotificationSound();

      Swal.fire({
        title: 'Pedido Atualizado!',
        text: `O status de ${updates} pedido(s) mudou.`,
        icon: 'info',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
    }

    prevOrdersRef.current = userOrders;
  }, [userOrders]);

  // ─────────────────────────────────────────────
  //  Retorno do hook
  // ─────────────────────────────────────────────

  return {
    // Estados
    user,              setUser,
    userOrders,        setUserOrders,
    businesses,        setBusinesses,
    allProducts,       setAllProducts,
    isRefreshing,
    notificationCount, setNotificationCount,

    // Funções
    fetchOrdersByApartment,
    refreshCustomerData,
  };
}