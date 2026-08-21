import { createClient } from '@supabase/supabase-js';
import { Business, Product, User, Order } from './types';

// Configuração do cliente Supabase extraída do ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Instância exportada para uso em outros componentes
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export class MaxiDB {
  
  // --- INICIALIZAÇÃO ---
  async init(): Promise<void> {
    return Promise.resolve();
  }

  // --- MÉTODOS GENÉRICOS (COM TRAVAS DE SEGURANÇA) ---

  /**
   * Salva ou atualiza dados em uma tabela.
   */
  async put<T extends { id: string }>(table: string, data: T): Promise<void> {
    const { error } = await supabase.from(table).upsert(data);
    if (error) {
      console.error(`Erro ao salvar em ${table}:`, error);
      throw error;
    }
  }

 
async getAll<T>(table: string): Promise<T[]> {
  const sensitiveTables = ['empresas', 'usuarios'];
  
  if (sensitiveTables.includes(table)) {
  
    const safeColumns = table === 'empresas' 
      ? 'id, name, category, subCategory, rating, image, status, reviews, condominioId, tipoPlano,description'
      : 'id, name, block, apartment, points, condominioId';

    const { data, error } = await supabase
      .from(table)
      .select(safeColumns);
      
    if (error) return [];
    return data as T[];
  }

  const { data, error } = await supabase.from(table).select('*');
  if (error) return [];
  return data as T[];
}

  /**
   * Busca um registro por ID com filtragem de colunas automática para empresas.
   */
  async get<T>(table: string, id: string): Promise<T | null> {
    // Se a tabela for 'empresas', removemos campos de senha da consulta
    const selectFields = table === 'empresas' 
      ? 'id, name, category, subCategory, rating, image, bannerUrl, businessHours, status, social, loyalty, pagamento, condominioId, reviews, tipoPlano,description'
      : '*';

    const { data, error } = await supabase
      .from(table)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) return null;
    return data as T;
  }

  /**
   * Remove um registro por ID.
   */
  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // --- MÉTODOS ESPECÍFICOS (SEGUROS E FILTRADOS) ---

  /**
   * Busca produtos de uma empresa específica.
   */
  async getProductsByBusiness(businessId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('empresaId', businessId);
    
    if (error) return [];
    return data as Product[];
  }

  /**
   * Busca pedidos de uma empresa.
   */
  async getOrdersByBusiness(businessId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('businessId', businessId);
    
    if (error) return [];
    return data as Order[];
  }

  /**
   * Gera relatório financeiro filtrado por data e status.
   */
  async getFinancialReport(businessId: string, startDate: string, endDate: string, status?: string): Promise<Order[]> {
    let query = supabase
      .from('pedidos')
      .select('*')
      .eq('businessId', businessId)
      .gte('createdAt', new Date(startDate + 'T00:00:00').getTime())
      .lte('createdAt', new Date(endDate + 'T23:59:59').getTime());

    if (status && status !== 'todos') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro relatório financeiro:", error);
      return [];
    }
    return data as Order[];
  }
  
  /**
   * Busca histórico de pedidos de um usuário em um condomínio específico.
   */
  async getOrdersByUserAndCondo(userId: string, condominioId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('userId', userId)
      .eq('condominioId', condominioId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      return [];
    }
    return data as Order[];
  }
}

export const dbInstance = new MaxiDB();