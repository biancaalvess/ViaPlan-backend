import winston from 'winston';
import path from 'path';

// Definir níveis de log personalizados
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Definir cores para cada nível
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Adicionar cores ao winston
winston.addColors(logColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Formato para arquivos (sem cores)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Definir transportes
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: logFormat,
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(process.env.LOG_DIR || './logs', 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Criar logger principal
const logger = winston.createLogger({
  level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
  levels: logLevels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Logger específico para HTTP requests
const httpLogger = winston.createLogger({
  level: 'http',
  levels: logLevels,
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'http.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Logger específico para auditoria
const auditLogger = winston.createLogger({
  level: 'info',
  levels: logLevels,
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'audit.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Logger específico para performance
const performanceLogger = winston.createLogger({
  level: 'info',
  levels: logLevels,
  format: fileFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'performance.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Funções de logging específicas
export const loggers = {
  // Logger principal
  main: logger,
  
  // Logger para HTTP requests
  http: httpLogger,
  
  // Logger para auditoria
  audit: auditLogger,
  
  // Logger para performance
  performance: performanceLogger,
};

// Funções de conveniência
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => httpLogger.http(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Logs específicos
  audit: (action: string, userId: string, details?: any) => {
    auditLogger.info('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      details,
    });
  },
  
  performance: (operation: string, duration: number, details?: any) => {
    performanceLogger.info('PERFORMANCE', {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      details,
    });
  },
  
  security: (event: string, details?: any) => {
    logger.warn('SECURITY', {
      event,
      timestamp: new Date().toISOString(),
      details,
    });
  },
  
  database: (operation: string, details?: any) => {
    logger.debug('DATABASE', {
      operation,
      timestamp: new Date().toISOString(),
      details,
    });
  },
};

// Middleware para logging de requests HTTP
export const httpRequestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Adicionar ID único ao request
  req.id = requestId;
  
  // Log da requisição
  httpLogger.http('HTTP Request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });
  
  // Interceptar o fim da resposta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    httpLogger.http('HTTP Response', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    
    // Registrar métricas (comentado para evitar dependência circular)
    // metricsService.recordRequest(isSuccess, duration);
    
    // Log de performance se a requisição demorou muito
    if (duration > 1000) {
      log.performance(`${req.method} ${req.url}`, duration, {
        requestId,
        statusCode,
        userId: req.user?.id,
      });
    }
  });
  
  next();
};

// Função para log de erros com contexto
export const logError = (error: Error, context: string, meta?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

// Função para log de auditoria
export const logAudit = (action: string, userId: string, resource?: string, details?: any) => {
  auditLogger.info('AUDIT', {
    action,
    userId,
    resource,
    timestamp: new Date().toISOString(),
    details,
  });
};

// Função para log de segurança
export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  
  logger[level]('SECURITY', {
    event,
    severity,
    timestamp: new Date().toISOString(),
    details,
  });
};

export default logger;
