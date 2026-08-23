import Swal from 'sweetalert2';
import { supabase } from "../../db";
import { User, Business, Product, CartItem, Order, PaymentMethod } from '../types';
import { ViewType } from './useAppState';

// Escapa texto controlado pelo lojista/usuário antes de interpolar em templates `html:` do SweetAlert2
// (que renderiza HTML de verdade, não texto — sem isso vira um vetor de XSS armazenado).
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

interface UseOrderHandlersParams {
  // Usuário
  user:             User | null;
  setUser:          (u: User) => void;

  // Loja
  selectedBusiness: Business | null;
  setView:          (v: ViewType) => void;

  // Carrinho
  cart:             CartItem[];
  setCart:          (c: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  appliedLoyalty:   boolean;
  setAppliedLoyalty:(v: boolean) => void;

  // Loading
  setIsGlobalLoading: (v: boolean) => void;
}

// ─────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────

export function useOrderHandlers({
  user,
  setUser,
  selectedBusiness,
  cart,
  setCart,
  appliedLoyalty,
  setAppliedLoyalty,
  setUserOrders,
  setView,
  currentCondo,
  setIsGlobalLoading,
  setSelectedBusiness, // <--- ADICIONE ESTA LINHA AQUI
  setBusinesses,       // <--- ADICIONE ESTA LINHA AQUI
}: any) {

  // ─────────────────────────────────────────────
  //  Carrinho
  // ─────────────────────────────────────────────

  /**
   * Adiciona produto ao carrinho.
   * Bloqueia troca de loja sem confirmação e respeita limite de estoque.
   */
  const addToCart = (product: Product) => {
    // Troca de loja: exige confirmação
    if (cart.length > 0 && cart[0].product.empresaId !== product.empresaId) {
      Swal.fire({
        title: 'Trocar de loja?',
        text: 'Seu carrinho já tem itens de outra loja. Deseja limpar para adicionar este?',
        showCancelButton: true,
        confirmButtonText: 'Sim, trocar',
      }).then(res => {
        if (res.isConfirmed) setCart([{ product, quantity: 1 }]);
      });
      return;
    }

    // Validação de estoque
    const currentQty = cart.find(i => i.product.id === product.id)?.quantity ?? 0;
    if (product.controlaEstoque && (currentQty + 1) > product.estoqueAtual) {
      Swal.fire({
        icon: 'error',
        title: 'Estoque insuficiente',
        text: `Temos apenas ${product.estoqueAtual} unidade(s) deste item disponível(is).`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end',
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });

    Swal.fire({ icon: 'success', title: 'Adicionado!', timer: 800, toast: true, position: 'top-end', showConfirmButton: false });
  };

  /**
   * Atualiza quantidade de um item no carrinho com validação de estoque.
   */
  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id !== productId) return item;

        if (newQuantity > item.quantity && item.product.controlaEstoque && newQuantity > item.product.estoqueAtual) {
          Swal.fire({
            icon: 'warning',
            title: 'Limite atingido',
            text: `Desculpe, temos apenas ${item.product.estoqueAtual} unidades em estoque.`,
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false,
          });
          return item; // Mantém quantidade atual
        }

        return { ...item, quantity: newQuantity };
      }),
    );
  };

  /**
   * Remove item do carrinho pelo id do produto.
   */
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  /**
   * Limpa o carrinho inteiro com confirmação.
   */
  const handleClearCart = () => {
    if (cart.length === 0) return;
    Swal.fire({
      title: 'Limpar carrinho?',
      text: 'Deseja remover todos os itens do seu carrinho?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, limpar',
      cancelButtonText: 'Cancelar',
    }).then(result => {
      if (result.isConfirmed) {
        setCart([]);
        Swal.fire({ icon: 'success', title: 'Carrinho limpo!', timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
      }
    });
  };

  // ─────────────────────────────────────────────
  //  Finalização do pedido
  // ─────────────────────────────────────────────

  /**
   * Fluxo completo de checkout:
   * 1. Valida estoque no servidor (double-check)
   * 2. Exibe modal de pagamento com opção PIX
   * 3. Cria pedido no Supabase
   * 4. Atualiza estoque e pontos
   * 5. Monta mensagem WhatsApp e redireciona
   */
  const finalizeOrder = async () => {
    if (!user || !selectedBusiness) return;

    // ── 0. Confirma que a sessão ainda é válida ───
    // Sem isso, o INSERT do pedido é barrado pelo RLS (userId = current_usuario_id(),
    // que depende de auth.uid()) e falhava em silêncio — o app seguia como se o
    // pedido tivesse sido enviado. getSession() já tenta renovar via refresh token.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sessão expirada',
        text: 'Sua sessão expirou. Faça login novamente para continuar.',
        confirmButtonText: 'Entendi',
      });
      localStorage.removeItem('maxi_user_v3');
      setView('login');
      return;
    }

    // ── 1. Validação de estoque (server-side) ────
    const inventoryUpdates: { id: string; quantity: number }[] = [];

    for (const item of cart) {
      if (item.product.controlaEstoque) {
        const { data: freshProduct, error: fetchError } = await supabase
          .from('produtos')
          .select('estoqueAtual')
          .eq('id', item.product.id)
          .single();

        if (fetchError || !freshProduct || freshProduct.estoqueAtual < item.quantity) {
          Swal.fire({
            icon: 'error',
            title: 'Estoque insuficiente',
            text: `O item "${item.product.name}" não possui unidades suficientes (Disponível: ${freshProduct?.estoqueAtual || 0}).`,
          });
          return;
        }

        inventoryUpdates.push({ id: item.product.id, quantity: item.quantity });
      }
    }

    // ── 2. Cálculo de valores ─────────────────────
    const metodosAceitos = selectedBusiness.pagamento.metodosAceitos || ['PIX', 'Dinheiro', 'Cartão'];
    const subtotal       = cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
    const userPoints     = user.points[selectedBusiness.id] || 0;

    let discount = 0;
    if (appliedLoyalty && userPoints >= selectedBusiness.loyalty.metaPontos) {
      discount = selectedBusiness.loyalty.tipoRecompensa === 'valor_fixo'
        ? selectedBusiness.loyalty.valorRecompensa
        : (subtotal * selectedBusiness.loyalty.valorRecompensa / 100);
    }

    const totalFinal = Math.max(0, subtotal - discount);

    // ── 3. Modal de checkout ──────────────────────
    const { value: formValues } = await Swal.fire({
      title: 'Finalizar Pedido',
      html: `
        <div class="text-left space-y-4">
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Total a Pagar</p>
            <p class="font-black text-2xl text-red-600 italic tracking-tighter">R$ ${totalFinal.toFixed(2)}</p>
            ${discount > 0 ? `<p class="text-emerald-600 font-bold text-[10px] uppercase mt-1 tracking-wider">Desconto Fidelidade Aplicado!</p>` : ''}
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-2">Forma de Pagamento</label>
            <select id="swal-payment" class="w-full bg-slate-100 border-none rounded-xl p-4 font-bold outline-none">
              ${metodosAceitos.map((m: string) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('')}
            </select>
          </div>

          <div id="pix-container" class="hidden animate-in fade-in zoom-in-95">
            <button type="button" id="btn-copy-pix" class="w-full bg-emerald-50 text-emerald-700 border-2 border-emerald-200 p-4 rounded-2xl flex flex-col items-center gap-1 group active:scale-95 transition-all outline-none">
              <span class="text-[10px] font-black uppercase tracking-widest">Clique para Copiar PIX</span>
              <span class="text-xs font-bold break-all">${escapeHtml(selectedBusiness.pagamento.chavePix)}</span>
              <div class="mt-2 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Copiar Chave</div>
            </button>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400 ml-2">Observações</label>
            <textarea id="swal-observation" class="w-full bg-slate-100 border-none rounded-xl p-4 font-medium text-sm h-24 resize-none outline-none"></textarea>
          </div>
        </div>
      `,
      didOpen: () => {
        const select       = document.getElementById('swal-payment') as HTMLSelectElement;
        const pixContainer = document.getElementById('pix-container');
        const copyBtn      = document.getElementById('btn-copy-pix');

        const togglePix = () => {
          pixContainer?.classList.toggle('hidden', select.value !== 'PIX');
        };

        select.addEventListener('change', togglePix);
        togglePix();

        copyBtn?.addEventListener('click', () => {
          const chave = selectedBusiness.pagamento.chavePix;
          if (!chave) return;

          const doCopy = (text: string) => {
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(text).then(() => {
                Swal.showValidationMessage('✅ Chave PIX Copiada!');
                setTimeout(() => Swal.resetValidationMessage(), 2000);
              });
            } else {
              const ta = document.createElement('textarea');
              ta.value = text;
              ta.style.position = 'fixed';
              document.body.appendChild(ta);
              ta.focus();
              ta.select();
              try {
                document.execCommand('copy');
                Swal.showValidationMessage('✅ Chave PIX Copiada!');
              } catch {
                Swal.showValidationMessage('❌ Erro ao copiar');
              }
              document.body.removeChild(ta);
              setTimeout(() => Swal.resetValidationMessage(), 2000);
            }
          };

          doCopy(chave);
        });
      },
      showCancelButton: true,
      confirmButtonText: 'Confirmar Pedido',
      preConfirm: () => ({
        method:      (document.getElementById('swal-payment')     as HTMLSelectElement).value   as PaymentMethod,
        observation: (document.getElementById('swal-observation') as HTMLTextAreaElement).value,
      }),
    });

    if (!formValues) return;
    setIsGlobalLoading(true);

    try {
      // ── 4. Atualiza estoque ───────────────────────
      for (const up of inventoryUpdates) {
        const { error: stockError } = await supabase.rpc('decrement_product_stock', { input_product_id: up.id, input_qty: up.quantity });
        if (stockError) throw stockError;
      }

      // ── 5. Calcula pontos ganhos ──────────────────
      let pointsEarned = 0;
      if (selectedBusiness.loyalty.ativo && totalFinal > 0) {
        if (selectedBusiness.loyalty.tipoPontuacao === 'por_valor') {
          pointsEarned = Math.floor(totalFinal);
        } else {
          let totalItemPoints = cart.reduce((acc, i) => acc + (i.product.pontosGanhos * i.quantity), 0);
          if (appliedLoyalty && cart.length > 0) {
            totalItemPoints = Math.max(0, totalItemPoints - cart[0].product.pontosGanhos);
          }
          pointsEarned = totalItemPoints;
        }
      }

      // ── 6. Cria pedido ────────────────────────────
      const orderId = Math.random().toString(36).substr(2, 6).toUpperCase();
      const order: Order = {
        id:            orderId,
        businessId:    selectedBusiness.id,
        condominioId:  selectedBusiness.condominioId,
        userId:        user.id,
        userTag:       `${user.block}${user.floor}${user.apartment}`,
        userName:      user.name,
        items:         cart,
        total:         totalFinal,
        discount,
        pointsEarned,
        status:        'pendente',
        createdAt:     Date.now(),
        paymentStatus: 'pendente',
        paymentMethod: formValues.method,
        observation:   formValues.observation,
      };

      const { error: insertError } = await supabase.from('pedidos').insert(order);
      if (insertError) throw insertError;

      // ── 7. Atualiza pontos do usuário (recalculado no servidor via RPC) ──
      const { data: newPoints, error: loyaltyError } = await supabase.rpc('apply_checkout_loyalty', { input_order_id: orderId });
      if (loyaltyError) throw loyaltyError;
      const updatedUser = { ...user, points: newPoints || user.points };
      setUser(updatedUser);
      localStorage.setItem('maxi_user_v3', JSON.stringify(updatedUser));

      // ── 8. Monta mensagem WhatsApp ────────────────
      const isService   = selectedBusiness.category === 'service';
      const typeEmoji   = isService ? '🛠️' : '📦';
      const statusEmoji = isService ? '📅' : '🚚';
      const statusText  = isService ? 'Sua solicitação foi recebida e está em análise' : 'Pedido em preparo para entrega';

      let message = `${isService ? '🛠️' : '🍰'} *PEDIDO ${selectedBusiness.name.toUpperCase()}*\n\n`;
      message += `${statusEmoji} *${statusText}*\n`;
      message += `👤 *Cliente:* ${user.name}\n`;
      message += `📍 *Localização:* ${user.block} - Apto ${user.floor}${user.apartment}\n`;
      message += `📋 *ITENS DO PEDIDO:*\n`;

      cart.forEach(item => {
        if (item.product.isQuoteOnly) {
          message += `${typeEmoji} *${item.product.name}* -> *[Aguardando Orçamento]*\n`;
        } else {
          message += `${typeEmoji} *${item.product.name}*\n`;
          message += `   ${item.quantity}x R$ ${item.product.price.toFixed(2)} = R$ ${(item.product.price * item.quantity).toFixed(2)}\n`;
        }
      });

      if (discount > 0) message += `\n🎁 *Desconto:* - R$ ${discount.toFixed(2)}`;
      message += `\n💰 *VALOR TOTAL: R$ ${totalFinal.toFixed(2)}*`;
      message += `\n\n💳 *Pagamento via ${formValues.method}*`;

      if (formValues.method === 'PIX' && selectedBusiness.pagamento.chavePix) {
        message += `\nChave: ${selectedBusiness.pagamento.chavePix}`;
        message += `\nTitular: ${selectedBusiness.name}`;
        message += `\n\n✅ *Após o pagamento, envie o comprovante para agilizar o processo!*`;
      }

      if (formValues.observation) message += `\n💬 *Obs:* ${formValues.observation}`;
      message += `\n\n📲 *Acompanhe seu pedido em tempo real pelo aplicativo*`;

      if (selectedBusiness.loyalty.ativo) {
        message += `\n\n⭐ *PONTUAÇÃO:*`;
        if (appliedLoyalty && pointsEarned === 0) {
          message += `\n🎁 Resgate realizado com sucesso!`;
        } else {
          message += `\nVocê ganhou ${pointsEarned} ponto${pointsEarned !== 1 ? 's' : ''} neste pedido`;
        }
        const totalAtual = newPoints[selectedBusiness.id] || 0;
        message += `\nTotal acumulado: ${totalAtual} ponto${totalAtual !== 1 ? 's' : ''}`;
      }

      message += `\n\n💬 *Gostou da experiência?*\nCompartilhe com seus vizinhos no grupo 💚\n`;

      const phone  = selectedBusiness.social.whatsapp || selectedBusiness.phone;
      const zapUrl = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

      setIsGlobalLoading(false);

      // ── 9. Confirmação final + abre WhatsApp ──────
      await Swal.fire({
        icon: 'success',
        title: 'Pedido Enviado!',
        text: `Seu pedido foi registrado. Você ganhou ${pointsEarned} pontos!`,
        confirmButtonText: 'Ir para WhatsApp',
        confirmButtonColor: '#25D366',
        allowOutsideClick: false,
      }).then(result => {
        if (result.isConfirmed) {
          window.open(zapUrl, '_blank');
          setCart([]);
          setAppliedLoyalty(false);
          setView('dashboard');
        }
      });

    } catch (error: any) {
      setIsGlobalLoading(false);
      console.error(error);

      if (error?.code === '42501' || error?.code === 'PGRST301') {
        // Sessão expirou entre a confirmação e o envio — orienta o morador a
        // logar de novo em vez de deixar parecer que o pedido foi enviado.
        Swal.fire({
          icon: 'warning',
          title: 'Sessão expirada',
          text: 'Sua sessão expirou durante o envio. Faça login novamente e tente enviar o pedido de novo.',
          confirmButtonText: 'Entendi',
        }).then(() => {
          localStorage.removeItem('maxi_user_v3');
          setView('login');
        });
        return;
      }

      Swal.fire('Erro', 'Houve uma falha ao processar o pedido. Tente novamente.', 'error');
    }
  };

const handleAddReview = async () => {
    // 1. Verificações iniciais
    if (!user) {
        Swal.fire('Login Necessário', 'Você precisa estar logado para avaliar.', 'warning');
        return;
    }
    if (!selectedBusiness) {
        console.error("Erro: selectedBusiness está indefinido.");
        return;
    }

    // 2. Interface do formulário
    const { value: formValues } = await Swal.fire({
        title: '<span style="font-family: sans-serif; font-weight: 900; font-style: italic;">AVALIAR LOJA</span>',
        html: `
            <div style="text-align: left; display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 8px;">Quantas estrelas?</label>
                    <select id="swal-rating" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-weight: 900; outline: none; background: #f8fafc;">
                        <option value="5">⭐⭐⭐⭐⭐ (Excelente)</option>
                        <option value="4">⭐⭐⭐⭐ (Muito Bom)</option>
                        <option value="3">⭐⭐⭐ (Bom)</option>
                        <option value="2">⭐⭐ (Regular)</option>
                        <option value="1">⭐ (Pode Melhorar)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 8px;">O que achou?</label>
                    <textarea id="swal-comment" placeholder="Sua opinião sincera..." style="width: 100%; height: 100px; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; font-weight: 600; resize: none; outline: none; background: #f8fafc;"></textarea>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ENVIAR AVALIAÇÃO',
        cancelButtonText: 'CANCELAR',
        confirmButtonColor: '#10b981',
        preConfirm: () => {
            const rating = Number((document.getElementById('swal-rating') as HTMLSelectElement).value);
            const comment = (document.getElementById('swal-comment') as HTMLTextAreaElement).value;
            return { rating, comment };
        }
    });

    if (formValues) {
        setIsGlobalLoading(true);
        try {
            // Criar ID único compatível com navegadores antigos
            const reviewId = typeof crypto.randomUUID === 'function' 
                ? crypto.randomUUID() 
                : Math.random().toString(36).substring(2);

            const newReview = {
                id: reviewId,
                userName: user.name,
                rating: formValues.rating,
                comment: formValues.comment,
                date: Date.now()
            };

            // 3. Tratamento das reviews existentes (converte string JSON para Array se necessário)
            let currentReviews = [];
            try {
                if (typeof selectedBusiness.reviews === 'string') {
                    currentReviews = JSON.parse(selectedBusiness.reviews || '[]');
                } else if (Array.isArray(selectedBusiness.reviews)) {
                    currentReviews = selectedBusiness.reviews;
                }
            } catch (e) {
                console.warn("Falha ao processar reviews antigas, iniciando novo array.");
                currentReviews = [];
            }

            const updatedReviews = [newReview, ...currentReviews];
            const newAverage = updatedReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / updatedReviews.length;

            // 4. Salvar no Supabase
            const { error: dbError } = await supabase
                .from('empresas')
                .update({ 
                    reviews: JSON.stringify(updatedReviews), 
                    rating: Number(newAverage.toFixed(1)) 
                })
                .eq('id', selectedBusiness.id);

            if (dbError) throw dbError;

            // 5. Atualizar interface localmente
            const updatedBiz = { 
                ...selectedBusiness, 
                reviews: JSON.stringify(updatedReviews), 
                rating: Number(newAverage.toFixed(1)) 
            };
            
            // Aqui usamos as funções que extraímos no passo 1
            if (setSelectedBusiness) setSelectedBusiness(updatedBiz);
            if (setBusinesses) {
              setBusinesses((prev: any[]) => 
                prev.map(b => b.id === updatedBiz.id ? updatedBiz : b)
              );
            }
            
            Swal.fire({ 
                icon: 'success', 
                title: 'Avaliação enviada!', 
                timer: 2000, 
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });

        } catch (err: any) {
            console.error("ERRO DETALHADO AO SALVAR REVIEW:", err); // ISSO VAI MOSTRAR O MOTIVO REAL NO F12
            Swal.fire('Erro', `Falha no servidor: ${err.message || 'Tente novamente.'}`, 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }
};




 // ─────────────────────────────────────────────
  //  Retorno
  // ─────────────────────────────────────────────

  return {
    addToCart,
    updateQuantity,
    removeFromCart,
    handleClearCart,
    finalizeOrder,
	handleAddReview,
  };
}
 