import React, { useState, useEffect, useMemo } from 'react';
import { Business, Product, CartItem } from '../types';
import { dbInstance } from "../../db";
import { isStoreCurrentlyOpen } from './shared';

// ─────────────────────────────────────────────
//  Utilitário — Compressão de imagem
// ─────────────────────────────────────────────

export const compressImage = (file: File, maxWidth = 1024, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width  = img.width;
        let height = img.height;

        // Redimensiona mantendo proporção se ultrapassar o limite
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width  = maxWidth;
        }

        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            }
          },
          'image/jpeg',
          quality,
        );
      };
    };
    reader.onerror = (err) => reject(err);
  });
};

// ─────────────────────────────────────────────
//  ProductDetailModal
// ─────────────────────────────────────────────

interface ProductDetailModalProps {
  product:  Product;
  onClose:  () => void;
  onAdd:    (p: Product) => void;
  isOpen:   boolean;
}

export function ProductDetailModal({ product, onClose, onAdd, isOpen }: ProductDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="bg-cream-50 w-full max-w-4xl rounded-[28px] overflow-hidden relative shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col md:flex-row max-h-[90vh]">

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 bg-black/20 hover:bg-black/35 backdrop-blur-xl rounded-full flex items-center justify-center text-white transition-all active:scale-90 md:text-ink-900 md:bg-white/60 md:hover:bg-white"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Imagem */}
        <div className="h-56 md:h-auto md:w-1/2 relative bg-cream-200">
          <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 md:hidden" />
        </div>

        {/* Conteúdo */}
        <div className="p-6 md:p-9 md:w-1/2 bg-cream-50 flex flex-col overflow-y-auto">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex-1">
              <span className="bg-brand-50 text-brand-600 text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full mb-2.5 inline-block tracking-wider">
                {product.isQuoteOnly ? 'Personalizado / Serviço' : product.category}
              </span>
              <h2 className="font-display text-xl md:text-2xl font-semibold text-ink-900 tracking-tight leading-snug">
                {product.name}
              </h2>
            </div>
            <div className="text-right shrink-0">
              {product.isQuoteOnly ? (
                <p className="text-base md:text-lg font-semibold text-brand-600 whitespace-nowrap">
                  Sob Consulta
                </p>
              ) : (
                <p className="font-display text-2xl md:text-3xl font-bold text-ink-900 tracking-tight whitespace-nowrap tabular-nums">
                  R$ {product.price.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <p className="text-ink-600 font-medium text-sm leading-7 mb-6 flex-1">
            {product.description}
          </p>

          <div className="flex flex-col gap-3 mt-auto">
            {product.isQuoteOnly && (
              <div className="bg-brand-50 p-4 rounded-2xl mb-1">
                <p className="text-[11px] font-medium text-brand-700 leading-tight">
                  Este item requer análise do lojista para o orçamento final.
                </p>
              </div>
            )}

            <button
              onClick={() => onAdd(product)}
              disabled={!isOpen || (!product.isQuoteOnly && product.controlaEstoque && product.estoqueAtual <= 0)}
              className={`
                w-full py-4 rounded-2xl font-display font-semibold uppercase tracking-widest shadow-lg
                active:scale-[0.98] transition-all disabled:opacity-50 text-[13px]
                ${product.isQuoteOnly
                  ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-600/20'
                  : 'bg-ink-900 text-white hover:bg-ink-700 shadow-ink-900/15'}
              `}
            >
              {!isOpen
                ? 'Loja Fechada'
                : product.isQuoteOnly
                  ? 'Adicionar para Orçamento'
                  : 'Adicionar ao Carrinho'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  StoreProductList
// ─────────────────────────────────────────────

interface StoreProductListProps {
  selectedBusiness: Business; // Nome correto restabelecido aqui
  cart:             CartItem[];
  onAdd:            (p: Product) => void;
  onShowDetails:    (p: Product) => void;
  onShowAbout:      (val: boolean) => void;
}

export function StoreProductList({
  selectedBusiness,
  cart,
  onAdd,
  onShowDetails,
  onShowAbout,
}: StoreProductListProps) {
  const [products,               setProducts]               = useState<Product[]>([]);
  const [activeInternalCategory, setActiveInternalCategory] = useState<string>('Tudo');

  useEffect(() => {
    if (!selectedBusiness?.id) return;
    
    dbInstance
      .getProductsByBusiness(selectedBusiness.id)
      .then(all => setProducts(all.filter(p => p.isVisible !== false)));
  }, [selectedBusiness?.id]);

  const internalCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    const catArray = Array.from(cats) as string[];

    let savedOrder: string[] = [];
    try {
      if (typeof selectedBusiness.categoryOrder === 'string') {
        savedOrder = JSON.parse(selectedBusiness.categoryOrder);
      } else if (Array.isArray(selectedBusiness.categoryOrder)) {
        savedOrder = selectedBusiness.categoryOrder;
      }
    } catch (e) {
      console.error("Erro ao ler ordem das categorias", e);
    }

    catArray.sort((a, b) => {
      const indexA = savedOrder.indexOf(a);
      const indexB = savedOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return ['Tudo', ...catArray];
  }, [products, selectedBusiness.categoryOrder]);
  
  
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    products.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });

    Object.keys(groups).forEach(cat => {
      groups[cat].sort((a, b) => {
        const aEsgotado = !a.isQuoteOnly && a.controlaEstoque && (a.estoqueAtual || 0) <= 0;
        const bEsgotado = !b.isQuoteOnly && b.controlaEstoque && (b.estoqueAtual || 0) <= 0;

        if (aEsgotado !== bEsgotado) return aEsgotado ? 1 : -1;

        const qtyA = a.isQuoteOnly || !a.controlaEstoque ? 9999 : (a.estoqueAtual || 0);
        const qtyB = b.isQuoteOnly || !b.controlaEstoque ? 9999 : (b.estoqueAtual || 0);

        if (qtyB !== qtyA) return qtyB - qtyA;

        return (b.price || 0) - (a.price || 0);
      });
    });

    return groups;
  }, [products]);

const displayedCategories = useMemo(() => {
    if (activeInternalCategory !== 'Tudo') return [activeInternalCategory];

    const cats = Object.keys(groupedProducts);

    let savedOrder: string[] = [];
    try {
      if (typeof selectedBusiness.categoryOrder === 'string') {
        savedOrder = JSON.parse(selectedBusiness.categoryOrder);
      } else if (Array.isArray(selectedBusiness.categoryOrder)) {
        savedOrder = selectedBusiness.categoryOrder;
      }
    } catch (e) {
      console.error("Erro ao ler ordem das categorias", e);
    }

    return cats.sort((a, b) => {
      const indexA = savedOrder.indexOf(a);
      const indexB = savedOrder.indexOf(b);

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [activeInternalCategory, groupedProducts, selectedBusiness.categoryOrder]);
  const isOpen = isStoreCurrentlyOpen(selectedBusiness);

  return (
    <div className="space-y-7 pb-10 font-sans">

      {/* Navegação de categorias internas */}
      <div className="sticky top-0 z-40 transition-all">
        <div className="py-3 md:p-3 bg-cream-100/95 backdrop-blur-md md:bg-white md:rounded-[20px] md:shadow-sm flex gap-2 overflow-x-auto scrollbar-hide md:flex-wrap md:justify-start items-center">
          {internalCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveInternalCategory(cat)}
              className={`
                flex-none px-4 py-2 rounded-xl font-semibold text-[12px] transition-all duration-150 active:scale-[0.97]
                ${activeInternalCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                  : 'bg-black/[0.03] text-ink-500 hover:bg-black/[0.06]'}
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de produtos por categoria */}
      <div className="space-y-9 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {displayedCategories.map(catName => (
          <div key={catName} className="space-y-4">

            {/* Cabeçalho da categoria */}
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-ink-700 text-[13px] tracking-tight">
                {catName}
              </h3>
              <div className="h-px flex-1 bg-black/[0.06]" />
            </div>

            {/* Cards de produto */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-6 items-stretch">
              {groupedProducts[catName]?.map(p => {
                const isOutOfStock = !p.isQuoteOnly && p.controlaEstoque && p.estoqueAtual <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => { if (!isOpen || isOutOfStock) return; onAdd(p); }}
                    className={`
                      bg-white rounded-[20px] md:rounded-[24px] p-3.5 md:p-4 flex flex-col
                      shadow-sm transition-all group relative overflow-hidden
                      h-full min-h-[260px] md:min-h-[320px]
                      ${(!isOpen || isOutOfStock)
                        ? 'opacity-50 grayscale cursor-not-allowed'
                        : 'hover:shadow-lg hover:shadow-ink-900/8 active:scale-[0.98] cursor-pointer'}
                    `}
                  >
                    {/* Imagem */}
                    <div className="relative aspect-square md:aspect-video mb-3.5 overflow-hidden rounded-2xl bg-cream-200 flex-shrink-0">
                      <img
                        src={p.image}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={p.name}
                      />

                      {p.isQuoteOnly && (
                        <div className="absolute top-2 left-2 bg-brand-600 text-white text-[8px] font-semibold uppercase px-2 py-1 rounded-full shadow-sm">
                          Personalizado
                        </div>
                      )}

                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-ink-900/60 flex items-center justify-center">
                          <span className="bg-white text-ink-900 text-[9px] font-semibold uppercase px-3 py-1.5 rounded-full">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex flex-col gap-1 mb-3.5">
                        <h4 className="font-display font-semibold text-ink-900 text-[13px] md:text-[15px] tracking-tight leading-tight line-clamp-2 min-h-[2.5em]">
                          {p.name}
                        </h4>
                        <div className="mt-0.5">
                          {p.isQuoteOnly ? (
                            <span className="font-semibold text-brand-600 text-[11px] bg-brand-50 px-2 py-1 rounded-lg">
                              Sob Consulta
                            </span>
                          ) : (
                            <span className="font-display font-bold text-ink-900 text-base md:text-lg tracking-tight tabular-nums">
                              R$ {p.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Rodapé do card */}
                      <div className="mt-auto flex items-center justify-between border-t border-black/[0.05] pt-2.5 md:pt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onShowDetails(p); }}
                          className="text-[10px] font-semibold text-ink-500 hover:text-brand-600 transition-colors bg-black/[0.03] px-2.5 py-1.5 rounded-lg"
                        >
                          Ver Detalhes
                        </button>

                        {!p.isQuoteOnly && p.controlaEstoque && p.estoqueAtual > 0 && (
                          <span className={`text-[9px] font-semibold px-2 py-1 rounded-md ${p.estoqueAtual <= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            Qtd: {p.estoqueAtual}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Estado vazio (Vitrine) */}
        {displayedCategories.length === 0 && (
          <div className="py-16 text-center space-y-3 bg-white rounded-[24px] border border-dashed border-black/10 animate-in fade-in duration-300">
            {selectedBusiness.tipoPlano === 'vitrine' ? (
              <>
                <h4 className="font-display font-semibold text-ink-900 text-sm">Catálogo sob consulta</h4>
                <p className="text-ink-500 text-[12px] font-medium max-w-[220px] mx-auto leading-relaxed">
                  Este parceiro utiliza o modo vitrine. Entre em contacto para conhecer todos os serviços e produtos disponíveis!
                </p>

                <div className="flex flex-col gap-2 items-center pt-2">
                  {selectedBusiness.social?.whatsapp && (
                      <button
                        onClick={() => {
                          const whatsapp = selectedBusiness.social?.whatsapp?.replace(/\D/g, '');
                          if (whatsapp) window.open(`https://wa.me/${whatsapp}`, '_blank');
                        }}
                        className="w-full max-w-[200px] bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[11px] font-semibold uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-[0.97] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        WhatsApp
                      </button>
                  )}

                  <button
                    onClick={() => onShowAbout(true)}
                    className="w-full max-w-[200px] bg-black/[0.04] text-ink-600 px-6 py-3 rounded-2xl text-[11px] font-semibold uppercase tracking-wider hover:bg-black/[0.07] transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                    Sobre a Loja
                  </button>
                </div>
              </>
            ) : (
              <p className="font-medium text-ink-400 text-[12px]">
                Nenhum produto nesta categoria
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}