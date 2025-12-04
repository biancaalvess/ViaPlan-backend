// ============================================================================
// ROTAS PARA FERRAMENTAS DE MEDIÇÃO - ENGENHARIA CIVIL PREDIAL
// ============================================================================

import { Router } from 'express';
import { CivilMeasurementController } from '../controllers/civilMeasurementController';
import { createCivilMeasurementSchema, updateCivilMeasurementSchema } from '../middleware/civil-measurement-validation';
import { validate } from '../middleware/validation';

const router = Router();
const controller = new CivilMeasurementController();

/**
 * @swagger
 * /api/v1/civil-measurements:
 *   post:
 *     summary: Criar nova medição civil
 *     tags: [Civil Measurements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectId, type, data, label]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [layout, wall, area, opening, slab, foundation, structure, finishing, roof, note]
 *               data:
 *                 type: object
 *               label:
 *                 type: string
 *     responses:
 *       201:
 *         description: Medição criada com sucesso
 *       400:
 *         description: Erro na validação
 */
router.post(
  '/',
  validate(createCivilMeasurementSchema),
  controller.createMeasurement
);

/**
 * @swagger
 * /api/v1/civil-measurements/{id}:
 *   get:
 *     summary: Obter medição por ID
 *     tags: [Civil Measurements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Medição encontrada
 *       404:
 *         description: Medição não encontrada
 */
router.get('/:id', controller.getMeasurement);

/**
 * @swagger
 * /api/v1/civil-measurements:
 *   get:
 *     summary: Listar medições
 *     tags: [Civil Measurements]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [layout, wall, area, opening, slab, foundation, structure, finishing, roof, note]
 *     responses:
 *       200:
 *         description: Lista de medições
 */
router.get('/', controller.listMeasurements);

/**
 * @swagger
 * /api/v1/civil-measurements/{id}:
 *   put:
 *     summary: Atualizar medição
 *     tags: [Civil Measurements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *               label:
 *                 type: string
 *     responses:
 *       200:
 *         description: Medição atualizada com sucesso
 *       404:
 *         description: Medição não encontrada
 */
router.put(
  '/:id',
  validate(updateCivilMeasurementSchema),
  controller.updateMeasurement
);

/**
 * @swagger
 * /api/v1/civil-measurements/{id}:
 *   delete:
 *     summary: Deletar medição
 *     tags: [Civil Measurements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Medição deletada com sucesso
 *       404:
 *         description: Medição não encontrada
 */
router.delete('/:id', controller.deleteMeasurement);

export default router;

