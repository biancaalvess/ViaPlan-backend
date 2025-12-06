// ============================================================================
// ROTAS PARA FERRAMENTAS DE MEDIÇÃO VIAPLAN
// ============================================================================

import { Router } from 'express';
import { MeasurementController } from '../controllers/measurementController';
import { validateRequest } from '../middleware/validation';
import {
  createMeasurementSchema,
  updateMeasurementSchema
} from '../middleware/measurement-validation';

const router = Router();
const controller = new MeasurementController();

// ============================================================================
// ENDPOINTS DE MEDIÇÕES
// ============================================================================

/**
 * POST /api/v1/measurements
 * Criar nova medição
 */
router.post(
  '/',
  validateRequest(createMeasurementSchema),
  controller.createMeasurement
);

/**
 * GET /api/v1/measurements/:id
 * Obter medição específica
 */
router.get('/:id', controller.getMeasurement);

/**
 * GET /api/v1/measurements?projectId=:projectId
 * Listar medições de um projeto
 */
router.get('/', controller.listMeasurements);

/**
 * PUT /api/v1/measurements/:id
 * Atualizar medição
 */
router.put(
  '/:id',
  validateRequest(updateMeasurementSchema),
  controller.updateMeasurement
);

/**
 * DELETE /api/v1/measurements/:id
 * Excluir medição
 */
router.delete('/:id', controller.deleteMeasurement);

/**
 * POST /api/v1/measurements/batch-delete
 * Deletar múltiplas medições (útil para undo)
 */
router.post('/batch-delete', controller.deleteMultipleMeasurements);

/**
 * GET /api/v1/measurements/:id/export?format=json|csv
 * Exportar medição
 */
router.get('/:id/export', controller.exportMeasurement);

export default router;

