// ============================================================================
// CONTROLLER PARA FERRAMENTAS DE MEDIÇÃO VIAPLAN
// ============================================================================

import { Request, Response } from 'express';
import { MeasurementService } from '../services/measurement-service';
import {
  CreateMeasurementRequest,
  UpdateMeasurementRequest
} from '../types/measurement';
import {
  calculateDistance as calculateDistanceUtil,
  calculateArea as calculateAreaUtil,
  calculateVolumeByDepth as calculateVolumeByDepthUtil,
  calculateSlope as calculateSlopeUtil
} from '../services/measurement-calculations';

export class MeasurementController {
  private measurementService: MeasurementService;

  constructor() {
    this.measurementService = new MeasurementService();
  }

  /**
   * Criar nova medição
   * POST /api/v1/measurements
   */
  createMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateMeasurementRequest = req.body;
      
      // Log para debug - verificar se coordenadas têm page ou não
      if (request.data && (request.data as any).coordinates) {
        const coords = (request.data as any).coordinates;
        if (coords.length > 0) {
          const firstPoint = coords[0];
          console.log('📐 Criando medição:', {
            type: request.type,
            coordinatesCount: coords.length,
            firstPointHasPage: 'page' in firstPoint && firstPoint.page !== undefined,
            firstPoint: { x: firstPoint.x, y: firstPoint.y, page: firstPoint.page }
          });
        }
      }
      
      const measurement = await this.measurementService.createMeasurement(request);
      
      res.status(201).json({
        success: true,
        message: 'Medição criada com sucesso',
        data: measurement
      });
    } catch (error: any) {
      console.error('Erro ao criar medição:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao criar medição',
        message: error.message
      });
    }
  };

  /**
   * Obter medição por ID
   * GET /api/v1/measurements/:id
   */
  getMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const measurement = await this.measurementService.getMeasurementById(id);
      
      if (!measurement) {
        res.status(404).json({
          success: false,
          error: 'Medição não encontrada'
        });
      }
      
      res.json({
        success: true,
        data: measurement
      });
    } catch (error: any) {
      console.error('Erro ao obter medição:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Listar medições por projeto
   * GET /api/v1/measurements?projectId=:projectId
   */
  listMeasurements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.query;
      
      if (!projectId || typeof projectId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'projectId é obrigatório'
        });
        return;
      }
      
      const measurements = await this.measurementService.listMeasurements({ project_id: projectId });
      
      res.json({
        success: true,
        data: {
          measurements,
          total: measurements.length
        }
      });
    } catch (error: any) {
      console.error('Erro ao listar medições:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Atualizar medição
   * PUT /api/v1/measurements/:id
   */
  updateMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const update: UpdateMeasurementRequest = req.body;
      
      const measurement = await this.measurementService.updateMeasurement(id, update);
      
      if (!measurement) {
        res.status(404).json({
          success: false,
          error: 'Medição não encontrada'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Medição atualizada com sucesso',
        data: measurement
      });
    } catch (error: any) {
      console.error('Erro ao atualizar medição:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao atualizar medição',
        message: error.message
      });
    }
  };

  /**
   * Deletar medição
   * DELETE /api/v1/measurements/:id
   */
  deleteMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const deleted = await this.measurementService.deleteMeasurement(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Medição não encontrada'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Medição deletada com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao deletar medição:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Deletar múltiplas medições (útil para undo)
   * POST /api/v1/measurements/batch-delete
   * Body: { ids: string[] }
   */
  deleteMultipleMeasurements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Lista de IDs é obrigatória e deve ser um array não vazio'
        });
        return;
      }
      
      const result = await this.measurementService.deleteMultipleMeasurements(ids);
      
      res.json({
        success: true,
        message: `Deletadas ${result.deleted.length} de ${result.total} medições`,
        data: result
      });
    } catch (error: any) {
      console.error('Erro ao deletar múltiplas medições:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Exportar medição
   * GET /api/v1/measurements/:id/export?format=json|csv
   */
  exportMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const format = (req.query.format as 'json' | 'csv') || 'json';
      
      const exportData = await this.measurementService.exportMeasurement(id, format);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="measurement-${id}.json"`);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="measurement-${id}.csv"`);
      }
      
      res.send(exportData);
    } catch (error: any) {
      console.error('Erro ao exportar medição:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Medição não encontrada'
      });
    }
  };

  /**
   * Calcular distância
   * POST /api/v1/calculations/distance
   * Body: { point1, point2, scale, unit?, zoom? }
   * 
   * IMPORTANTE: Se as coordenadas incluem zoom do canvas, passe o parâmetro 'zoom'.
   * O backend compensará automaticamente para garantir medidas corretas.
   */
  calculateDistance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { point1, point2, scale, unit, zoom } = req.body;
      
      // Se zoom for fornecido, usar para compensar as coordenadas
      // Isso garante que medidas permaneçam corretas independente do zoom
      const distance = calculateDistanceUtil(
        point1, 
        point2, 
        scale || '1:1', 
        unit || 'meters',
        zoom // Passar zoom se fornecido
      );
      
      res.json({
        success: true,
        data: { distance, unit: unit || 'meters', zoom: zoom || 1.0 }
      });
    } catch (error: any) {
      console.error('Erro ao calcular distância:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao calcular distância',
        message: error.message
      });
    }
  };

  /**
   * Calcular área
   * POST /api/v1/calculations/area
   * Body: { points, scale, unit?, zoom? }
   * 
   * IMPORTANTE: Se as coordenadas incluem zoom do canvas, passe o parâmetro 'zoom'.
   * O backend compensará automaticamente para garantir medidas corretas.
   */
  calculateArea = async (req: Request, res: Response): Promise<void> => {
    try {
      const { points, scale, unit, zoom } = req.body;
      
      // Se zoom for fornecido, usar para compensar as coordenadas
      const result = calculateAreaUtil(
        points, 
        scale || '1:1', 
        unit || 'square_meters',
        zoom // Passar zoom se fornecido
      );
      
      res.json({
        success: true,
        data: { ...result, zoom: zoom || 1.0 }
      });
    } catch (error: any) {
      console.error('Erro ao calcular área:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao calcular área',
        message: error.message
      });
    }
  };

  /**
   * Calcular volume
   * POST /api/v1/calculations/volume
   */
  calculateVolume = async (req: Request, res: Response): Promise<void> => {
    try {
      const { area, depth, unit } = req.body;
      
      const volume = calculateVolumeByDepthUtil(area, depth, unit || 'cubic_meters');
      
      res.json({
        success: true,
        data: { volume, unit: unit || 'cubic_meters' }
      });
    } catch (error: any) {
      console.error('Erro ao calcular volume:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao calcular volume',
        message: error.message
      });
    }
  };

  /**
   * Calcular declividade
   * POST /api/v1/calculations/slope
   */
  calculateSlope = async (req: Request, res: Response): Promise<void> => {
    try {
      const { point1, point2, scale, unit } = req.body;
      
      const result = calculateSlopeUtil(point1, point2, scale || '1:1', unit || 'meters');
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Erro ao calcular declividade:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao calcular declividade',
        message: error.message
      });
    }
  };
}

