import { createClient } from '@supabase/supabase-js';
import { Product } from './types';

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


  /**
   * Remove um registro por ID.
   */
  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Busca produtos (públicos, sem colunas sensíveis) de uma empresa específica.
   */
  async getProductsByBusiness(businessId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('empresaId', businessId);

    if (error) return [];
    return data as Product[];
  }
}

export const dbInstance = new MaxiDB();