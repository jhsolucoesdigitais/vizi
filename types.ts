
export type CategoryType = 'food' | 'service';
export type OrderStatus = 'pendente' | 'preparando' | 'saiu_entrega' | 'entregue_aguardando_pagamento' | 'concluido' | 'cancelado';
export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Cartão' | 'Retirar no Local';

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: number;
}

export interface DayHours {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  enabled: boolean;
  is24h: boolean;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface LoyaltyConfig {
  ativo: boolean;
  tipoPontuacao: 'por_valor' | 'por_item';
  metaPontos: number;
  tipoRecompensa: 'valor_fixo' | 'porcentagem';
  valorRecompensa: number;
}

export interface Business {
  id: string;
  slug?: string;
  name: string;
  category: CategoryType;
  subCategory: string;
  description?: string;
  rating: number;
  reviews: Review[];
  image: string;
  bannerUrl: string;
  phone: string;
  operatingHours?: string;
  businessHours: BusinessHours | null;
  status: {
    aberto: boolean;
    mensagemAusencia: string;
  };
  loyalty: LoyaltyConfig;
  pagamento: {
    chavePix: string;
    metodosAceitos: PaymentMethod[];
  };
  social: {
    instagram: string;
    facebook: string;
    whatsapp: string;
    website?: string;
  };
  
  condominioId?: string;
  email?: string;
  licenseStatus?: 'active' | 'late' | 'blocked';
  dataVencimento?: string | null;
  mustChangePassword?: boolean;
  auth_user_id?: string | null;

}

export interface Product {
  id: string;
  empresaId: string;
  condominioId?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  isQuoteOnly: boolean;
  isPromotion: boolean;
  pontosGanhos: number;
  controlaEstoque: boolean;
  estoqueAtual: number;
  isVisible: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  businessId: string;
  condominioId?: string;
  userId: string;
  userTag: string;
  userName: string;
  items: CartItem[];
  total: number;
  discount: number;
  pointsEarned: number;
  status: OrderStatus;
  createdAt: number;
  paymentStatus: 'pago' | 'pendente';
  paymentMethod?: PaymentMethod;
  observation?: string;
}

export interface User {
  id: string;
  name: string;
  block: 'A' | 'B' | 'C';
  floor: number;
  apartment: number;
  favorites: string[];
  points: Record<string, number>;
  condominioId?: string;
}

export interface Condominio {
  id: string;
  slug: string;
  name: string;
  address: string;
  settings: {
    type: 'bloco' | 'torre';
    namingType: 'number' | 'letter'; 
    quantity: number;
    floors: number;
    apartmentsPerFloor: number[];
  };
}