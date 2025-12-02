import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Schemas comuns reutilizáveis
export const commonSchemas = {
  id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.number().integer().positive(),
    Joi.string().pattern(/^\d+$/)
  ).required()
    .messages({
      'alternatives.match': 'ID deve ser um UUID válido ou um número positivo',
      'any.required': 'ID é obrigatório'
    }),
  
  search: Joi.string().min(1).max(255).optional()
    .messages({
      'string.min': 'Termo de busca deve ter pelo menos 1 caractere',
      'string.max': 'Termo de busca deve ter no máximo 255 caracteres'
    }),
    
  fileUpload: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    code: Joi.string().alphanum().min(1).max(50).required(),
    description: Joi.string().max(1000).optional(),
    project_id: Joi.string().uuid().optional().allow(null),
    category_id: Joi.number().integer().positive().optional(),
    location: Joi.string().max(500).optional(),
    file_size: Joi.number().positive().max(200 * 1024 * 1024).required(),
    file_type: Joi.string().valid('pdf', 'jpg', 'jpeg', 'png', 'tiff', 'dwg', 'dxf').required(),
    mime_type: Joi.string().max(100).optional()
  })
};

// Schemas de validação para plantas (UPLOAD)
export const plantSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Nome da planta é obrigatório',
        'string.min': 'Nome deve ter pelo menos 1 caractere',
        'string.max': 'Nome deve ter no máximo 255 caracteres'
      }),
    code: Joi.string().alphanum().min(1).max(50).required()
      .messages({
        'string.empty': 'Código da planta é obrigatório',
        'string.alphanum': 'Código deve conter apenas letras e números',
        'string.min': 'Código deve ter pelo menos 1 caractere',
        'string.max': 'Código deve ter no máximo 50 caracteres'
      }),
    description: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      }),
    project_id: Joi.string().uuid().optional().allow(null)
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido'
      }),
    category_id: Joi.number().integer().positive().optional()
      .messages({
        'number.base': 'ID da categoria deve ser um número',
        'number.integer': 'ID da categoria deve ser um número inteiro',
        'number.positive': 'ID da categoria deve ser positivo'
      }),
    location: Joi.string().max(500).optional()
      .messages({
        'string.max': 'Localização deve ter no máximo 500 caracteres'
      }),
    file_size: Joi.number().positive().max(200 * 1024 * 1024).required()
      .messages({
        'number.base': 'Tamanho do arquivo deve ser um número',
        'number.positive': 'Tamanho do arquivo deve ser positivo',
        'number.max': 'Tamanho do arquivo deve ser no máximo 200MB'
      }),
    file_type: Joi.string().valid('pdf', 'jpg', 'jpeg', 'png', 'tiff', 'dwg', 'dxf').required()
      .messages({
        'string.empty': 'Tipo de arquivo é obrigatório',
        'any.only': 'Tipo de arquivo deve ser PDF, JPG, JPEG, PNG, TIFF, DWG ou DXF'
      }),
    mime_type: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Tipo MIME deve ter no máximo 100 caracteres'
      })
  }),

  upload: Joi.object({
    name: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Nome da planta é obrigatório',
        'string.min': 'Nome deve ter pelo menos 1 caractere',
        'string.max': 'Nome deve ter no máximo 255 caracteres'
      }),
    code: Joi.string().min(1).max(50).required()
      .messages({
        'string.empty': 'Código da planta é obrigatório',
        'string.min': 'Código deve ter pelo menos 1 caractere',
        'string.max': 'Código deve ter no máximo 50 caracteres'
      }),
    description: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      }),
    project_id: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.number().integer().positive(),
      Joi.string().pattern(/^\d+$/)
    ).optional().allow(null)
      .messages({
        'alternatives.match': 'ID do projeto deve ser um UUID válido ou número positivo'
      }),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').optional()
      .messages({
        'any.only': 'Status deve ser active, archived, draft, processing, completed ou error'
      }),
    location: Joi.string().max(500).optional()
      .messages({
        'string.max': 'Localização deve ter no máximo 500 caracteres'
      })
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255).optional()
      .messages({
        'string.min': 'Nome deve ter pelo menos 1 caractere',
        'string.max': 'Nome deve ter no máximo 255 caracteres'
      }),
    code: Joi.string().alphanum().min(1).max(50).optional()
      .messages({
        'string.alphanum': 'Código deve conter apenas letras e números',
        'string.min': 'Código deve ter pelo menos 1 caractere',
        'string.max': 'Código deve ter no máximo 50 caracteres'
      }),
    description: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      }),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').optional()
      .messages({
        'any.only': 'Status deve ser active, archived, draft, processing, completed ou error'
      }),
    category_id: Joi.number().integer().positive().optional()
      .messages({
        'number.base': 'ID da categoria deve ser um número',
        'number.integer': 'ID da categoria deve ser um número inteiro',
        'number.positive': 'ID da categoria deve ser positivo'
      }),
    location: Joi.string().max(500).optional()
      .messages({
        'string.max': 'Localização deve ter no máximo 500 caracteres'
      })
  }),

  list: Joi.object({
    project_id: Joi.string().uuid().optional().allow(null)
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido'
      }),
    status: Joi.string().valid('active', 'archived', 'draft', 'processing', 'completed', 'error').optional()
      .messages({
        'any.only': 'Status deve ser active, archived, draft, processing, completed ou error'
      }),
    search: Joi.string().max(100).optional()
      .messages({
        'string.max': 'Termo de busca deve ter no máximo 100 caracteres'
      }),
    category_id: Joi.number().integer().positive().optional()
      .messages({
        'number.base': 'ID da categoria deve ser um número',
        'number.integer': 'ID da categoria deve ser um número inteiro',
        'number.positive': 'ID da categoria deve ser positivo'
      }),
    limit: Joi.number().integer().min(1).max(100).default(20)
      .messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser pelo menos 1',
        'number.max': 'Limite deve ser no máximo 100'
      }),
    offset: Joi.number().integer().min(0).default(0)
      .messages({
        'number.base': 'Offset deve ser um número',
        'number.integer': 'Offset deve ser um número inteiro',
        'number.min': 'Offset deve ser pelo menos 0'
      })
  })
};

// Middleware de validação genérico
export const validateRequest = (schema: Joi.ObjectSchema | { body?: Joi.ObjectSchema, query?: Joi.ObjectSchema, params?: Joi.ObjectSchema }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Se é um schema simples (ObjectSchema), valida apenas o body
    if ('validate' in schema) {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        req.body = value;
      }
    } else {
      // Se é um objeto com body/query/params, valida cada parte
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });
        if (error) {
          errors.push(...error.details.map(detail => `Body: ${detail.message}`));
        } else {
          req.body = value;
        }
      }

      if (schema.query) {
        const { error, value } = schema.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true
        });
        if (error) {
          errors.push(...error.details.map(detail => `Query: ${detail.message}`));
        } else {
          req.query = value;
        }
      }

      if (schema.params) {
        const { error, value } = schema.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true
        });
        if (error) {
          errors.push(...error.details.map(detail => `Params: ${detail.message}`));
        } else {
          req.params = value;
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        error: 'VALIDATION_ERROR',
        details: errors
      });
      return;
    }

    next();
  };
};

// Middleware de validação para query parameters
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      res.status(400).json({
        success: false,
        message: 'Parâmetros de consulta inválidos',
        error: 'VALIDATION_ERROR',
        details: errorMessages
      });
      return;
    }

    req.query = value;
    next();
  };
};

// Middleware de validação para parâmetros de rota
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      res.status(400).json({
        success: false,
        message: 'Parâmetros de rota inválidos',
        error: 'VALIDATION_ERROR',
        details: errorMessages
      });
      return;
    }

    req.params = value;
    next();
  };
};

// Schemas para parâmetros de rota
export const paramSchemas = {
  plantId: Joi.object({
    id: Joi.string().uuid().required()
      .messages({
        'string.empty': 'ID da planta é obrigatório',
        'string.guid': 'ID da planta deve ser um UUID válido'
      })
  }),
  
  takeoffId: Joi.object({
    id: Joi.string().uuid().required()
      .messages({
        'string.empty': 'ID do takeoff é obrigatório',
        'string.guid': 'ID do takeoff deve ser um UUID válido'
      })
  }),
  
  projectId: Joi.object({
    id: Joi.string().uuid().required()
      .messages({
        'string.empty': 'ID do projeto é obrigatório',
        'string.guid': 'ID do projeto deve ser um UUID válido'
      })
  })
};

export default {
  plantSchemas,
  paramSchemas,
  validateRequest,
  validateQuery,
  validateParams
};
