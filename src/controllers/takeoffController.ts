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
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Buscar todos os takeoffs do projeto
      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId 
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      const takeoffs = result.data?.items || result.data?.data || [];
      
      // Calcular totais
      let totalMeasurements = takeoffs.length;
      let totalLength = 0;
      let totalArea = 0;
      let totalVolume = 0;
      let totalCost = 0;

      // Agrupar por tipo
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      takeoffs.forEach((takeoff: any) => {
        // Somar comprimentos
        if (takeoff.total_length) {
          totalLength += takeoff.total_length;
        } else if (takeoff.metadata?.length) {
          totalLength += takeoff.metadata.length;
        }

        // Somar áreas
        if (takeoff.total_area) {
          totalArea += takeoff.total_area;
        } else if (takeoff.metadata?.area) {
          totalArea += takeoff.metadata.area;
        }

        // Somar volumes
        if (takeoff.total_volume) {
          totalVolume += takeoff.total_volume;
        } else if (takeoff.metadata?.volume) {
          totalVolume += takeoff.metadata.volume;
        }

        // Somar custos
        if (takeoff.total_cost) {
          totalCost += takeoff.total_cost;
        }

        // Contar por tipo
        const type = takeoff.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        // Contar por status
        const status = takeoff.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          totalMeasurements,
          totalLength: Math.round(totalLength * 100) / 100,
          totalArea: Math.round(totalArea * 100) / 100,
          totalVolume: Math.round(totalVolume * 100) / 100,
          totalCost: Math.round(totalCost * 100) / 100,
          byType,
          byStatus,
          takeoffs: takeoffs.length
        },
        message: 'Resumo calculado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao buscar resumo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      // Buscar todos os takeoffs do projeto
      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId 
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      const allTakeoffs = result.data?.items || result.data?.data || [];

      // Separar por tipo
      const measurements = allTakeoffs.filter((t: any) => 
        !t.metadata?.isDrawing && 
        !t.metadata?.isNote && 
        !t.metadata?.isYardage
      );
      
      const trenches = allTakeoffs.filter((t: any) => t.type === 'trench');
      const conduits = allTakeoffs.filter((t: any) => t.type === 'conduit');
      const vaults = allTakeoffs.filter((t: any) => t.type === 'vault');
      
      const yardages = allTakeoffs.filter((t: any) => 
        t.metadata?.isYardage === true || 
        t.metadata?.yardage === true ||
        (t.total_volume && t.total_volume > 0)
      );
      
      const notes = allTakeoffs.filter((t: any) => 
        t.metadata?.isNote === true || 
        t.metadata?.note === true
      );

      res.json({
        success: true,
        data: {
          measurements,
          trenches,
          conduits,
          vaults,
          yardages,
          notes,
          total: allTakeoffs.length
        },
        message: 'Todas as medições listadas com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao buscar medições:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // Limpar dados do projeto
  static async clearProjectData(req: Request, res: Response): Promise<void> {
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

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      // Deletar todos os takeoffs do projeto
      const result = await takeoffService.deleteTakeoffsByProject(projectId, userId);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json({
        success: true,
        message: result.message || 'Dados limpos com sucesso',
        data: result.data
      });
    } catch (error: any) {
      console.error('Erro ao limpar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
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

  // ============================================================================
  // TAKEOFF DRAWINGS - Desenhos de takeoff
  // ============================================================================

  /**
   * Listar desenhos de takeoff de um projeto
   * Drawings são takeoffs do tipo 'custom' com metadata indicando que são desenhos
   */
  static async getTakeoffDrawings(req: Request, res: Response): Promise<void> {
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

      // Buscar takeoffs do tipo custom com metadata de drawing
      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId,
        type: 'custom'
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Filtrar apenas drawings (takeoffs com metadata.isDrawing = true)
      const drawings = (result.data?.items || result.data?.data || []).filter((takeoff: any) => 
        takeoff.metadata?.isDrawing === true || takeoff.metadata?.drawing === true
      );

      res.json({
        success: true,
        data: drawings,
        total: drawings.length,
        message: 'Desenhos listados com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao buscar desenhos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar novo desenho de takeoff
   */
  static async createTakeoffDrawing(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      // Criar takeoff do tipo custom com metadata de drawing
      const operation = {
        data: {
          name: req.body.name || `Drawing - ${new Date().toISOString()}`,
          description: req.body.description || 'Desenho de takeoff',
          type: 'custom' as const,
          project_id: projectId,
          priority: req.body.priority || 'medium' as const,
          metadata: {
            ...req.body.metadata,
            isDrawing: true,
            drawing: true,
            fileName: req.body.fileName,
            fileUrl: req.body.fileUrl,
            originalName: req.body.originalName
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar desenho:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ============================================================================
  // TRENCHES - Valas/escavações
  // ============================================================================

  /**
   * Listar valas/escavações de um projeto
   */
  static async getTrenches(req: Request, res: Response): Promise<void> {
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

      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId,
        type: 'trench'
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar valas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar nova vala/escavação
   */
  static async createTrench(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      const operation = {
        data: {
          name: req.body.name || `Trench - ${new Date().toISOString()}`,
          description: req.body.description,
          type: 'trench' as const,
          project_id: projectId,
          priority: req.body.priority || 'medium' as const,
          assigned_to: req.body.assigned_to,
          start_date: req.body.start_date,
          end_date: req.body.end_date,
          metadata: {
            ...req.body.metadata,
            length: req.body.length,
            width: req.body.width,
            depth: req.body.depth,
            volume: req.body.volume,
            soil_type: req.body.soil_type,
            coordinates: req.body.coordinates
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar vala:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ============================================================================
  // CONDUITS - Tubulações
  // ============================================================================

  /**
   * Listar tubulações de um projeto
   */
  static async getConduits(req: Request, res: Response): Promise<void> {
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

      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId,
        type: 'conduit'
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar tubulações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar nova tubulação
   */
  static async createConduit(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      const operation = {
        data: {
          name: req.body.name || `Conduit - ${new Date().toISOString()}`,
          description: req.body.description,
          type: 'conduit' as const,
          project_id: projectId,
          priority: req.body.priority || 'medium' as const,
          assigned_to: req.body.assigned_to,
          start_date: req.body.start_date,
          end_date: req.body.end_date,
          metadata: {
            ...req.body.metadata,
            length: req.body.length,
            diameter: req.body.diameter,
            material: req.body.material,
            depth: req.body.depth,
            coordinates: req.body.coordinates
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar tubulação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ============================================================================
  // VAULTS - Poços/caixas
  // ============================================================================

  /**
   * Listar poços/caixas de um projeto
   */
  static async getVaults(req: Request, res: Response): Promise<void> {
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

      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId,
        type: 'vault'
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Erro ao buscar poços:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar novo poço/caixa
   */
  static async createVault(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      const operation = {
        data: {
          name: req.body.name || `Vault - ${new Date().toISOString()}`,
          description: req.body.description,
          type: 'vault' as const,
          project_id: projectId,
          priority: req.body.priority || 'medium' as const,
          assigned_to: req.body.assigned_to,
          start_date: req.body.start_date,
          end_date: req.body.end_date,
          metadata: {
            ...req.body.metadata,
            width: req.body.width,
            height: req.body.height,
            depth: req.body.depth,
            volume: req.body.volume,
            material: req.body.material,
            coordinates: req.body.coordinates
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar poço:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ============================================================================
  // YARDAGES - Volumes
  // ============================================================================

  /**
   * Listar volumes de um projeto
   */
  static async getYardages(req: Request, res: Response): Promise<void> {
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

      // Yardages são takeoffs com metadata de yardage ou tipo custom com volume
      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Filtrar takeoffs que têm volume significativo ou metadata de yardage
      const yardages = (result.data?.items || result.data?.data || []).filter((takeoff: any) => 
        takeoff.metadata?.isYardage === true || 
        takeoff.metadata?.yardage === true ||
        (takeoff.total_volume && takeoff.total_volume > 0)
      );

      res.json({
        success: true,
        data: yardages,
        total: yardages.length,
        message: 'Volumes listados com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao buscar volumes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar novo volume
   */
  static async createYardage(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      const operation = {
        data: {
          name: req.body.name || `Yardage - ${new Date().toISOString()}`,
          description: req.body.description,
          type: req.body.type || 'custom' as const,
          project_id: projectId,
          priority: req.body.priority || 'medium' as const,
          assigned_to: req.body.assigned_to,
          start_date: req.body.start_date,
          end_date: req.body.end_date,
          total_volume: req.body.volume || req.body.total_volume,
          metadata: {
            ...req.body.metadata,
            isYardage: true,
            yardage: true,
            volume: req.body.volume,
            unit: req.body.unit || 'm³',
            material: req.body.material,
            coordinates: req.body.coordinates
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar volume:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  // ============================================================================
  // NOTES - Anotações
  // ============================================================================

  /**
   * Listar anotações de um projeto
   */
  static async getNotes(req: Request, res: Response): Promise<void> {
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

      // Notes são takeoffs do tipo custom com metadata de note
      const result = await takeoffService.listTakeoffs({ 
        project_id: projectId,
        type: 'custom'
      }, userId);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      // Filtrar apenas notes (takeoffs com metadata.isNote = true)
      const notes = (result.data?.items || result.data?.data || []).filter((takeoff: any) => 
        takeoff.metadata?.isNote === true || takeoff.metadata?.note === true
      );

      res.json({
        success: true,
        data: notes,
        total: notes.length,
        message: 'Anotações listadas com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao buscar anotações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Criar nova anotação
   */
  static async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false,
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'projectId é obrigatório'
        });
        return;
      }

      const operation = {
        data: {
          name: req.body.name || `Note - ${new Date().toISOString()}`,
          description: req.body.description || req.body.content || req.body.note,
          type: 'custom' as const,
          project_id: projectId,
          priority: req.body.priority || 'low' as const,
          assigned_to: req.body.assigned_to,
          metadata: {
            ...req.body.metadata,
            isNote: true,
            note: true,
            content: req.body.content || req.body.note || req.body.description,
            category: req.body.category,
            tags: req.body.tags,
            coordinates: req.body.coordinates,
            attachments: req.body.attachments
          }
        },
        user_id: userId
      };

      const result = await takeoffService.createTakeoff(operation);
      
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Erro ao criar anotação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }
}
