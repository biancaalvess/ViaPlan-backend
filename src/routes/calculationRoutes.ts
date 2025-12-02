// ============================================================================
// ROTAS PARA CÁLCULOS DE MEDIÇÃO
// ============================================================================

import { Router } from 'express';
import { MeasurementController } from '../controllers/measurementController';
import { validateRequest } from '../middleware/validation';
import {
  calculateDistanceSchema,
  calculateAreaSchema,
  calculateVolumeSchema,
  calculateSlopeSchema
} from '../middleware/measurement-validation';

const router = Router();
const controller = new MeasurementController();

/**
 * POST /api/v1/calculations/distance
 * Calcular distância entre dois pontos
 */
router.post(
  '/distance',
  validateRequest(calculateDistanceSchema),
  controller.calculateDistance
);

/**
 * POST /api/v1/calculations/area
 * Calcular área de um polígono
 */
router.post(
  '/area',
  validateRequest(calculateAreaSchema),
  controller.calculateArea
);

/**
 * POST /api/v1/calculations/volume
 * Calcular volume por profundidade
 */
router.post(
  '/volume',
  validateRequest(calculateVolumeSchema),
  controller.calculateVolume
);

/**
 * POST /api/v1/calculations/slope
 * Calcular declividade
 */
router.post(
  '/slope',
  validateRequest(calculateSlopeSchema),
  controller.calculateSlope
);

export default router;

