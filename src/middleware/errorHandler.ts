import { Request, Response, NextFunction } from 'express';
// import { errorTrackingService } from '../services/errorTrackingService'; // Serviço removido

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  type?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Conflito de dados') {
    super(message, 409);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Rastrear erro (serviço removido)
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Erros conhecidos do Express
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Arquivo muito grande',
      message: 'O arquivo enviado excede o tamanho máximo permitido (200MB)',
      maxSize: '200MB',
      errorId,
      timestamp: new Date().toISOString()
    });
  }

  // Erros do Multer
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      success: false,
      error: 'Muitos arquivos',
      message: 'Muitos arquivos foram enviados de uma vez. Máximo: 10 arquivos',
      maxFiles: 10,
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Arquivo muito grande',
      message: 'Tamanho do arquivo excede o limite de 200MB',
      maxSize: '200MB',
      timestamp: new Date().toISOString()
    });
  }

  // Timeout errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return res.status(408).json({
      success: false,
      error: 'Timeout',
      message: 'A operação demorou muito tempo. Tente novamente.',
      timestamp: new Date().toISOString()
    });
  }

  // Erros de validação
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erros de autenticação
  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      error: 'Erro de autenticação',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erros de autorização
  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: 'Erro de autorização',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erros de não encontrado
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Não encontrado',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erros de conflito
  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: 'Conflito',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erros customizados
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      success: false,
      error: 'Erro da aplicação',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Erro padrão para erros desconhecidos
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  // Em produção, não expor detalhes do erro
  const isProduction = process.env.NODE_ENV === 'production';
  
  return res.status(statusCode).json({
    success: false,
    error: 'Erro interno',
    message: isProduction ? 'Ocorreu um erro inesperado' : message,
    ...(isProduction ? {} : { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Não encontrado',
    message: 'O recurso solicitado não foi encontrado',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      '/',
      '/health',
      '/api/auth',
      '/api/projects',
      '/api/plants',
      '/api/system',
      '/api/takeoff',
      '/api/quick-takeoff',
      '/api/tools-config'
    ],
    timestamp: new Date().toISOString()
  });
};
