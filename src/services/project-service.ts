// ============================================================================
// SERVIÇO PARA GERENCIAR PROJETOS
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/winstonLogger';
// Project interface for storage (simplified)
interface Project {
  id: string;
  name: string;
  description?: string;
  pdfUrl: string;
  pdfId: string;
  scale: string;
  measurements: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectService {
  private projectsDir: string;

  constructor() {
    this.projectsDir = path.join(process.cwd(), 'data', 'projects');
    
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
      log.info(`Diretório criado: ${this.projectsDir}`);
    }
    
    log.info('ProjectService inicializado');
  }

  /**
   * Criar novo projeto
   */
  async createProject(data: {
    name: string;
    description?: string;
    pdfUrl: string;
    pdfId: string;
    scale: string;
  }): Promise<Project> {
    try {
      const projectId = uuidv4();
      const now = new Date();
      
      const project: Project = {
        id: projectId,
        name: data.name,
        ...(data.description && { description: data.description }),
        pdfUrl: data.pdfUrl,
        pdfId: data.pdfId,
        scale: data.scale,
        measurements: [],
        createdAt: now,
        updatedAt: now
      };
      
      const projectPath = path.join(this.projectsDir, `${projectId}.json`);
      fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
      
      log.info('Projeto criado', { projectId, name: data.name });
      
      return project;
    } catch (error) {
      log.error('Erro ao criar projeto', error);
      throw error;
    }
  }

  /**
   * Obter projeto por ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    try {
      const projectPath = path.join(this.projectsDir, `${id}.json`);
      
      if (!fs.existsSync(projectPath)) {
        return null;
      }
      
      const content = fs.readFileSync(projectPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      log.error('Erro ao obter projeto', error);
      return null;
    }
  }

  /**
   * Listar todos os projetos
   */
  async listProjects(): Promise<Project[]> {
    try {
      const files = fs.readdirSync(this.projectsDir);
      const projects: Project[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const projectPath = path.join(this.projectsDir, file);
            const content = fs.readFileSync(projectPath, 'utf-8');
            const project = JSON.parse(content);
            projects.push(project);
          } catch (error) {
            log.warn(`Erro ao ler projeto ${file}`, error);
          }
        }
      }

      return projects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      log.error('Erro ao listar projetos', error);
      return [];
    }
  }

  /**
   * Atualizar projeto
   */
  async updateProject(id: string, update: {
    name?: string;
    description?: string;
    scale?: string;
  }): Promise<Project | null> {
    try {
      const project = await this.getProjectById(id);
      
      if (!project) {
        return null;
      }
      
      if (update.name) project.name = update.name;
      if (update.description !== undefined) project.description = update.description;
      if (update.scale) project.scale = update.scale;
      
      project.updatedAt = new Date();
      
      const projectPath = path.join(this.projectsDir, `${id}.json`);
      fs.writeFileSync(projectPath, JSON.stringify(project, null, 2));
      
      log.info('Projeto atualizado', { id });
      
      return project;
    } catch (error) {
      log.error('Erro ao atualizar projeto', error);
      throw error;
    }
  }

  /**
   * Deletar projeto
   */
  async deleteProject(id: string): Promise<boolean> {
    try {
      const projectPath = path.join(this.projectsDir, `${id}.json`);
      
      if (!fs.existsSync(projectPath)) {
        return false;
      }
      
      fs.unlinkSync(projectPath);
      
      log.info('Projeto deletado', { id });
      
      return true;
    } catch (error) {
      log.error('Erro ao deletar projeto', error);
      return false;
    }
  }
}

