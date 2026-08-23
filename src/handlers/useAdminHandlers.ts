import { useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { dbInstance } from "../../db";
import { Business, Product, Order, OrderStatus, Review } from '../types';
import { User } from '../types';
import { compressImage } from '../components/StoreProducts';
import { getLocalISODate } from '../components/shared';
import { TimeFilter } from './useAppState';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

type AdminTab = 'pedidos' | 'cardapio' | 'relatorio' | 'config' | 'avaliacoes' | 'clientes';

interface UseAdminHandlersParams {
  // Empresa
  adminBusiness:        Business | null;
  setAdminBusiness:     (b: Business) => void;
  adminProducts:        Product[];

  // Pedidos
  adminOrders:          Order[];
  setAdminOrders:       (fn: (prev: Order[]) => Order[]) => void;
  financeOrders:        Order[];
  setFinanceOrders:     (fn: (prev: Order[]) => Order[]) => void;
  adminOrderSearchTerm: string;
  adminOrderFilter:     OrderStatus | 'todos' | 'ativos';
  activeAdminTab:       AdminTab;

  // Relatório / datas
  adminDateStart:       string;
  adminDateEnd:         string;
  setAdminDateStart:    (d: string) => void;
  setAdminDateEnd:      (d: string) => void;
  setActiveTimeFilter:  (f: TimeFilter) => void;

  // Produto em edição
  editingProduct:       Partial<Product> | null;
  setEditingProduct:    (p: Partial<Product> | null) => void;
  productImageBase64:   string | null;
  setProductImageBase64:(v: string | null) => void;
  adminLogoBase64:      string | null;
  setAdminLogoBase64:   (v: string | null) => void;
  adminBannerBase64:    string | null;
  setAdminBannerBase64: (v: string | null) => void;
  isStockEnabled:       boolean;
  setIsStockEnabled:    (v: boolean) => void;
  adminFormRef:         React.RefObject<HTMLFormElement>;

  // Upload
  productFile:          File | null;
  setProductFile:       (f: File | null) => void;
  logoFile:             File | null;
  setLogoFile:          (f: File | null) => void;
  bannerFile:           File | null;
  setBannerFile:        (f: File | null) => void;

  // Loja cliente
  selectedBusiness:     Business | null;
  setSelectedBusiness:  (b: Business) => void;
  setBusinesses:        (fn: (prev: Business[]) => Business[]) => void;
  user:                 User | null;

  // Funções externas
  fetchAdminOrders:        () => Promise<void>;
  handleFinancialSearch:   (resetPage?: boolean) => Promise<void>;
  refreshAdminData:        (signal?: AbortSignal, target?: string) => Promise<void>;
  
  handleFilterClients?:    (page?: number) => void; // <--- ADICIONE ESTA
  clientPage?:             number;                  // <--- ADICIONE ESTA

  // Loading
  setIsGlobalLoading:   (v: boolean) => void;
  
  
  isStoreOpenConfig:    boolean;
  loyaltyPointMode:     'por_valor' | 'por_item';
  businessHoursConfig:  any; // Pode usar o tipo correto BusinessHours se o tiver importado
  isLoyaltyEnabled:     boolean;
  whatsappValue:        string;
  
  
}

// ─────────────────────────────────────────────
//  Utilitário interno — parse seguro de reviews
// ─────────────────────────────────────────────

const parseReviews = (raw: any): Review[] => {
  try {
    return typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
  } catch {
    return [];
  }
};

const calcAvgRating = (reviews: Review[]): number =>
  reviews.length > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
    : 5.0;

// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

export function useAdminHandlers({
  adminBusiness,
  setAdminBusiness,
  adminProducts,
  adminOrders,
  setAdminOrders,
  financeOrders,
  setFinanceOrders,
  adminOrderSearchTerm,
  adminOrderFilter,
  activeAdminTab,
  adminDateStart,
  adminDateEnd,
  setAdminDateStart,
  setAdminDateEnd,
  setActiveTimeFilter,
  editingProduct,
  setEditingProduct,
  productImageBase64,
  setProductImageBase64,
  adminLogoBase64,
  setAdminLogoBase64,
  adminBannerBase64,
  setAdminBannerBase64,
  isStockEnabled,
  setIsStockEnabled,
  adminFormRef,
  productFile,
  setProductFile,
  logoFile,
  setLogoFile,
  bannerFile,
  setBannerFile,
  selectedBusiness,
  setSelectedBusiness,
  setBusinesses,
  user,
  fetchAdminOrders,
  handleFinancialSearch,
  refreshAdminData,
  handleFilterClients, // <--- ADICIONE ESTA
  clientPage,          // <--- ADICIONE ESTA
  setIsGlobalLoading,
  isStoreOpenConfig,
  loyaltyPointMode,
  businessHoursConfig,
  isLoyaltyEnabled,
  whatsappValue,
  
}: UseAdminHandlersParams) {

  // ─────────────────────────────────────────────
  //  Avaliações
  // ─────────────────────────────────────────────

  /** Morador avalia a loja selecionada. */
  const handleAddReview = async () => {
    if (!user || !selectedBusiness) return;

    const { value: formValues } = await Swal.fire({
      title: 'Avaliar Loja',
      html:
        '<div class="flex flex-col gap-4 text-left">' +
        '<label class="text-[10px] font-black uppercase text-slate-400">Quantas estrelas?</label>' +
        '<select id="swal-rating" class="w-full bg-slate-50 border-none rounded-xl p-4 font-black outline-none">' +
          '<option value="5">⭐⭐⭐⭐⭐ (Excelente)</option>' +
          '<option value="4">⭐⭐⭐⭐ (Muito Bom)</option>' +
          '<option value="3">⭐⭐⭐ (Bom)</option>' +
          '<option value="2">⭐⭐ (Regular)</option>' +
          '<option value="1">⭐ (Poderia Melhorar)</option>' +
        '</select>' +
        '<label class="text-[10px] font-black uppercase text-slate-400">O que achou?</label>' +
        '<textarea id="swal-comment" placeholder="Sua opinião sincera..." class="w-full bg-slate-50 border-none rounded-xl p-4 font-bold outline-none h-24 resize-none"></textarea>' +
        '</div>',
      showCancelButton: true,
      confirmButtonText: 'Enviar Avaliação',
      preConfirm: () => ({
        rating:  Number((document.getElementById('swal-rating')  as HTMLSelectElement).value),
        comment: (document.getElementById('swal-comment') as HTMLTextAreaElement).value,
      }),
    });

    if (!formValues) return;

    setIsGlobalLoading(true);
    try {
      const newReview: Review = {
        id:       crypto.randomUUID(),
        userName: user.name,
        rating:   formValues.rating,
        comment:  formValues.comment,
        date:     Date.now(),
      };

      const currentReviews  = parseReviews(selectedBusiness.reviews);
      const updatedReviews  = [newReview, ...currentReviews];
      const newRating       = calcAvgRating(updatedReviews);

      const { error } = await supabase
        .from('empresas')
        .update({ reviews: JSON.stringify(updatedReviews), rating: newRating })
        .eq('id', selectedBusiness.id);

      if (error) throw error;

      const updatedBiz = { ...selectedBusiness, reviews: JSON.stringify(updatedReviews), rating: newRating };
      setSelectedBusiness(updatedBiz);
      setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));

      Swal.fire({ icon: 'success', title: 'Avaliação enviada!', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
    } catch (error) {
      console.error(error);
      Swal.fire('Erro', 'Não foi possível salvar sua avaliação.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  /** Admin exclui uma avaliação da sua loja. */
  const handleAdminDeleteReview = async (reviewId: string) => {
    if (!adminBusiness) return;

    const res = await Swal.fire({
      title: 'Excluir Avaliação?',
      text: 'O comentário será removido permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
    });

    if (!res.isConfirmed) return;

    const currentReviews = parseReviews(adminBusiness.reviews);
    const updatedReviews = currentReviews.filter((r: Review) => r.id !== reviewId);
    const newRating      = calcAvgRating(updatedReviews);

    const updatedBusiness = { ...adminBusiness, reviews: JSON.stringify(updatedReviews), rating: newRating };

    const { error } = await supabase
      .from('empresas')
      .update({ reviews: updatedBusiness.reviews, rating: updatedBusiness.rating })
      .eq('id', adminBusiness.id);
    if (!error) {
      setAdminBusiness(updatedBusiness);
      Swal.fire({ icon: 'success', title: 'Removida!', timer: 800, showConfirmButton: false, toast: true, position: 'top-end' });
    }
  };






/** Salva configurações da loja e do programa de fidelidade. */
  /** Salva configurações da loja e do programa de fidelidade. */
  const handleConfigSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminBusiness) return;
    const fd = new FormData(e.currentTarget);
    
    const newName        = (document.getElementById('edit-business-name')        as HTMLInputElement)?.value  || adminBusiness.name;
    const newSubCategory = (document.getElementById('edit-business-subcategory') as HTMLInputElement)?.value  || adminBusiness.subCategory;
    const newDescription = (document.getElementById('edit-business-description') as HTMLTextAreaElement)?.value || adminBusiness.description;
    const whatsappClean  = whatsappValue.replace(/\D/g, '');

    if (whatsappClean.length < 11) { 
        Swal.fire({ title: 'WhatsApp Inválido', text: 'O número é obrigatório (11 dígitos).', icon: 'warning' }); 
        return; 
    }

    const querPix      = fd.get('pay_pix') === 'on';
    const chavePixValue = fd.get('chavePix') as string;
    if (querPix && !chavePixValue) { 
        Swal.fire({ title: 'Chave PIX Ausente', text: 'Insira a chave para receber via PIX.', icon: 'warning' }); 
        return; 
    }

    setIsGlobalLoading(true);
    try {
      let finalLogoUrl   = adminBusiness.image;
      let finalBannerUrl = adminBusiness.bannerUrl;

      if (logoFile)   { const u = await uploadToStorage(logoFile,   'logos');   if (u) finalLogoUrl   = u; }
      if (bannerFile) { const u = await uploadToStorage(bannerFile, 'banners'); if (u) finalBannerUrl = u; }

      const metodos: any[] = []; 
      if (fd.get('pay_pix'))   metodos.push('PIX');
      if (fd.get('pay_money')) metodos.push('Dinheiro');
      if (fd.get('pay_card'))  metodos.push('Cartão');

      // Puxar valores do formulário com segurança (evitar NaN se estiverem ocultos na View)
      const metaPontosRaw = fd.get('metaPontos');
      const valorRecompensaRaw = fd.get('valorRecompensa');
      const tipoRecompensaRaw = fd.get('tipoRecompensa');

      const updated: Business = {
        ...adminBusiness,
        name: newName, 
        subCategory: newSubCategory, 
        description: newDescription,
        image: finalLogoUrl, 
        bannerUrl: finalBannerUrl,
 
        businessHours: businessHoursConfig || {
            monday: { open: '08:00', close: '18:00', enabled: true, is24h: false },
            tuesday: { open: '08:00', close: '18:00', enabled: true, is24h: false },
            wednesday: { open: '08:00', close: '18:00', enabled: true, is24h: false },
            thursday: { open: '08:00', close: '18:00', enabled: true, is24h: false },
            friday: { open: '08:00', close: '18:00', enabled: true, is24h: false },
            saturday: { open: '08:00', close: '12:00', enabled: true, is24h: false },
            sunday: { open: '08:00', close: '12:00', enabled: false, is24h: false }
        },
        status:   { 
            aberto: isStoreOpenConfig, 
            mensagemAusencia: (fd.get('mensagemAusencia') as string) || '' 
        },
        pagamento:{ 
            ...adminBusiness.pagamento, 
            chavePix: chavePixValue, 
            metodosAceitos: metodos 
        },
        social:   {
            instagram: fd.get('insta') as string,
            facebook: fd.get('fb') as string,
            whatsapp: whatsappClean,
            website: fd.get('website') as string,
        },
        loyalty:  { 
            ...adminBusiness.loyalty, 
            ativo: isLoyaltyEnabled, 
            tipoPontuacao: loyaltyPointMode, 
            metaPontos: metaPontosRaw ? parseInt(metaPontosRaw as string) : adminBusiness.loyalty.metaPontos, 
            tipoRecompensa: (tipoRecompensaRaw as any) || adminBusiness.loyalty.tipoRecompensa, 
            valorRecompensa: valorRecompensaRaw ? parseFloat(valorRecompensaRaw as string) : adminBusiness.loyalty.valorRecompensa 
        },
      };

      // Limpeza de campos fantasmas (para evitar que o Supabase rejeite)
      if(updated.hasOwnProperty('phone')){
          delete (updated as any).phone;
      }

      // Envia só as colunas operacionais que o lojista tem permissão de editar
      // (licenseStatus/tipoPlano/dataVencimento são controlados só pelo master admin).
      const { error } = await supabase
        .from('empresas')
        .update({
          name: updated.name,
          subCategory: updated.subCategory,
          description: updated.description,
          image: updated.image,
          bannerUrl: updated.bannerUrl,
          businessHours: updated.businessHours,
          status: updated.status,
          pagamento: updated.pagamento,
          social: updated.social,
          loyalty: updated.loyalty,
        })
        .eq('id', adminBusiness.id);
      
      if (error) throw error;

      setAdminBusiness(updated);
      setLogoFile(null);
      setBannerFile(null);
      Swal.fire('Sincronizado!', 'Configurações atualizadas com sucesso.', 'success');
    } catch (error) {
      console.log("Erro ao salvar configuração no banco: ", error); 
      Swal.fire('Erro', 'Falha ao salvar configurações. Consulte o console.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };
  
  
  
  // ─────────────────────────────────────────────
  //  Pedidos — atualização de status e pagamento
  // ─────────────────────────────────────────────

  /** Atualiza status do pedido com atualização otimista + estorno de estoque/pontos no cancelamento. */
const handleAdminUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
      const now = Date.now();
      // Procuramos o pedido tanto na esteira quanto no financeiro para garantir a atualização otimista
      const order = adminOrders.find(o => o.id === orderId) || financeOrders.find(o => o.id === orderId);
      if (!order) return;

      const oldStatus = order.status;

      // 1. Atualização otimista na Esteira
      setAdminOrders(prev => prev.map(o => 
          o.id === orderId ? { 
              ...o, 
              status: newStatus,
              finishedAt: (newStatus === 'concluido' || newStatus === 'cancelado') ? now : o.finishedAt 
          } : o
      ));

      // 2. Atualização otimista no Financeiro (para refletir na tabela do relatório)
      setFinanceOrders(prev => prev.map(o => 
          o.id === orderId ? { 
              ...o, 
              status: newStatus,
              finishedAt: (newStatus === 'concluido' || newStatus === 'cancelado') ? now : o.finishedAt 
          } : o
      ));
      
      try {
          // --- LÓGICA DE CANCELAMENTO (ESTORNO) ---
          if (newStatus === 'cancelado' && oldStatus !== 'cancelado') {
              for (const item of order.items) {
                  if (item.product.controlaEstoque) {
                      const { data: currentProd } = await supabase
                          .from('produtos')
                          .select('estoqueAtual')
                          .eq('id', item.product.id)
                          .single();

                      if (currentProd) {
                          await supabase
                              .from('produtos')
                              .update({ estoqueAtual: currentProd.estoqueAtual + item.quantity })
                              .eq('id', item.product.id);
                      }
                  }
              }

              // Estorno dos pontos recalculado no servidor via RPC (não confia em valores do cliente)
              await supabase.rpc('admin_reverse_order_points', { input_order_id: orderId });
          }

          // 3. Atualizar o Pedido no Banco
          await supabase
              .from('pedidos')
              .update({ 
                  status: newStatus, 
                  finishedAt: (newStatus === 'concluido' || newStatus === 'cancelado') ? now : order.finishedAt,
                  paymentStatus: (newStatus === 'concluido' ? 'pago' : order.paymentStatus)
              })
              .eq('id', orderId);

          Swal.fire({ icon: 'success', title: 'Status Atualizado', timer: 1000, toast: true, position: 'top-end', showConfirmButton: false });
          
          // 4. RECARGAS DE DADOS
          fetchAdminOrders(); // Atualiza a esteira

          // Se estiver na aba de relatório, sincroniza os dados da busca financeira
          if (activeAdminTab === 'relatorio') {
              handleFinancialSearch(false);
          }

      } catch (error) {
          console.error("Erro no status:", error);
          fetchAdminOrders(); 
          if (activeAdminTab === 'relatorio') handleFinancialSearch(false);
          Swal.fire('Erro', 'Falha ao sincronizar.', 'error');
      }
  };
  
  
  /** Altera status de pagamento (pago / pendente) com atualização otimista. */
 const handleAdminUpdatePaymentStatus = async (orderId: string, newPaymentStatus: 'pago' | 'pendente') => {
      // Atualização otimista visual imediata em ambos os estados
      const updateLabel = (prev: Order[]) => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o);
      setAdminOrders(updateLabel);
      setFinanceOrders(updateLabel);

      try {
          // 1. Atualiza no Supabase
          const { error } = await supabase
              .from('pedidos')
              .update({ paymentStatus: newPaymentStatus })
              .eq('id', orderId);

          if (error) throw error;

          // 2. RECARGAS DE DADOS
          fetchAdminOrders(); // Atualiza a esteira

          // Se estiver na aba de relatório, sincroniza a busca financeira para atualizar os totais
          if (activeAdminTab === 'relatorio') {
              handleFinancialSearch(false);
          }

          Swal.fire({ icon: 'success', title: 'Pagamento Atualizado!', timer: 800, toast: true, position: 'top-end', showConfirmButton: false });
      } catch (error) {
          console.error("Erro ao atualizar pagamento:", error);
          fetchAdminOrders();
          if (activeAdminTab === 'relatorio') handleFinancialSearch(false);
          Swal.fire('Erro', 'Não foi possível atualizar o pagamento.', 'error');
      }
  };
  
  /** Conclui e marca como pago de uma vez (atalho rápido). */
const handleAdminFinalizeOrder = async (orderId: string) => {
      const now = Date.now();
      // Move para concluído localmente de imediato com a data de finalização
      setAdminOrders(prev => prev.map(o => 
          o.id === orderId ? { ...o, status: 'concluido', paymentStatus: 'pago', finishedAt: now } : o
      ));
      
      try {
          const order = adminOrders.find(o => o.id === orderId);
          if (!order) return;
          // update (não upsert): upsert também exige permissão de INSERT, que só o morador tem
          const { error } = await supabase
              .from('pedidos')
              .update({ status: 'concluido', paymentStatus: 'pago', finishedAt: now })
              .eq('id', orderId);
          if (error) throw error;
          Swal.fire({ icon: 'success', title: 'Concluído!', timer: 1000, toast: true, position: 'top-end', showConfirmButton: false });
      } catch (error) {
          refreshAdminData();
      }
  };

  // ─────────────────────────────────────────────
  //  Imagens — upload e preview
  // ─────────────────────────────────────────────

  /** Comprime imagem e gera preview blob URL antes do upload definitivo. */
  const handleImageUpload = async (
    e: React.FormEvent<HTMLInputElement>,
    target: 'product' | 'logo' | 'banner',
  ) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setIsGlobalLoading(true);
    try {
      const compressed  = await compressImage(file, 1024, 0.7);
      const previewUrl  = URL.createObjectURL(compressed);

      if (target === 'product') {
        if (productImageBase64?.startsWith('blob:')) URL.revokeObjectURL(productImageBase64);
        setProductFile(compressed);
        setProductImageBase64(previewUrl);
      } else if (target === 'logo') {
        if (adminLogoBase64?.startsWith('blob:')) URL.revokeObjectURL(adminLogoBase64);
        setLogoFile(compressed);
        setAdminLogoBase64(previewUrl);
      } else if (target === 'banner') {
        if (adminBannerBase64?.startsWith('blob:')) URL.revokeObjectURL(adminBannerBase64);
        setBannerFile(compressed);
        setAdminBannerBase64(previewUrl);
      }
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      Swal.fire('Erro', 'Não foi possível processar esta imagem.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  /** Faz upload de um arquivo para o bucket Supabase e retorna a URL pública.
   *  O caminho inclui o id da empresa dona do arquivo — a policy do Storage exige
   *  que esse segmento corresponda a uma empresa do usuário autenticado. */
  const uploadToStorage = async (file: File, folder: string): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const filePath = `${folder}/${adminBusiness.id}/${fileName}`;

    const { error } = await supabase.storage.from('vizi-assets').upload(filePath, file);
    if (error) { console.error('Erro no upload:', error); return null; }

    const { data: publicUrl } = supabase.storage.from('vizi-assets').getPublicUrl(filePath);
    return publicUrl.publicUrl;
  };

  // ─────────────────────────────────────────────
  //  Produtos — CRUD
  // ─────────────────────────────────────────────

  /** Reseta formulário de produto para o estado vazio. */
  const resetProductForm = () => {
    setEditingProduct(null);
    setProductImageBase64(null);
    setIsStockEnabled(false);
    if (adminFormRef.current) adminFormRef.current.reset();
  };

  /** Salva produto novo ou editado. */
  const handleProductSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminBusiness) return;

    setIsGlobalLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      let finalImageUrl = editingProduct?.image || 'https://placehold.co/500x500';
      if (productFile) {
        const uploadedUrl = await uploadToStorage(productFile, 'products');
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const isQuote = fd.get('isQuoteOnly') === 'on';

      const product: Product = {
        id:             (editingProduct?.id as string) || crypto.randomUUID(),
        empresaId:      adminBusiness.id,
        condominioId:   adminBusiness.condominioId,
        name:           fd.get('name') as string,
        price:          isQuote ? 0 : parseFloat(fd.get('price') as string) || 0,
        category:       fd.get('category') as string,
        description:    fd.get('description') as string,
        image:          finalImageUrl,
        isQuoteOnly:    isQuote,
        isPromotion:    editingProduct?.isPromotion || false,
        pontosGanhos:   adminBusiness.loyalty.tipoPontuacao === 'por_item'
                          ? parseInt(fd.get('pontosGanhos') as string || '0')
                          : 0,
        controlaEstoque: isQuote ? false : isStockEnabled,
        estoqueAtual:    isStockEnabled ? parseInt(fd.get('estoqueAtual') as string || '0') : 0,
        isVisible:       editingProduct ? (editingProduct.isVisible ?? true) : true,
      };

      await dbInstance.put('produtos', product);
      setProductFile(null);
      resetProductForm();
      refreshAdminData();

      Swal.fire({ icon: 'success', title: 'Produto Salvo!', timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire('Erro', error.message || 'Falha ao salvar produto.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  /** Exclui produto após confirmação. */
  const handleProductDelete = async (productId: string) => {
    const res = await Swal.fire({
      title: 'Excluir Item?',
      text: 'Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Não',
    });

    if (res.isConfirmed) {
      await dbInstance.delete('produtos', productId);
      refreshAdminData();
      Swal.fire({ icon: 'success', title: 'Excluído!', timer: 800, showConfirmButton: false, toast: true, position: 'top-end' });
    }
  };

  /** Alterna visibilidade do produto no catálogo. */
  const handleProductToggleVisibility = async (product: Product) => {
    const updated = { ...product, isVisible: !product.isVisible };
    await dbInstance.put('produtos', updated);
    refreshAdminData();
    Swal.fire({
      icon: 'success',
      title: updated.isVisible ? 'Item Visível' : 'Item Oculto',
      timer: 800,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
    });
  };

  /** Carrega produto para edição no formulário com scroll suave. */
  const handleStartEdit = (product: Product) => {
    setEditingProduct(null);
    setTimeout(() => {
      setEditingProduct(product);
      setProductImageBase64(null);
      setIsStockEnabled(product.controlaEstoque);
      adminFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 10);
  };
  
    /** Atualiza a ordem das categorias (Drag and Drop) */
  const handleCategoryReorder = async (newOrder: string[]) => {
    if (!adminBusiness) return;

    // 1. Atualização Otimista (Muda na tela na hora)
    setAdminBusiness({ ...adminBusiness, categoryOrder: newOrder });

    try {
      // 2. Salva no banco em background
      const { error } = await supabase
        .from('empresas')
        .update({ categoryOrder: newOrder })
        .eq('id', adminBusiness.id);

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao reordenar:", error);
      Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar a nova ordem.', toast: true, position: 'top-end', timer: 3000 });
    }
  };

  // ─────────────────────────────────────────────
  //  Relatório — filtros de tempo
  // ─────────────────────────────────────────────

  /** Define o intervalo de datas do relatório por atalho de período. */
  const setTimeFilter = (type: TimeFilter) => {
    const today = new Date();
    setActiveTimeFilter(type);

    if (type === 'today') {
      const d = getLocalISODate(today);
      setAdminDateStart(d);
      setAdminDateEnd(d);
    } else if (type === 'week') {
      const start = new Date();
      start.setDate(today.getDate() - 6);
      setAdminDateStart(getLocalISODate(start));
      setAdminDateEnd(getLocalISODate(today));
    } else if (type === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setAdminDateStart(getLocalISODate(start));
      setAdminDateEnd(getLocalISODate(end));
    } else {
      setAdminDateStart('2024-01-01');
      setAdminDateEnd(getLocalISODate(today));
    }
  };

  // ─────────────────────────────────────────────
  //  Utilitários de UI
  // ─────────────────────────────────────────────

  const handleCopyPix = (key: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key).then(() =>
      Swal.fire({ icon: 'success', title: 'Chave PIX Copiada!', text: key, timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' })
    );
  };

  const handleDownloadAsset = async (url: string, filename: string) => {
    try {
      const blob = await fetch(url).then(r => r.blob());
      const link = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: filename,
      });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      Swal.fire('Erro', 'Não foi possível baixar a imagem.', 'error');
    }
  };

  const formatWhatsApp = (value: string): string => {
    const nums = value.replace(/\D/g, '');
    if (nums.length <= 11) {
      return nums
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    }
    return nums.substring(0, 11);
  };

  // ─────────────────────────────────────────────
  //  useMemo — dados derivados de pedidos
  // ─────────────────────────────────────────────

  /** Pedidos filtrados para a esteira (busca + status + regras de tempo). */
  const filteredAdminOrders = useMemo(() => {
    const agora = new Date();
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();

    return adminOrders.filter(o => {
      // 1. Proteção no termo de busca
      const term = (adminOrderSearchTerm || '').toLowerCase();
      
      // 2. Proteção nas propriedades do pedido (userName, userTag e id)
      const searchMatch = (o.userName || '').toLowerCase().includes(term) || 
                          (o.userTag || '').toLowerCase().includes(term) ||
                          (o.id || '').toLowerCase().includes(term);
      
      if (!searchMatch) return false;

      const isResolvido = ['concluido', 'cancelado'].includes(o.status);
      const isHoje = o.createdAt >= inicioDoDia || (o.finishedAt && o.finishedAt >= inicioDoDia);

      if (adminOrderFilter === 'ativos') return !isResolvido;
      if (adminOrderFilter === 'todos') return isHoje || !isResolvido;

      if (o.status === adminOrderFilter) {
          if (isResolvido) return isHoje;
          return true;
      }

      return false;
    });
  }, [adminOrders, adminOrderSearchTerm, adminOrderFilter]);
  /** Contadores de status para os badges da esteira. */
  const orderStatusStats = useMemo(() => {
    const stats = { ativos: 0, pendente: 0, preparando: 0, saiu_entrega: 0, entregue_aguardando_pagamento: 0, concluido: 0, cancelado: 0 };
    adminOrders.forEach(o => {
      if (o.status !== 'concluido' && o.status !== 'cancelado') stats.ativos++;
      if (stats.hasOwnProperty(o.status)) (stats as any)[o.status]++;
    });
    return stats;
  }, [adminOrders]);

  /** Categorias únicas dos produtos para o filtro do cardápio. */
const adminCategories = useMemo(() => {
    const cats = new Set(adminProducts.map(p => p.category).filter(Boolean));
    const catArray = Array.from(cats) as string[];

    // Proteção extra: Garante que a ordem é sempre lida como uma Lista (Array)
    let savedOrder = adminBusiness?.categoryOrder || [];
    if (typeof savedOrder === 'string') {
        try { savedOrder = JSON.parse(savedOrder); } catch(e) { savedOrder = []; }
    }
    if (!Array.isArray(savedOrder)) savedOrder = [];

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

  /** Dados consolidados do relatório financeiro para o período selecionado. */
  const reportData = useMemo(() => {
    const start = new Date(adminDateStart + 'T00:00:00').getTime();
    const end   = new Date(adminDateEnd   + 'T23:59:59').getTime();

    const ordersInPeriod = financeOrders.filter(o => {
      const ref = (o.status === 'concluido' && o.finishedAt) ? o.finishedAt : o.createdAt;
      return ref >= start && ref <= end;
    });

    const sorted      = [...ordersInPeriod].sort((a, b) => (b.finishedAt || b.createdAt) - (a.finishedAt || a.createdAt));
    const valid       = sorted.filter(o => o.status !== 'cancelado');
    const faturamento = valid.reduce((acc, o) => acc + o.total, 0);

    return {
      faturamento,
      pendente:       valid.filter(o => o.paymentStatus === 'pendente').reduce((acc, o) => acc + o.total, 0),
      liquidados:     valid.filter(o => o.paymentStatus === 'pago').reduce((acc, o) => acc + o.total, 0),
      totalCancelado: ordersInPeriod.filter(o => o.status === 'cancelado').reduce((acc, o) => acc + o.total, 0),
      pedidos:        valid.length,
      ticketMedio:    valid.length > 0 ? faturamento / valid.length : 0,
      history:        sorted,
    };
  }, [financeOrders, adminDateStart, adminDateEnd]);
  
  
  
  /** Edita manualmente a pontuação de um cliente */
const handleEditClientPoints = async (userId: string, currentPoints: number) => {
    if (!adminBusiness) return;

    // Abre uma janela bonita pedindo o novo valor
    const { value: newPointsStr } = await Swal.fire({
      title: 'Editar Pontos',
      input: 'number',
      inputLabel: 'Nova quantidade de pontos do cliente:',
      inputValue: currentPoints,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (value === '' || parseInt(value) < 0) {
          return 'Insira um número válido (0 ou maior)';
        }
      }
    });

    if (newPointsStr !== undefined) {
      // CORREÇÃO AQUI: removido o props.
      if (setIsGlobalLoading) setIsGlobalLoading(true); 
      
      try {
        const newPoints = parseInt(newPointsStr);

        // Atualização validada no servidor via RPC (garante que a loja só edita clientes do próprio condomínio)
        const { error: updateError } = await supabase.rpc('admin_set_client_points', {
          input_user_id: userId,
          input_business_id: adminBusiness.id,
          input_new_points: newPoints,
        });

        if (updateError) throw updateError;

        Swal.fire({ icon: 'success', title: 'Pontuação atualizada!', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
        
        // 4. Atualiza a tela para mostrar os novos pontos
        // CORREÇÃO AQUI: removido o props.
        if (handleFilterClients) handleFilterClients(clientPage); 
        
      } catch (error) {
        console.error("Erro ao editar pontos:", error);
        Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível salvar os pontos.' });
      } finally {
        // CORREÇÃO AQUI: removido o props.
        if (setIsGlobalLoading) setIsGlobalLoading(false); 
      }
    }
  };
  // ─────────────────────────────────────────────
  //  Retorno
  // ─────────────────────────────────────────────

  return {
    // Avaliações
    handleAddReview,
    handleAdminDeleteReview,

    // Pedidos
    handleAdminUpdateStatus,
    handleAdminUpdatePaymentStatus,
    handleAdminFinalizeOrder,

    // Imagens
    handleImageUpload,
    uploadToStorage,

    // Produtos
    resetProductForm,
    handleProductSave,
    handleProductDelete,
    handleProductToggleVisibility,
    handleStartEdit,
	handleCategoryReorder,
	handleConfigSave,
    // Relatório
    setTimeFilter,
    reportData,

    // Dados derivados (memos)
    filteredAdminOrders,
    orderStatusStats,
    adminCategories,

    // Utilitários
    handleCopyPix,
    handleDownloadAsset,
    formatWhatsApp,
	handleEditClientPoints,
  };
}