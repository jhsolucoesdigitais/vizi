import { useEffect } from 'react';
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { dbInstance } from "../../db";
import { User, Business, CartItem, Order } from '../types';
import { Condominio } from '../types';
import { encryptData } from '../utils/crypto';
import { identifyResident, clearResidentIdentity, tagResidentCondo, syncPushEnabledFlag } from '../utils/onesignal';
import { ViewType } from './useAppState';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

interface UseAuthHandlersParams {
  // Condomínio
  currentCondo:         Condominio | null;
  setCurrentCondo:      (c: Condominio | null) => void;

  // Navegação
  setView:              (v: ViewType) => void;
  setIsMasterAdmin:     (v: boolean) => void;
  setIsBusinessPortal:  (v: boolean) => void;

  // Loading
  setIsInitialLoading:  (v: boolean) => void;
  setIsGlobalLoading:   (v: boolean) => void;

  // Morador — auth
  tempUser:             User | null;
  setTempUser:          (u: User | null) => void;
  pendingStoreId:       string | null;
  setPendingStoreId:    (id: string | null) => void;

  // Morador — dados
  setUser:              (u: User | null) => void;
  setUserOrders:        (o: Order[]) => void;
  setCart:              (c: CartItem[]) => void;
  businesses:           Business[];
  setBusinesses:        (b: Business[]) => void;
  setAllProducts:       (p: any[]) => void;
  setSelectedBusiness:  (b: Business | null) => void;

  // Funções de dados
  fetchOrdersByApartment: (block: string, floor: number, apartment: number) => Promise<Order[]>;
}

// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

export function useAuthHandlers({
  currentCondo,
  setCurrentCondo,
  setView,
  setIsMasterAdmin,
  setIsBusinessPortal,
  setIsInitialLoading,
  setIsGlobalLoading,
  tempUser,
  setTempUser,
  pendingStoreId,
  setPendingStoreId,
  setUser,
  setUserOrders,
  setCart,
  businesses,
  setBusinesses,
  setAllProducts,
  setSelectedBusiness,
  fetchOrdersByApartment,
}: UseAuthHandlersParams) {

  // ─────────────────────────────────────────────
  //  Inicialização do app (leitura da URL)
  // ─────────────────────────────────────────────

  useEffect(() => {
    const initApp = async () => {
      setIsInitialLoading(true);
      try {
        const params       = new URLSearchParams(window.location.search);
        const condoSlug    = params.get('c');
        const portal       = params.get('portal');
        const adminMode    = params.get('admin');
        const storeIdParam = params.get('storeId');

        // Rota master admin
        if (adminMode === 'master') {
          setIsMasterAdmin(true);
          setIsInitialLoading(false);
          return;
        }

        if (!condoSlug) {
          setIsInitialLoading(false);
          return;
        }

        const { data: condo } = await supabase
          .from('condominios')
          .select('*')
          .eq('slug', condoSlug)
          .single();

        if (!condo) {
          setIsInitialLoading(false);
          return;
        }

        setCurrentCondo(condo);

        // Rota portal de lojistas
        if (portal === 'business') {
          setIsBusinessPortal(true);
          setIsInitialLoading(false);
          return;
        }

        // Carrega empresas e produtos do condomínio em paralelo
        const [bizRes, prodRes] = await Promise.all([
          supabase
            .from('empresas_public')
            .select('*')
			.eq('condominioId', condo.id),
          supabase
            .from('produtos')
            .select('*')
            .eq('condominioId', condo.id),
        ]);

        const allBiz = bizRes.data || [];
        setBusinesses(allBiz);
        setAllProducts(prodRes.data || []);

        const savedUser = localStorage.getItem('maxi_user_v3');

        if (savedUser) {
          // Confirma que a sessão do Supabase Auth (usada pelo RLS em toda escrita,
          // como criar pedido) ainda é válida — getSession() já tenta renovar via
          // refresh token sozinho. Se mesmo assim vier vazia, o "logado" salvo no
          // localStorage é uma ilusão: melhor mandar pro login de novo do que deixar
          // o morador preencher um pedido que nunca vai ser gravado.
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            localStorage.removeItem('maxi_user_v3');
            if (storeIdParam) setPendingStoreId(storeIdParam);
            setView('login');
            setIsInitialLoading(false);
            return;
          }

          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          identifyResident(parsed.id);
          tagResidentCondo(condo.id);
          syncPushEnabledFlag(parsed.id);

          const orders = await fetchOrdersByApartment(parsed.block, parsed.floor, parsed.apartment);
          setUserOrders(orders);

          // Redireciona direto para a loja se vier de link compartilhado
          if (storeIdParam) {
            const sharedStore = allBiz.find(b => b.id === storeIdParam || b.slug === storeIdParam);
            if (sharedStore) {
              setSelectedBusiness(sharedStore);
              setView('business');
              setIsInitialLoading(false);
              return;
            }
          }

          setView('dashboard');
        } else {
          // Usuário não logado: guarda loja pendente para abrir após login
          if (storeIdParam) setPendingStoreId(storeIdParam);
          setView('login');
        }

      } catch (e) {
        console.error('Erro ao inicializar app:', e);
      } finally {
        setIsInitialLoading(false);
      }
    };

    initApp();
  }, []);

  // ─────────────────────────────────────────────
  //  Finalizar login (usado por confirm e recovery)
  // ─────────────────────────────────────────────

  const finalizeLogin = async (userData: User) => {
    setUser(userData);
    localStorage.setItem('maxi_user_v3', JSON.stringify(userData));
    identifyResident(userData.id);
    if (currentCondo) tagResidentCondo(currentCondo.id);
    syncPushEnabledFlag(userData.id);

    const orders = await fetchOrdersByApartment(userData.block, userData.floor, userData.apartment);
    setUserOrders(orders);

    // Redireciona para loja pendente ou dashboard
    if (pendingStoreId) {
      const biz = businesses.find(b => b.id === pendingStoreId || b.slug === pendingStoreId);
      setSelectedBusiness(biz ?? null);
      setView(biz ? 'business' : 'dashboard');
      setPendingStoreId(null);
    } else {
      setView('dashboard');
    }
  };

  // ─────────────────────────────────────────────
  //  Passo 1 — Formulário de login (valida e salva tempUser)
  // ─────────────────────────────────────────────

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentCondo) {
      Swal.fire('Erro', 'Erro de identificação do condomínio. Recarregue a página.', 'error');
      return;
    }

    const fd           = new FormData(e.currentTarget);
    const inputName    = fd.get('name') as string;
    const rawWhatsApp  = (fd.get('whatsapp') as string).replace(/\D/g, '');

    // Valida 11 dígitos (DDD + 9 + número)
    if (rawWhatsApp.length !== 11) {
      Swal.fire({
        title: 'WhatsApp Inválido',
        text: 'O número deve conter DDD + 9 + Número (ex: 19991234567).',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    setIsGlobalLoading(true);

    try {
      const encryptedWhatsApp = encryptData(rawWhatsApp);
      const inputBlock        = ((fd.get('block') as string) ?? '').trim();
      const inputFloor        = parseInt(fd.get('floor')     as string) || 0;
      const inputApartment    = parseInt(fd.get('apartment') as string) || 0;

      // Cria/reaproveita a vaga do apartamento e a conta de acesso (fantasma) vinculada a ela.
      // Identidade = condomínio + unidade, de propósito sem depender do WhatsApp.
      const { data: result, error: fnError } = await supabase.functions.invoke('resident-login', {
        body: {
          condominioId: currentCondo.id,
          block:        inputBlock,
          floor:        inputFloor,
          apartment:    inputApartment,
          name:         inputName,
          whatsapp:     encryptedWhatsApp,
        },
      });

      if (fnError || result?.error) {
        let message = result?.error || fnError?.message || 'Falha ao processar login.';
        const ctx = (fnError as any)?.context;
        if (ctx?.json) {
          try { message = (await ctx.json())?.error || message; } catch { /* mantém a mensagem padrão */ }
        }
        throw new Error(message);
      }

      // Troca o token gerado pela função por uma sessão real do Supabase Auth
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: 'magiclink',
      });

      if (otpError) throw otpError;

      setTempUser(result.usuario as User);
      setView('confirm-login');

    } catch (err: any) {
      console.error('Erro ao processar login:', err);
      Swal.fire('Erro', err?.message || 'Falha ao processar dados de acesso.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  //  Passo 2 — Confirmação de apartamento
  // ─────────────────────────────────────────────

  const handleConfirmLogin = async () => {
    if (!tempUser) return;

    setIsGlobalLoading(true);
    try {
      // A vaga e a sessão já foram criadas no passo 1 (resident-login) — aqui é só confirmar.
      await finalizeLogin(tempUser);
    } catch (error) {
      console.error('Erro ao confirmar login:', error);
      Swal.fire('Erro', 'Não foi possível confirmar o login. Tente novamente.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  //  Logout
  // ─────────────────────────────────────────────

  const handleLogout = () => {
    Swal.fire({
      title: 'Deseja deslogar do aplicativo?',
      text: 'Seus dados de acesso salvos neste dispositivo serão removidos.',
      icon: 'question',
      showCancelButton:   true,
      confirmButtonColor: '#d33',
      cancelButtonColor:  '#3085d6',
      confirmButtonText:  'Sim, Sair',
      cancelButtonText:   'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('maxi_user_v3');
        supabase.auth.signOut();
        clearResidentIdentity();
        setUser(null);
        setCart([]);
        setView('login');

        Swal.fire({
          icon: 'success',
          title: 'Desconectado',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  // ─────────────────────────────────────────────
  //  Favoritar loja
  // ─────────────────────────────────────────────

  const handleToggleFavorite = async (e: React.MouseEvent, bizId: string, user: User | null) => {
    e.stopPropagation();
    if (!user) return;

    const isFav = user.favorites.includes(bizId);
    const updated: User = {
      ...user,
      favorites: isFav
        ? user.favorites.filter(id => id !== bizId)
        : [...user.favorites, bizId],
    };

    // update (não upsert): a vaga do morador já existe, e upsert exigiria permissão de INSERT
    await supabase.from('usuarios').update({ favorites: updated.favorites }).eq('id', updated.id);
    setUser(updated);
    localStorage.setItem('maxi_user_v3', JSON.stringify(updated));

    Swal.fire({
      icon: 'success',
      title: isFav ? 'Removido' : 'Favoritado!',
      timer: 600,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
    });
  };

  // ─────────────────────────────────────────────
  //  Compartilhar loja
  // ─────────────────────────────────────────────

  const handleShareStore = (business: Business) => {
    if (!business) return;

    const condoParam = currentCondo?.slug ?? 'vizi';
    const baseUrl    = window.location.origin + window.location.pathname;
    const shareUrl   = `${baseUrl}?c=${condoParam}&storeId=${business.slug || business.id}`;
    const shareText  =
      `🏢 *Vendas e Serviços - VIZI*\n\n` +
      `Ei! Olha só que legal essa loja que acabei de encontrar no nosso condomínio: 🛍️✨\n\n` +
      `📍 *${business.name}*`;

    const whatsappFallback = () => {
      const msg = `${shareText}\n\nConfira aqui: ${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (navigator.share) {
      navigator.share({ title: `VIZI | ${business.name}`, text: shareText, url: shareUrl })
        .catch(whatsappFallback);
    } else {
      whatsappFallback();
    }
  };

  // ─────────────────────────────────────────────
  //  Retorno
  // ─────────────────────────────────────────────

  return {
    handleLoginSubmit,
    handleConfirmLogin,
    handleLogout,
    handleToggleFavorite,
    handleShareStore,
    finalizeLogin,
  };
}