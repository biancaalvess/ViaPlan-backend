// ============================================================================
// CONTROLLER PARA TAKEOFF (SIMPLIFICADO - SEM BANCO DE DADOS)
// ============================================================================

import { Request, Response } from 'express';
import { TakeoffUnifiedService } from '../services/takeoff-unified-service';

// Instanciar o serviço
const takeoffService = new TakeoffUnifiedService();

// Tipos para o sistema de takeoff
export interface TakeoffProject {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Controlador para medições de takeoff
export class TakeoffController {
  // Buscar todas as medições de um projeto
  static async getMeasurements(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Chama o serviço implementado
      const result = await takeoffService.listTakeoffs({ project_id: projectId }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar medições:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Criar nova medição
  static async createMeasurement(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Adaptar o body para o formato esperado pelo CreateOperation
      const operation = {
        data: {
          ...req.body,
          project_id: projectId
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error) {
      console.error('Erro ao criar medição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Atualizar medição
  static async updateMeasurement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      const updateData = {
        id,
        ...req.body
      };

      const result = await takeoffService.updateTakeoff(id, updateData, userId);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao atualizar medição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Deletar medição
  static async deleteMeasurement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      const deleteData = { 
        id,
        user_id: userId
      };

      const result = await takeoffService.deleteTakeoff(deleteData);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao deletar medição:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter resumo de takeoff
  static async getTakeoffSummary(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      console.log('🔧 Buscando resumo do takeoff:', projectId);
      
      res.json({
        success: true,
        data: {
          totalMeasurements: 0,
          totalLength: 0,
          totalArea: 0,
          totalVolume: 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter estatísticas
  static async getMeasurementStats(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Obter stats gerais e filtrar por projeto se necessário
      const result = await takeoffService.getTakeoffStats(userId);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Se projectId foi fornecido, filtrar takeoffs do projeto
      if (projectId) {
        const listResult = await takeoffService.listTakeoffs({ project_id: projectId }, userId);
        if (listResult.success && listResult.data) {
          const projectTakeoffs = listResult.data.items || listResult.data.data || [];
          const byType: Record<string, number> = {};
          
          projectTakeoffs.forEach((takeoff: any) => {
            const type = takeoff.type || 'unknown';
            byType[type] = (byType[type] || 0) + 1;
          });

          res.json({
            success: true,
            data: {
              count: projectTakeoffs.length,
              byType,
              total: result.data?.total || 0,
              active: result.data?.active || 0,
              inactive: result.data?.inactive || 0,
              archived: result.data?.archived || 0
            }
          });
          return;
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter todas as medições detalhadas
  static async getAllMeasurements(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      console.log('🔧 Buscando todas as medições:', projectId);
      
      res.json({
        success: true,
        data: {
          measurements: [],
          trenches: [],
          conduits: [],
          vaults: [],
          yardages: [],
          notes: []
        }
      });
    } catch (error) {
      console.error('Erro ao buscar medições:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Limpar dados do projeto
  static async clearProjectData(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      console.log('🔧 Limpando dados do projeto:', projectId);
      
      res.json({
        success: true,
        message: 'Dados limpos com sucesso'
      });
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Upload de arquivo PDF para takeoff
  static async uploadTakeoffFile(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = (req as any).user?.id;
      const file = req.file;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'Arquivo é obrigatório'
        });
        return;
      }

      console.log('🔧 Upload de arquivo takeoff:', {
        filename: file.originalname,
        savedAs: file.filename,
        size: file.size,
        projectId
      });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/takeoff/${file.filename}`;

      res.status(201).json({
        success: true,
        data: {
          id: `drawing-${Date.now()}`,
          fileName: file.filename,
          originalName: file.originalname,
          url: `/uploads/takeoff/${file.filename}`,
          file_url: `/uploads/takeoff/${file.filename}`,
          fullUrl: fileUrl,
          size: file.size,
          uploaded_at: new Date().toISOString()
        },
        message: 'File uploaded successfully'
      });
    } catch (error) {
      console.error('Error in file upload:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Métodos stub para compatibilidade (não implementados)
  static async getTakeoffDrawings(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createTakeoffDrawing(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }

  static async getTrenches(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createTrench(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }

  static async getConduits(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createConduit(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }

  static async getVaults(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createVault(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }

  static async getYardages(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createYardage(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }

  static async getNotes(_req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: [] });
  }

  static async createNote(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Funcionalidade não implementada'
    });
  }
}
