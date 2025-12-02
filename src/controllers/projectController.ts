// ============================================================================
// CONTROLLER PARA PROJETOS
// ============================================================================

import { Request, Response } from 'express';
import { ProjectService } from '../services/project-service';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Criar novo projeto
   * POST /api/v1/projects
   */
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, pdfUrl, pdfId, scale } = req.body;
      
      if (!name || !pdfUrl || !pdfId || !scale) {
        res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: name, pdfUrl, pdfId, scale'
        });
        return;
      }
      
      const project = await this.projectService.createProject({
        name,
        description,
        pdfUrl,
        pdfId,
        scale
      });
      
      res.status(201).json({
        success: true,
        message: 'Projeto criado com sucesso',
        data: project
      });
    } catch (error: any) {
      console.error('Erro ao criar projeto:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao criar projeto',
        message: error.message
      });
    }
  };

  /**
   * Obter projeto por ID
   * GET /api/v1/projects/:id
   */
  getProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const project = await this.projectService.getProjectById(id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Projeto não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: project
      });
    } catch (error: any) {
      console.error('Erro ao obter projeto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Listar projetos
   * GET /api/v1/projects
   */
  listProjects = async (_req: Request, res: Response) => {
    try {
      const projects = await this.projectService.listProjects();
      
      res.json({
        success: true,
        data: {
          projects,
          total: projects.length
        }
      });
    } catch (error: any) {
      console.error('Erro ao listar projetos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };

  /**
   * Atualizar projeto
   * PUT /api/v1/projects/:id
   */
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, scale } = req.body;
      
      const project = await this.projectService.updateProject(id, {
        name,
        description,
        scale
      });
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Projeto não encontrado'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Projeto atualizado com sucesso',
        data: project
      });
    } catch (error: any) {
      console.error('Erro ao atualizar projeto:', error);
      res.status(400).json({
        success: false,
        error: 'Erro ao atualizar projeto',
        message: error.message
      });
    }
  };

  /**
   * Deletar projeto
   * DELETE /api/v1/projects/:id
   */
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const deleted = await this.projectService.deleteProject(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Projeto não encontrado'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Projeto deletado com sucesso'
      });
    } catch (error: any) {
      console.error('Erro ao deletar projeto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  };
}

