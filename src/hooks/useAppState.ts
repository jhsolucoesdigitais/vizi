import { useState, useRef } from 'react';
import { User, Business, Product, CartItem, Order, OrderStatus, CategoryType } from '../types';
import { Condominio } from '../types';
import { getLocalISODate } from '../components/shared';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

export type ViewType =
  | 'login'
  | 'confirm-login'
  | 'dashboard'
  | 'business'
  | 'cart'
  | 'admin-login'
  | 'admin-dash'
  | 'my-orders'
  | 'config'
  | 'landing-seller';

export type AdminTab =
  | 'pedidos'
  | 'cardapio'
  | 'relatorio'
  | 'config'
  | 'avaliacoes'
  | 'clientes';

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

/**
 * Centraliza os estados de navegação, UI e os que não pertencem
 * exclusivamente ao domínio do cliente ou do admin.
 * Os estados de dados pesados ficam em useCustomerData e useAdminData.
 */
export function useAppState() {

  // ── Navegação ─────────────────────────────────
  const [view,             setView]             = useState<ViewType>('login');
  const [activeAdminTab,   setActiveAdminTab]   = useState<AdminTab>('pedidos');
  const [isBusinessPortal, setIsBusinessPortal] = useState(false);
  const [isMasterAdmin,    setIsMasterAdmin]    = useState(false);

  // ── Condomínio ────────────────────────────────
  const [currentCondo, setCurrentCondo] = useState<Condominio | null>(null);

  // ── Loading global ────────────────────────────
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGlobalLoading,  setIsGlobalLoading]  = useState(false);

  // ── Morador — auth / sessão ───────────────────
  const [tempUser,      setTempUser]      = useState<User | null>(null);
  const [pendingStoreId,setPendingStoreId]= useState<string | null>(null);

  // ── Loja selecionada / catálogo ───────────────
  const [selectedBusiness,    setSelectedBusiness]    = useState<Business | null>(null);
  const [productDetailModal,  setProductDetailModal]  = useState<Product | null>(null);
  const [showAboutModal,      setShowAboutModal]      = useState(false);

  // ── Carrinho ──────────────────────────────────
  const [cart,          setCart]          = useState<CartItem[]>([]);
  const [appliedLoyalty,setAppliedLoyalty]= useState(false);

  // ── Filtros do dashboard ──────────────────────
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | 'all'>('all');
  const [searchTerm,     setSearchTerm]     = useState('');

  // ── UI de relatório / tempo ───────────────────
  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeFilter>('month');

  // ── Upload de arquivos (admin) ────────────────
  const [productFile, setProductFile] = useState<File | null>(null);
  const [logoFile,    setLogoFile]    = useState<File | null>(null);
  const [bannerFile,  setBannerFile]  = useState<File | null>(null);

  // ── Refs ──────────────────────────────────────
  const prevOrdersRef    = useRef<Order[]>([]);
  const adminFormRef     = useRef<HTMLFormElement>(null);
  const prevPendingCount = useRef(0);

  // ─────────────────────────────────────────────
  //  Constantes
  // ─────────────────────────────────────────────

  const ITEMS_PER_PAGE     = 100;
  const FIN_ITEMS_PER_PAGE = 100;

  // ─────────────────────────────────────────────
  //  Retorno
  // ─────────────────────────────────────────────

  return {
    // Navegação
    view,               setView,
    activeAdminTab,     setActiveAdminTab,
    isBusinessPortal,   setIsBusinessPortal,
    isMasterAdmin,      setIsMasterAdmin,

    // Condomínio
    currentCondo,       setCurrentCondo,

    // Loading
    isInitialLoading,   setIsInitialLoading,
    isGlobalLoading,    setIsGlobalLoading,

    // Auth morador
    tempUser,           setTempUser,
    pendingStoreId,     setPendingStoreId,

    // Loja / catálogo
    selectedBusiness,   setSelectedBusiness,
    productDetailModal, setProductDetailModal,
    showAboutModal,     setShowAboutModal,

    // Carrinho
    cart,               setCart,
    appliedLoyalty,     setAppliedLoyalty,

    // Filtros
    categoryFilter,     setCategoryFilter,
    searchTerm,         setSearchTerm,
    activeTimeFilter,   setActiveTimeFilter,

    // Upload
    productFile,        setProductFile,
    logoFile,           setLogoFile,
    bannerFile,         setBannerFile,

    // Refs
    prevOrdersRef,
    adminFormRef,
    prevPendingCount,

    // Constantes
    ITEMS_PER_PAGE,
    FIN_ITEMS_PER_PAGE,
  };
}