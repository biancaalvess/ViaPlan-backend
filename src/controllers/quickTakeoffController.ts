// ============================================================================
// CONTROLLER PARA QUICK TAKEOFF
// ============================================================================

import { Request, Response } from 'express';
import { quickTakeoffService } from '../services/quick-takeoff-service';
import path from 'path';
import fs from 'fs';

export class QuickTakeoffController {
  
  /**
   * Processa um PDF existente para Quick Takeoff
   */
  static async processExistingPDF(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, fileName, scale = 1.0 } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      if (!projectId || !fileName) {
        res.status(400).json({
          success: false,
          message: 'projectId e fileName são obrigatórios'
        });
        return;
      }

      console.log('🔧 Processando PDF existente para Quick Takeoff:', { projectId, fileName, scale });

      // Verificar se o arquivo existe
      const filePath = path.join(process.cwd(), 'uploads', 'takeoff', fileName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
        return;
      }

      // Processar usando o serviço
      const result = await quickTakeoffService.processExistingPDF({
        projectId,
        fileName,
        scale: parseFloat(scale.toString()),
        userId
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'PDF processado com sucesso para Quick Takeoff'
      });

    } catch (error) {
      console.error('❌ Erro ao processar PDF para Quick Takeoff:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca dados de um takeoff específico
   */
  static async getTakeoffData(req: Request, res: Response): Promise<void> {
    try {
      const { takeoffId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      console.log('🔧 Buscando dados do takeoff:', takeoffId);

      const result = await quickTakeoffService.getQuickTakeoff(takeoffId, userId);
      
      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.message || 'Takeoff não encontrado',
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('❌ Erro ao buscar dados do takeoff:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista takeoffs de um projeto
   */
  static async listTakeoffs(req: Request, res: Response): Promise<void> {
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

      console.log('🔧 Listando takeoffs do projeto:', projectId);

      const result = await quickTakeoffService.listQuickTakeoffs(projectId, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('❌ Erro ao listar takeoffs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza um takeoff
   */
  static async updateTakeoff(req: Request, res: Response): Promise<void> {
    try {
      const { takeoffId } = req.params;
      const updateData = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      console.log('🔧 Atualizando takeoff:', takeoffId);

      const result = await quickTakeoffService.updateQuickTakeoff(takeoffId, updateData, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        data: result.data,
        message: 'Takeoff atualizado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar takeoff:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Deleta um takeoff
   */
  static async deleteTakeoff(req: Request, res: Response): Promise<void> {
    try {
      const { takeoffId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ 
          success: false, 
          message: 'Usuário não autenticado' 
        });
        return;
      }

      console.log('🔧 Deletando takeoff:', takeoffId);

      const result = await quickTakeoffService.deleteQuickTakeoff(takeoffId, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Takeoff deletado com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao deletar takeoff:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
