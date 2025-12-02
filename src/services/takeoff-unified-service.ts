// ============================================================================
// TAKEOFF UNIFIED SERVICE - SERVICE LAYER PARA TAKEOFFS (FILE-BASED)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  ApiResponse, 
  TakeoffFilters, 
  PaginatedResponse, 
  BaseStats,
  CreateOperation,
  DeleteOperation,
  BaseEntity,
  BaseEntityWithProject
} from '../types/unified';
import { log } from '../utils/winstonLogger';

// Interfaces específicas para takeoffs
export interface Takeoff extends BaseEntityWithProject {
  name: string;
  description?: string;
  type: 'trench' | 'conduit' | 'bore_shot' | 'hydro_excavation' | 'vault' | 'custom';
  status: 'draft' | 'active' | 'completed' | 'archived' | 'error' | 'inactive' | 'processing';
  progress: number;
  total_area?: number;
  total_length?: number;
  total_volume?: number;
  total_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  end_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  reviewer?: string;
  approved_by?: string;
  approved_at?: string;
  settings?: any;
  metadata?: any;
}

export interface TakeoffCreationData {
  name: string;
  description?: string;
  type: 'trench' | 'conduit' | 'bore_shot' | 'hydro_excavation' | 'vault' | 'custom';
  project_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  start_date?: string;
  end_date?: string;
  settings?: any;
  metadata?: any;
}

export interface TakeoffUpdateData extends Partial<TakeoffCreationData> {
  id: string;
  status?: 'draft' | 'in_progress' | 'review' | 'approved' | 'completed' | 'archived';
  progress?: number;
  total_area?: number;
  total_length?: number;
  total_volume?: number;
  total_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  reviewer?: string;
  approved_by?: string;
  approved_at?: string;
}

// Interfaces para itens de takeoff
export interface TakeoffItem extends BaseEntity {
  takeoff_id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  area?: number;
  length?: number;
  volume?: number;
  depth?: number;
  width?: number;
  height?: number;
  material?: string;
  labor_hours?: number;
  equipment_hours?: number;
  notes?: string;
  metadata?: any;
}

export interface TakeoffItemCreationData {
  takeoff_id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  area?: number;
  length?: number;
  volume?: number;
  depth?: number;
  width?: number;
  height?: number;
  material?: string;
  labor_hours?: number;
  equipment_hours?: number;
  notes?: string;
  metadata?: any;
}

export interface TakeoffItemUpdateData extends Partial<TakeoffItemCreationData> {
  id: string;
}

export class TakeoffUnifiedService {
  private takeoffsDir: string;

  constructor() {
    // Define o diretório de dados para takeoffs
    this.takeoffsDir = path.join(process.cwd(), 'data', 'takeoffs');
    
    // Cria o diretório se não existir
    if (!fs.existsSync(this.takeoffsDir)) {
      fs.mkdirSync(this.takeoffsDir, { recursive: true });
      log.info(`Diretório criado: ${this.takeoffsDir}`);
    }
    
    log.info('TakeoffUnifiedService inicializado (modo arquivo)');
  }

  /**
   * Helper para ler um arquivo JSON com segurança
   */
  private readTakeoffFile(id: string): Takeoff | null {
    try {
      const filePath = path.join(this.takeoffsDir, `${id}.json`);
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      log.error(`Erro ao ler arquivo de takeoff ${id}`, error);
      return null;
    }
  }

  /**
   * Criar um novo takeoff
   */
  async createTakeoff(operation: CreateOperation<TakeoffCreationData>): Promise<ApiResponse<Takeoff>> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const newTakeoff: Takeoff = {
        id,
        ...operation.data,
        created_by: operation.user_id,
        created_at: now,
        updated_at: now,
        status: (operation.data as any).status || 'active',
        progress: 0
      };

      const filePath = path.join(this.takeoffsDir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(newTakeoff, null, 2));

      log.info('Takeoff criado', { id, name: newTakeoff.name });

      return {
        success: true,
        message: 'Takeoff criado com sucesso',
        data: newTakeoff
      };
    } catch (error: any) {
      log.error('Erro ao criar takeoff', error);
      return {
        success: false,
        message: 'Erro interno ao criar takeoff',
        error: error.message
      };
    }
  }

  /**
   * Listar takeoffs com filtros e paginação
   */
  async listTakeoffs(filters: TakeoffFilters = {}, _userId: string): Promise<ApiResponse<PaginatedResponse<Takeoff>>> {
    try {
      const files = fs.readdirSync(this.takeoffsDir);
      let takeoffs: Takeoff[] = [];

      // Ler todos os arquivos
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.takeoffsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const takeoff = JSON.parse(content);
            takeoffs.push(takeoff);
          } catch (e) {
            log.warn(`Arquivo corrompido ignorado: ${file}`);
            continue; // Pular arquivos corrompidos
          }
        }
      }

      // Aplicar Filtros
      if (filters.project_id) {
        takeoffs = takeoffs.filter(t => t.project_id === filters.project_id);
      }
      if (filters.status) {
        takeoffs = takeoffs.filter(t => t.status === filters.status);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        takeoffs = takeoffs.filter(t => 
          t.name.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
        );
      }

      // Ordenação (padrão: mais recente primeiro)
      takeoffs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Paginação
      const total = takeoffs.length;
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const paginatedItems = takeoffs.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          success: true,
          items: paginatedItems,
          data: paginatedItems, // Manter compatibilidade
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        },
        message: 'Takeoffs listados com sucesso'
      };
    } catch (error: any) {
      log.error('Erro ao listar takeoffs', error);
      return {
        success: false,
        message: 'Erro ao listar takeoffs',
        error: error.message
      };
    }
  }

  /**
   * Obter takeoff por ID
   */
  async getTakeoffById(id: string, _userId: string): Promise<ApiResponse<Takeoff>> {
    const takeoff = this.readTakeoffFile(id);
    
    if (!takeoff) {
      return {
        success: false,
        message: 'Takeoff não encontrado',
        error: 'NOT_FOUND'
      };
    }

    return {
      success: true,
      data: takeoff,
      message: 'Takeoff obtido com sucesso'
    };
  }

  /**
   * Atualizar takeoff
   */
  async updateTakeoff(id: string, updateData: TakeoffUpdateData, _userId: string): Promise<ApiResponse<Takeoff>> {
    const takeoff = this.readTakeoffFile(id);
    
    if (!takeoff) {
      return {
        success: false,
        message: 'Takeoff não encontrado',
        error: 'NOT_FOUND'
      };
    }

    // Mesclar dados (remover id do updateData se presente)
    const { id: _, status: updateStatus, ...updateFields } = updateData;
    
    // Normalizar status se necessário
    let finalStatus = takeoff.status;
    if (updateStatus) {
      // Mapear status do updateData para o formato do Takeoff
      const statusMap: Record<string, Takeoff['status']> = {
        'in_progress': 'processing',
        'review': 'active',
        'approved': 'active',
        'completed': 'completed',
        'archived': 'archived',
        'draft': 'draft',
        'active': 'active',
        'inactive': 'inactive',
        'error': 'error'
      };
      finalStatus = statusMap[updateStatus] || takeoff.status;
    }
    
    const updatedTakeoff: Takeoff = {
      ...takeoff,
      ...updateFields,
      status: finalStatus,
      updated_at: new Date().toISOString()
    };

    try {
      const filePath = path.join(this.takeoffsDir, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(updatedTakeoff, null, 2));
      
      log.info('Takeoff atualizado', { id });
      
      return {
        success: true,
        data: updatedTakeoff,
        message: 'Takeoff atualizado com sucesso'
      };
    } catch (error: any) {
      log.error('Erro ao atualizar takeoff', error);
      return {
        success: false,
        message: 'Erro ao salvar atualização',
        error: error.message
      };
    }
  }

  /**
   * Deletar takeoff
   */
  async deleteTakeoff(deleteData: DeleteOperation): Promise<ApiResponse<void>> {
    const { id } = deleteData;
    const filePath = path.join(this.takeoffsDir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: 'Takeoff não encontrado',
        error: 'NOT_FOUND'
      };
    }

    try {
      fs.unlinkSync(filePath);
      log.info('Takeoff deletado', { id });
      
      return {
        success: true,
        message: 'Takeoff removido com sucesso'
      };
    } catch (error: any) {
      log.error('Erro ao deletar takeoff', error);
      return {
        success: false,
        message: 'Erro ao deletar arquivo',
        error: error.message
      };
    }
  }
  
  /**
   * Obter estatísticas de takeoffs
   */
  async getTakeoffStats(_userId: string): Promise<ApiResponse<BaseStats>> {
    try {
      const files = fs.readdirSync(this.takeoffsDir);
      let total = 0;
      let active = 0;
      let inactive = 0;
      let archived = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.takeoffsDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const takeoff = JSON.parse(content);
            total++;
            
            if (takeoff.status === 'active') active++;
            else if (takeoff.status === 'inactive') inactive++;
            else if (takeoff.status === 'archived') archived++;
          } catch (e) {
            continue;
          }
        }
      }

      return {
        success: true,
        message: 'Stats calculados',
        data: {
          total,
          active,
          inactive,
          archived
        }
      };
    } catch (error: any) {
      log.error('Erro ao calcular stats', error);
      return {
        success: false,
        message: 'Erro ao calcular estatísticas',
        error: error.message
      };
    }
  }
}

export default TakeoffUnifiedService;
