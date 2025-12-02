import { TakeoffUnifiedService } from './takeoff-unified-service';
import { CreateOperation, DeleteOperation } from '../types/unified';
import path from 'path';
import fs from 'fs';

export interface QuickTakeoffRequest {
  projectId: string;
  fileName: string;
  scale?: number;
  userId: string;
}

export interface QuickTakeoffResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class QuickTakeoffService {
  private takeoffService: TakeoffUnifiedService;

  constructor() {
    this.takeoffService = new TakeoffUnifiedService();
  }

  /**
   * Processa um PDF existente para Quick Takeoff
   */
  async processExistingPDF(request: QuickTakeoffRequest): Promise<QuickTakeoffResponse> {
    try {
      const { projectId, fileName, scale = 1.0, userId } = request;

      // Verificar se o arquivo existe
      const filePath = path.join(process.cwd(), 'uploads', 'takeoff', fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: 'Arquivo não encontrado',
          error: `Arquivo ${fileName} não existe`
        };
      }

      // Criar takeoff básico
      const takeoffData: CreateOperation<any> = {
        data: {
          project_id: projectId,
          name: `Quick Takeoff - ${fileName}`,
          description: 'Takeoff criado automaticamente',
          scale: scale,
          status: 'draft'
        },
        user_id: userId
      };

      const result = await this.takeoffService.createTakeoff(takeoffData);

      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao criar takeoff',
          error: result.error || 'Erro desconhecido'
        };
      }

      return {
        success: true,
        message: 'Quick Takeoff criado com sucesso',
        data: {
          takeoffId: (result.data as any)?.id,
          fileName: fileName,
          scale: scale,
          projectId: projectId
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Lista takeoffs rápidos de um projeto
   */
  async listQuickTakeoffs(projectId: string, _userId: string): Promise<QuickTakeoffResponse> {
    try {
      const result = await this.takeoffService.listTakeoffs({
        project_id: projectId,
        limit: 50,
        offset: 0
      }, _userId);

      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao listar takeoffs',
          error: result.error || 'Erro desconhecido'
        };
      }

      // Filtrar apenas takeoffs rápidos (que começam com "Quick Takeoff")
      const quickTakeoffs = result.data?.items?.filter((takeoff: any) => 
        takeoff.name?.startsWith('Quick Takeoff')
      ) || [];

      return {
        success: true,
        message: 'Takeoffs rápidos listados com sucesso',
        data: {
          takeoffs: quickTakeoffs,
          total: quickTakeoffs.length
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Obtém detalhes de um takeoff rápido
   */
  async getQuickTakeoff(takeoffId: string, userId: string): Promise<QuickTakeoffResponse> {
    try {
      const result = await this.takeoffService.getTakeoffById(takeoffId, userId);

      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao obter takeoff',
          error: result.error || 'Erro desconhecido'
        };
      }

      return {
        success: true,
        message: 'Takeoff obtido com sucesso',
        data: result.data
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Atualiza um takeoff rápido
   */
  async updateQuickTakeoff(takeoffId: string, updateData: any, _userId: string): Promise<QuickTakeoffResponse> {
    try {
      const result = await this.takeoffService.updateTakeoff(takeoffId, updateData, _userId);

      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao atualizar takeoff',
          error: result.error || 'Erro desconhecido'
        };
      }

      return {
        success: true,
        message: 'Takeoff atualizado com sucesso',
        data: result.data
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }

  /**
   * Remove um takeoff rápido
   */
  async deleteQuickTakeoff(takeoffId: string, userId: string): Promise<QuickTakeoffResponse> {
    try {
      const deleteOperation: DeleteOperation = {
        id: takeoffId,
        user_id: userId
      };
      const result = await this.takeoffService.deleteTakeoff(deleteOperation);

      if (!result.success) {
        return {
          success: false,
          message: 'Erro ao remover takeoff',
          error: result.error || 'Erro desconhecido'
        };
      }

      return {
        success: true,
        message: 'Takeoff removido com sucesso'
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      };
    }
  }
}

// Instância singleton
export const quickTakeoffService = new QuickTakeoffService();
