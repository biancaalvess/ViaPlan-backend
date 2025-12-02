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
  calculateDistance,
  calculateArea,
  calculateVolumeByDepth,
  calculateSlope
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
   */
  calculateDistance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { point1, point2, scale, unit } = req.body;
      
      const distance = calculateDistance(point1, point2, scale || '1:1', unit || 'meters');
      
      res.json({
        success: true,
        data: { distance, unit: unit || 'meters' }
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
   */
  calculateArea = async (req: Request, res: Response): Promise<void> => {
    try {
      const { points, scale, unit } = req.body;
      
      const result = calculateArea(points, scale || '1:1', unit || 'square_meters');
      
      res.json({
        success: true,
        data: result
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
      
      const volume = calculateVolumeByDepth(area, depth, unit || 'cubic_meters');
      
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
      
      const result = calculateSlope(point1, point2, scale || '1:1', unit || 'meters');
      
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

