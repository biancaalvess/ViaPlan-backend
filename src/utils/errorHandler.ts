import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class ErrorHandler {
  /**
   * Criar erro operacional
   */
  static createError(message: string, statusCode: number = 500, code?: string): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    if (code) {
      error.code = code;
    }
    error.isOperational = true;
    return error;
  }

  /**
   * Middleware de tratamento de erros
   */
  static handleError(error: AppError, req: Request, res: Response, next: NextFunction) {
    console.error('❌ Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Se já foi respondido, não fazer nada
    if (res.headersSent) {
      return next(error);
    }

    // Erros conhecidos
    if (error.isOperational) {
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.code || 'OPERATIONAL_ERROR',
        message: error.message
      });
    }

    // Erros de validação
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message || 'Validation failed'
      });
    }

    // Erros de cast (ID inválido)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid ID format'
      });
    }

    // Erros de duplicação (removido - não há banco de dados)

    // Erro padrão
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    });
  }

  /**
   * Wrapper para funções assíncronas
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Métodos relacionados a banco de dados removidos (sistema agora é baseado em arquivos)
}
