// ============================================================================
// ROTAS PARA PROJETOS
// ============================================================================

import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();
const controller = new ProjectController();

/**
 * POST /api/v1/projects
 * Criar novo projeto
 */
router.post('/', controller.createProject);

/**
 * GET /api/v1/projects/:id
 * Obter projeto específico
 */
router.get('/:id', controller.getProject);

/**
 * GET /api/v1/projects
 * Listar projetos
 */
router.get('/', controller.listProjects);

/**
 * PUT /api/v1/projects/:id
 * Atualizar projeto
 */
router.put('/:id', controller.updateProject);

/**
 * DELETE /api/v1/projects/:id
 * Excluir projeto
 */
router.delete('/:id', controller.deleteProject);

export default router;

