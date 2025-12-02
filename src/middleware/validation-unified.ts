// ============================================================================
// VALIDAÇÃO UNIFICADA - SCHEMAS JOI PARA TAKEOFF E UPLOAD
// ============================================================================

import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// ============================================================================
// SCHEMAS BASE
// ============================================================================

// Schema para UUIDs
const uuidSchema = Joi.string().uuid().required();

// Schema para strings comuns
const stringSchema = Joi.string().trim().min(1);

// Schema para datas
const dateSchema = Joi.string().isoDate();

// ============================================================================
// SCHEMAS DE PLANTS (UPLOAD)
// ============================================================================

export const plantSchemas = {
  create: Joi.object({
    name: stringSchema.max(255).required(),
    code: stringSchema.max(100).required(),
    description: stringSchema.max(1000).optional(),
    category_id: Joi.number().integer().positive().optional(),
    project_id: uuidSchema.optional().allow(null),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').default('active'),
    file_path: stringSchema.required(),
    file_url: stringSchema.uri().required(),
    thumbnail_path: stringSchema.optional(),
    file_size: Joi.number().integer().positive().required(),
    file_type: stringSchema.max(50).required(),
    mime_type: stringSchema.max(100).optional(),
    original_filename: stringSchema.max(255).optional(),
    ocr_text: stringSchema.optional(),
    metadata: Joi.object().optional(),
    created_by: uuidSchema.optional(),
    uploaded_by: stringSchema.optional(),
    category: stringSchema.max(100).optional(),
    pages_count: Joi.number().integer().positive().optional(),
    avg_confidence: Joi.number().min(0).max(100).optional(),
    location: stringSchema.max(255).optional()
  }),

  update: Joi.object({
    name: stringSchema.max(255).optional(),
    code: stringSchema.max(100).optional(),
    description: stringSchema.max(1000).optional(),
    category_id: Joi.number().integer().positive().optional(),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').optional(),
    file_path: stringSchema.optional(),
    file_url: stringSchema.uri().optional(),
    thumbnail_path: stringSchema.optional(),
    file_size: Joi.number().integer().positive().optional(),
    file_type: stringSchema.max(50).optional(),
    mime_type: stringSchema.max(100).optional(),
    original_filename: stringSchema.max(255).optional(),
    ocr_text: stringSchema.optional(),
    metadata: Joi.object().optional(),
    category: stringSchema.max(100).optional(),
    pages_count: Joi.number().integer().positive().optional(),
    avg_confidence: Joi.number().min(0).max(100).optional(),
    location: stringSchema.max(255).optional()
  }),

  list: Joi.object({
    project_id: uuidSchema.optional().allow(null),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').optional(),
    search: stringSchema.optional(),
    category_id: Joi.number().integer().positive().optional().allow(null),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })
};

// ============================================================================
// SCHEMAS DE TAKEOFFS
// ============================================================================

export const takeoffSchemas = {
  create: Joi.object({
    name: stringSchema.max(255).required(),
    description: stringSchema.max(1000).optional(),
    type: Joi.string().valid('trench', 'conduit', 'bore_shot', 'hydro_excavation', 'vault', 'custom').required(),
    project_id: uuidSchema.required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    assigned_to: uuidSchema.optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    settings: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  update: Joi.object({
    name: stringSchema.max(255).optional(),
    description: stringSchema.max(1000).optional(),
    type: Joi.string().valid('trench', 'conduit', 'bore_shot', 'hydro_excavation', 'vault', 'custom').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    assigned_to: uuidSchema.optional(),
    start_date: dateSchema.optional(),
    end_date: dateSchema.optional(),
    status: Joi.string().valid('draft', 'in_progress', 'review', 'approved', 'completed', 'archived').optional(),
    progress: Joi.number().min(0).max(100).optional(),
    total_area: Joi.number().positive().optional(),
    total_length: Joi.number().positive().optional(),
    total_volume: Joi.number().positive().optional(),
    total_cost: Joi.number().positive().optional(),
    estimated_hours: Joi.number().positive().optional(),
    actual_hours: Joi.number().positive().optional(),
    reviewer: uuidSchema.optional(),
    approved_by: uuidSchema.optional(),
    approved_at: dateSchema.optional(),
    settings: Joi.object().optional(),
    metadata: Joi.object().optional()
  }),

  list: Joi.object({
    search: stringSchema.optional(),
    status: Joi.string().valid('draft', 'in_progress', 'review', 'approved', 'completed', 'archived').optional(),
    type: Joi.string().valid('trench', 'conduit', 'bore_shot', 'hydro_excavation', 'vault', 'custom').optional(),
    project_id: uuidSchema.optional(),
    created_by: uuidSchema.optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    page: Joi.number().integer().min(1).default(1),
    sortBy: stringSchema.valid('created_at', 'name', 'status', 'priority', 'start_date').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// ============================================================================
// SCHEMAS DE PARÂMETROS
// ============================================================================

export const paramSchemas = {
  plantId: uuidSchema,
  projectId: uuidSchema,
  takeoffId: uuidSchema
};

// ============================================================================
// MIDDLEWARE DE VALIDAÇÃO
// ============================================================================

/**
 * Middleware para validar corpo da requisição
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        error: 'VALIDATION_ERROR',
        details: errorDetails
      });
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Middleware para validar query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        success: false,
        message: 'Parâmetros de consulta inválidos',
        error: 'VALIDATION_ERROR',
        details: errorDetails
      });
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * Middleware para validar parâmetros da URL
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        success: false,
        message: 'Parâmetros da URL inválidos',
        error: 'VALIDATION_ERROR',
        details: errorDetails
      });
      return;
    }

    req.params = value;
    next();
  };
};

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export default {
  // Schemas
  plantSchemas,
  takeoffSchemas,
  paramSchemas,

  // Middleware
  validateRequest,
  validateQuery,
  validateParams
};
