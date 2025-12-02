import express from 'express';
import { QuickTakeoffController } from '../controllers/quickTakeoffController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authenticate);

// ============================================================================
// QUICK TAKEOFF - Processamento e visualização de PDFs
// ============================================================================

// Processar PDF existente para Quick Takeoff
router.post('/process-pdf', QuickTakeoffController.processExistingPDF);

// Buscar dados de um takeoff específico
router.get('/:takeoffId', QuickTakeoffController.getTakeoffData);

// Servir imagem de uma página específica (não implementado)
// router.get('/:takeoffId/page/:pageNumber/image', QuickTakeoffController.servePageImage);

// ============================================================================
// MEASUREMENTS - Medições com cálculo automático
// ============================================================================
// Nota: Métodos de medição movidos para measurementRoutes
// Use /api/v1/measurements para criar/listar/atualizar medições

// ============================================================================
// EXPORTS - Exportação de dados
// ============================================================================
// Nota: Exportação movida para measurementRoutes
// Use /api/v1/measurements/export para exportar medições

// ============================================================================
// SUMMARIES - Resumos e estatísticas
// ============================================================================
// Nota: Resumos movidos para measurementRoutes
// Use /api/v1/measurements/project/:projectId/summary para resumos

export default router;
