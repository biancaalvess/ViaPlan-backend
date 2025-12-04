// ============================================================================
// CONTROLLER PARA FERRAMENTAS DE MEDIÇÃO - ENGENHARIA CIVIL PREDIAL
// ============================================================================

import { Request, Response } from 'express';
import { CivilMeasurementService } from '../services/civil-measurement-service';
import {
  CreateCivilMeasurementRequest,
  UpdateCivilMeasurementRequest
} from '../types/civil-measurement';

export class CivilMeasurementController {
  private measurementService: CivilMeasurementService;

  constructor() {
    this.measurementService = new CivilMeasurementService();
  }

  /**
   * Criar nova medição
   * POST /api/v1/civil-measurements
   */
  createMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: CreateCivilMeasurementRequest = {
        project_id: req.body.projectId || req.body.project_id,
        type: req.body.type,
        data: req.body.data,
        label: req.body.label
      };
      
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
   * GET /api/v1/civil-measurements/:id
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
        return;
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
   * GET /api/v1/civil-measurements?projectId=:projectId&type=:type
   */
  listMeasurements = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, type } = req.query;
      
      const measurements = await this.measurementService.listMeasurements(
        projectId as string,
        type as any
      );
      
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
   * PUT /api/v1/civil-measurements/:id
   */
  updateMeasurement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const update: UpdateCivilMeasurementRequest = req.body;
      
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
   * DELETE /api/v1/civil-measurements/:id
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
}

