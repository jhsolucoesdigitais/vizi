import React, { useEffect, lazy, Suspense } from 'react';

// ── Hooks e Handlers 
import { useAppState }       from './src/hooks/useAppState';
import { useCustomerData }   from './src/hooks/useCustomerData';
import { useAdminData }      from './src/hooks/useAdminData';
import { useAuthHandlers }   from './src/handlers/useAuthHandlers';
import { useOrderHandlers }  from './src/handlers/useOrderHandlers';
import { useAdminHandlers }  from './src/handlers/useAdminHandlers';
import { LoadingOverlay }    from './src/components/shared';

// ── Views 
const LoginView        = lazy(() => import('./src/views/LoginView'));
const ConfirmLoginView = lazy(() => import('./src/views/ConfirmLoginView'));
const DashboardView    = lazy(() => import('./src/views/DashboardView'));
const BusinessView     = lazy(() => import('./src/views/BusinessView'));
const CartView         = lazy(() => import('./src/views/CartView'));
const MyOrdersView     = lazy(() => import('./src/views/MyOrdersView'));

// ── Painéis Pesados
const LandingSeller    = lazy(() => import('./LandingSeller'));
const BusinessPortal   = lazy(() => import('./src/components/BusinessPortal')); 
const AdminDashView    = lazy(() => import('./src/views/AdminDashView'));
const SuperAdminPanel  = lazy(() => import('./src/components/SuperAdminPanel'));

// ─────────────────────────────────────────────
//  Utilitário de som de notificação
// ─────────────────────────────────────────────

const playNotificationSound = () => {
  try {
    const audio = new Audio('/assets/vizi.mp3'); //Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  } catch {/* silencioso */}
};

// ─────────────────────────────────────────────
//  Componente raiz
// ─────────────────────────────────────────────

export default function App() {

  // ── 1. Estado de UI / navegação ──────────────
  const appState = useAppState();

  // ── 2. Dados do morador (realtime incluso) ───
  const customerData = useCustomerData({
    currentCondo:        appState.currentCondo,
    selectedBusiness:    appState.selectedBusiness,
    setSelectedBusiness: appState.setSelectedBusiness,
    playNotificationSound,
  });

  // ── 3. Dados do painel admin (realtime incluso) ─
  const adminData = useAdminData({
    view:            appState.view,
    activeAdminTab:  appState.activeAdminTab,
    adminFormRef:    appState.adminFormRef,
    prevPendingCount: appState.prevPendingCount,
    playNotificationSound,
  });

  // ── 4. Handlers de autenticação ──────────────
  const authHandlers = useAuthHandlers({
    // Condomínio
    currentCondo:        appState.currentCondo,
    setCurrentCondo:     appState.setCurrentCondo,

    // Navegação
    setView:             appState.setView,
    setIsMasterAdmin:    appState.setIsMasterAdmin,
    setIsBusinessPortal: appState.setIsBusinessPortal,

    // Loading
    setIsInitialLoading: appState.setIsInitialLoading,
    setIsGlobalLoading:  appState.setIsGlobalLoading,

    // Auth morador
    tempUser:            appState.tempUser,
    setTempUser:         appState.setTempUser,
    pendingStoreId:      appState.pendingStoreId,
    setPendingStoreId:   appState.setPendingStoreId,

    // Dados morador
    setUser:             customerData.setUser,
    setUserOrders:       customerData.setUserOrders,
    setCart:             appState.setCart,
    businesses:          customerData.businesses,
    setBusinesses:       customerData.setBusinesses,
    setAllProducts:      customerData.setAllProducts,
    setSelectedBusiness: appState.setSelectedBusiness,

    // Funções de dados
    fetchOrdersByApartment: customerData.fetchOrdersByApartment,
  });

  // ── 5. Handlers de pedido / carrinho ─────────
  const orderHandlers = useOrderHandlers({
    user:             customerData.user,
    setUser:          customerData.setUser,
    selectedBusiness: appState.selectedBusiness,
    cart:             appState.cart,
    setCart:          appState.setCart,
    appliedLoyalty:   appState.appliedLoyalty,
    setAppliedLoyalty: appState.setAppliedLoyalty,
    setUserOrders:    customerData.setUserOrders,
    setView:          appState.setView,
    currentCondo:     appState.currentCondo,
    setIsGlobalLoading: appState.setIsGlobalLoading,
    setSelectedBusiness: appState.setSelectedBusiness,
    setBusinesses:    customerData.setBusinesses,
  });

  // ── 6. Handlers do painel admin ───────────────
  const adminHandlers = useAdminHandlers({
    adminBusiness:       adminData.adminBusiness,
    setAdminBusiness:    adminData.setAdminBusiness,
    adminOrders:         adminData.adminOrders,
    setAdminOrders:      adminData.setAdminOrders,
    financeOrders:       adminData.financeOrders,
    setFinanceOrders:    adminData.setFinanceOrders,
    adminProducts:       adminData.adminProducts,
    setAdminProducts:    adminData.setAdminProducts,
    activeAdminTab:      appState.activeAdminTab,
    isStoreOpenConfig:   adminData.isStoreOpenConfig,
    setIsStoreOpenConfig: adminData.setIsStoreOpenConfig,
    loyaltyPointMode:    adminData.loyaltyPointMode,
    setLoyaltyPointMode: adminData.setLoyaltyPointMode,
    businessHoursConfig: adminData.businessHoursConfig,
    setBusinessHoursConfig: adminData.setBusinessHoursConfig,
    editingProduct:      adminData.editingProduct,
    setEditingProduct:   adminData.setEditingProduct,
    productImageBase64:  adminData.productImageBase64,
    setProductImageBase64: adminData.setProductImageBase64,
    adminLogoBase64:     adminData.adminLogoBase64,
    setAdminLogoBase64:  adminData.setAdminLogoBase64,
    adminBannerBase64:   adminData.adminBannerBase64,
    setAdminBannerBase64: adminData.setAdminBannerBase64,
    isStockEnabled:      adminData.isStockEnabled,
    setIsStockEnabled:   adminData.setIsStockEnabled,
    productFile:         appState.productFile,
    setProductFile:      appState.setProductFile,
    logoFile:            appState.logoFile,
    setLogoFile:         appState.setLogoFile,
    bannerFile:          appState.bannerFile,
    setBannerFile:       appState.setBannerFile,
    isLoyaltyEnabled:    adminData.isLoyaltyEnabled,
    setIsLoyaltyEnabled: adminData.setIsLoyaltyEnabled,
    whatsappValue:       adminData.whatsappValue,
    setWhatsappValue:    adminData.setWhatsappValue,
    adminFormRef:        appState.adminFormRef,
    setIsGlobalLoading:  appState.setIsGlobalLoading,
    setIsAdminRefreshing: adminData.setIsAdminRefreshing,
    refreshAdminData:    adminData.refreshAdminData,
    fetchAdminOrders:    adminData.fetchAdminOrders,
    handleFinancialSearch: adminData.handleFinancialSearch,
	handleFilterClients: adminData.handleFilterClients, // <--- ADICIONE ESTA LINHA
    clientPage:          adminData.clientPage,
  });

  // ── Título dinâmico da aba ────────────────────
  useEffect(() => {
    if (appState.view === 'business' && appState.selectedBusiness) {
      document.title = `${appState.selectedBusiness.name} | Vizi`;
    } else {
      document.title = 'VIZI | Premium Experience';
    }
  }, [appState.view, appState.selectedBusiness]);
  
  useEffect(() => {
    if (appState.currentCondo?.slug) {
      localStorage.setItem('vizi_last_slug', appState.currentCondo.slug);
    }
  }, [appState.currentCondo]);

  // ─────────────────────────────────────────────
  //  Loading inicial (busca de condomínio / sessão)
  // ─────────────────────────────────────────────

  if (appState.isInitialLoading) {
    return <LoadingOverlay fullScreen />;
  }

  // ─────────────────────────────────────────────
  //  Rota: Super Admin
  // ─────────────────────────────────────────────

  if (appState.isMasterAdmin) {
    return <SuperAdminPanel onBack={() => appState.setIsMasterAdmin(false)} />;
  }

// ─────────────────────────────────────────────
  //  Rota: Portal do Lojista (login separado)
  // ─────────────────────────────────────────────

  if (appState.isBusinessPortal) {
    return (
      <BusinessPortal
        currentCondo={appState.currentCondo}
        onLoginSuccess={(biz) => {
          adminData.setAdminBusiness(biz);
		  appState.setActiveAdminTab('dashboard');
          appState.setActiveAdminTab('pedidos'); // Garante que abre na aba certa
          appState.setView('admin-dash');
          appState.setIsBusinessPortal(false);
          
          // A MÁGICA AQUI: Força a busca dos pedidos instantaneamente
          setTimeout(() => {
            if (adminData.fetchAdminOrders) {
              adminData.fetchAdminOrders(biz.id);
            }
          }, 100);
        }}
        onBack={() => appState.setIsBusinessPortal(false)}
      />
    );
  }

  // ─────────────────────────────────────────────
  //  Loading global (ações assíncronas)
  // ─────────────────────────────────────────────

  const globalLoadingOverlay = appState.isGlobalLoading
    ? <LoadingOverlay fullScreen />
    : null;

  // ─────────────────────────────────────────────
  //  Roteador de views
  // ─────────────────────────────────────────────

const renderView = () => {
 
   if (!appState.currentCondo || appState.view === 'landing-seller') {
      return (
        <LandingSeller
          onBack={() => {
            const hasSession = localStorage.getItem('maxi_user_v3');
            const lastSlug = localStorage.getItem('vizi_last_slug');
            
            if (appState.currentCondo) {
              // Se o condomínio já estiver carregado na memória atual, apenas muda a tela
              appState.setView(hasSession ? 'dashboard' : 'login');
            } else if (lastSlug) {
              // Se ele perdeu a memória (abriu nova aba), forçamos a hiperligação com o slug!
              window.location.href = `/?c=${lastSlug}`;
            } else {
              // Se for a primeira vez de sempre e não houver condomínio
              appState.setView('login');
            }
          }}
          currentCondo={appState.currentCondo}
        />
      );
    }
    // ────────────────────────────────────────────────────────────

    switch (appState.view) {
 

      // ── Tela de login do morador ──────────────
      case 'login':
        return (
          <LoginView
            currentCondo={appState.currentCondo}
            setView={appState.setView}
            handleLoginSubmit={authHandlers.handleLoginSubmit}
          />
        );

      // ── Confirmação de apartamento ────────────
      case 'confirm-login':
        if (!appState.tempUser) return null;
        return (
          <ConfirmLoginView
            tempUser={appState.tempUser}
            setView={appState.setView}
            handleConfirmLogin={authHandlers.handleConfirmLogin}
          />
        );

      // ── Dashboard (vitrine de lojas) ──────────
      case 'dashboard':
        return (
          <DashboardView
            user={customerData.user}
            businesses={customerData.businesses}
            allProducts={customerData.allProducts}
            userOrders={customerData.userOrders}
            cart={appState.cart}
            categoryFilter={appState.categoryFilter}
            setCategoryFilter={appState.setCategoryFilter}
            searchTerm={appState.searchTerm}
            setSearchTerm={appState.setSearchTerm}
            notificationCount={customerData.notificationCount}
            setNotificationCount={customerData.setNotificationCount}
            isRefreshing={customerData.isRefreshing}
            currentCondo={appState.currentCondo}
            onSelectBusiness={(biz) => {
              appState.setSelectedBusiness(biz);
              appState.setView('business');
            }}
	 
            onToggleFavorite={(e, bizId) =>
              authHandlers.handleToggleFavorite(e, bizId, customerData.user)
            }
            onRefresh={customerData.refreshCustomerData}
            onLogout={authHandlers.handleLogout}
            setView={appState.setView}
            activeTimeFilter={appState.activeTimeFilter}
            setActiveTimeFilter={appState.setActiveTimeFilter}
			
onRefreshOrders={async () => {
  if (customerData.user) {
    const orders = await customerData.fetchOrdersByApartment(
      customerData.user.block, 
      customerData.user.floor, 
      customerData.user.apartment
    );
    customerData.setUserOrders(orders);
  }
}}

          />
        );

      // ── Página de uma loja ────────────────────
      case 'business':
        if (!appState.selectedBusiness) {
          appState.setView('dashboard');
          return null;
        }
        return (
          <BusinessView
            user={customerData.user}
            selectedBusiness={appState.selectedBusiness}
            allProducts={customerData.allProducts}
            cart={appState.cart}
            appliedLoyalty={appState.appliedLoyalty}
            setAppliedLoyalty={appState.setAppliedLoyalty}
            productDetailModal={appState.productDetailModal}
            setProductDetailModal={appState.setProductDetailModal}
            showAboutModal={appState.showAboutModal}
            setShowAboutModal={appState.setShowAboutModal}
            onAddToCart={orderHandlers.addToCart}
            onClearCart={orderHandlers.handleClearCart}
            onFinalizeOrder={orderHandlers.finalizeOrder}
            handleAddReview={orderHandlers.handleAddReview}
            onToggleFavorite={(e, bizId) =>
              authHandlers.handleToggleFavorite(e, bizId, customerData.user)
            }
            onShareStore={authHandlers.handleShareStore}
            setView={appState.setView}
			onAddReview={orderHandlers.handleAddReview}
	
			
          />
        );

      // ── Carrinho (fallback; normalmente é modal na BusinessView) ──
      case 'cart':
        return (
          <CartView
            user={customerData.user}
            selectedBusiness={appState.selectedBusiness}
            cart={appState.cart}
            setCart={appState.setCart}
            appliedLoyalty={appState.appliedLoyalty}
            setAppliedLoyalty={appState.setAppliedLoyalty}
            setView={appState.setView}
            finalizeOrder={orderHandlers.finalizeOrder}
          />
        );

      // ── Painel admin do lojista ───────────────
      case 'admin-dash':
        if (!adminData.adminBusiness) return null;
        return (
          <AdminDashView
            // Negócio e condomínio
 
			adminCondo={adminData.adminCondo || appState.currentCondo}
			adminBusiness={adminData.adminBusiness}

            // Pedidos
            adminOrders={adminData.adminOrders}
            filteredAdminOrders={adminData.filteredAdminOrders || adminData.adminOrders || []} // ADICIONADO AQUI
            financeOrders={adminData.financeOrders}
            loadingOrders={adminData.loadingOrders}
            adminOrderFilter={adminData.adminOrderFilter}
            setAdminOrderFilter={adminData.setAdminOrderFilter}
            adminOrderSearchTerm={adminData.adminOrderSearchTerm}
            setAdminOrderSearchTerm={adminData.setAdminOrderSearchTerm}
            adminOrderPage={adminData.adminOrderPage}
            setAdminOrderPage={adminData.setAdminOrderPage}
            totalOrdersCount={adminData.totalOrdersCount}
            adminOrderStats={adminData.adminOrderStats}

            // Produtos
            adminProducts={adminData.adminProducts}
            adminCategories={adminData.adminCategories || []} // ADICIONADO AQUI
            editingProduct={adminData.editingProduct}
            setEditingProduct={adminData.setEditingProduct}
            productImageBase64={adminData.productImageBase64}
            isStockEnabled={adminData.isStockEnabled}
            setIsStockEnabled={adminData.setIsStockEnabled}
			onCategoryReorder={adminHandlers.handleCategoryReorder}

            // Clientes
            adminClients={adminData.adminClients}
            loadingClients={adminData.loadingClients}
            hasSearchedClients={adminData.hasSearchedClients}
            clientFilterBlock={adminData.clientFilterBlock}
            setClientFilterBlock={adminData.setClientFilterBlock}
            clientFilterStatus={adminData.clientFilterStatus}
            setClientFilterStatus={adminData.setClientFilterStatus}
            clientPage={adminData.clientPage}
            totalClientsCount={adminData.totalClientsCount}
            expandedClientId={adminData.expandedClientId}
            setExpandedClientId={adminData.setExpandedClientId}
            ITEMS_PER_PAGE={10} // ADICIONADO AQUI
			onEditClientPoints={adminHandlers.handleEditClientPoints}
			clientFilterFloor={adminData.clientFilterFloor}
			setClientFilterFloor={adminData.setClientFilterFloor}
			clientFilterUnit={adminData.clientFilterUnit}
			setClientFilterUnit={adminData.setClientFilterUnit}

            // Configuração da loja
            isStoreOpenConfig={adminData.isStoreOpenConfig}
            setIsStoreOpenConfig={adminData.setIsStoreOpenConfig} // <-- ADICIONADO
            loyaltyPointMode={adminData.loyaltyPointMode}
            setLoyaltyPointMode={adminData.setLoyaltyPointMode}   // <-- ADICIONADO
            businessHoursConfig={adminData.businessHoursConfig}
            setBusinessHoursConfig={adminData.setBusinessHoursConfig} // <-- ADICIONADO
            isLoyaltyEnabled={adminData.isLoyaltyEnabled}
            setIsLoyaltyEnabled={adminData.setIsLoyaltyEnabled}
            whatsappValue={adminData.whatsappValue}
            setWhatsappValue={adminData.setWhatsappValue}

            // Imagens
            adminLogoBase64={adminData.adminLogoBase64}
            adminBannerBase64={adminData.adminBannerBase64}
            logoFile={appState.logoFile}
            bannerFile={appState.bannerFile}

            // Financeiro
            finStartDate={adminData.finStartDate}
            setFinStartDate={adminData.setFinStartDate}
            finEndDate={adminData.finEndDate}
            setFinEndDate={adminData.setFinEndDate}
            finStatus={adminData.finStatus}
            setFinStatus={adminData.setFinStatus}
            finResults={adminData.finResults}
            finLoading={adminData.finLoading}
            finSearched={adminData.finSearched}
            finPage={adminData.finPage}
            setFinPage={adminData.setFinPage}
            financeStatusFilter={adminData.financeStatusFilter}
            setFinanceStatusFilter={adminData.setFinanceStatusFilter}
            financePaymentFilter={adminData.financePaymentFilter}
            setFinancePaymentFilter={adminData.setFinancePaymentFilter}
            adminDateStart={adminData.adminDateStart}
            setAdminDateStart={adminData.setAdminDateStart}
            adminDateEnd={adminData.adminDateEnd}
            setAdminDateEnd={adminData.setAdminDateEnd}
            FIN_ITEMS_PER_PAGE={10} // ADICIONADO AQUI
            reportData={adminData.reportData || { faturamento: 0, liquidados: 0, pendente: 0, pedidos: 0, ticketMedio: 0, history: [] }} // ADICIONADO AQUI

            // UI
            activeAdminTab={appState.activeAdminTab}
            setActiveAdminTab={appState.setActiveAdminTab}
            isAdminRefreshing={adminData.isAdminRefreshing}
            adminFormRef={appState.adminFormRef}
            setView={appState.setView}
            activeTimeFilter={adminData.activeTimeFilter}   
			setIsGlobalLoading={appState.setIsGlobalLoading}
			
			
            // Handlers
            onUpdateStatus={adminHandlers.handleAdminUpdateStatus}
            onUpdatePayment={adminHandlers.handleAdminUpdatePaymentStatus} 
            onFinalizeOrder={adminHandlers.handleAdminFinalizeOrder} 
            onDeleteReview={adminHandlers.handleAdminDeleteReview}
            onProductSave={adminHandlers.handleProductSave}
            onProductDelete={adminHandlers.handleProductDelete}
            onProductToggleVisibility={adminHandlers.handleProductToggleVisibility || (() => {})} 
            onStartEdit={adminHandlers.handleStartEdit || (() => {})} 
            resetProductForm={adminHandlers.resetProductForm || (() => {})} 
            onImageUpload={adminHandlers.handleImageUpload}
            uploadToStorage={adminHandlers.uploadToStorage || (async () => null)} 
            onConfigSave={adminHandlers.handleConfigSave}
            onBusinessHoursSave={adminHandlers.handleBusinessHoursSave}
            onFilterClients={adminData.handleFilterClients}
            onCategoryReorder={adminHandlers.handleCategoryReorder}
            onPageChange={adminData.handlePageChange}
            onFinancialSearch={adminData.handleFinancialSearch}
            onRefresh={adminData.refreshAdminData}
            setTimeFilter={adminData.setTimeFilter}
            formatWhatsApp={(v: string) => v.replace(/\D/g, '')} 
            onLogout={() => {
              adminData.setAdminBusiness(null);
              appState.setView('login');
            }}
            
            // Duplicados necessários pela interface do AdminDashViewProps
            refreshAdminData={adminData.refreshAdminData}
            handleAdminUpdateStatus={adminHandlers.handleAdminUpdateStatus}
            handleAdminUpdatePaymentStatus={adminHandlers.handleAdminUpdatePaymentStatus} // CORRIGIDO AQUI (Nome exato)
            handleAdminFinalizeOrder={adminHandlers.handleAdminFinalizeOrder}
            handleProductSave={adminHandlers.handleProductSave}
            handleProductDelete={adminHandlers.handleProductDelete}
            handleProductToggleVisibility={adminHandlers.handleProductToggleVisibility || (() => {})}
            handleStartEdit={adminHandlers.handleStartEdit || (() => {})}
            handleImageUpload={adminHandlers.handleImageUpload}
            handleAdminDeleteReview={adminHandlers.handleAdminDeleteReview}
            handleFilterClients={adminData.handleFilterClients}
            handleFinancialSearch={adminData.handleFinancialSearch}
            handleCategoryReorder={adminHandlers.handleCategoryReorder}
			handleEditClientPoints={adminHandlers.handleEditClientPoints}
          />
        );
 
		case 'my-orders':
        if (!customerData.user) return null;
        return (
          <MyOrdersView
            user={customerData.user}
            userOrders={customerData.userOrders}
            businesses={customerData.businesses}
            setView={appState.setView}
          />
        );

      // ── Página do vendedor / cadastro lojista ─
     case 'landing-seller':
        return (
          <LandingSeller
            onBack={() => {
              const hasSession = localStorage.getItem('maxi_user_v3');
              const lastSlug = localStorage.getItem('vizi_last_slug');
              
              if (appState.currentCondo) {
                // Se o condomínio já estiver carregado na memória atual, apenas muda a tela
                appState.setView(hasSession ? 'dashboard' : 'login');
              } else if (lastSlug) {
                // Se ele perdeu a memória (abriu nova aba), forçamos a hiperligação com o slug!
                window.location.href = `/?c=${lastSlug}`;
              } else {
                // Se for a primeira vez de sempre e não houver condomínio
                appState.setView('login');
              }
            }}
            currentCondo={appState.currentCondo}
          />
        );

      default:
        return <LoginView
          currentCondo={appState.currentCondo}
          setView={appState.setView}
          handleLoginSubmit={authHandlers.handleLoginSubmit}
        />;
    }
  };

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────

return (
    <>
      {globalLoadingOverlay}
      
      <Suspense fallback={<LoadingOverlay />}>
        {renderView()}
      </Suspense>
    </>
  );
}