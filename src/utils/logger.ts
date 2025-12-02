import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
  requestId?: string;
  userId?: string;
  url?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private logDir: string;
  private logLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logLevel = this.getLogLevel();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    this.ensureLogDirectory();
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level}] ${entry.context ? `[${entry.context}] ` : ''}${entry.message}`;
    
    if (entry.data || entry.error) {
      const additionalData = {
        ...(entry.data && { data: entry.data }),
        ...(entry.error && { 
          error: {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          }
        }),
        ...(entry.requestId && { requestId: entry.requestId }),
        ...(entry.userId && { userId: entry.userId }),
        ...(entry.url && { url: entry.url }),
        ...(entry.method && { method: entry.method }),
        ...(entry.ip && { ip: entry.ip }),
        ...(entry.userAgent && { userAgent: entry.userAgent })
      };
      
      return `${baseLog} ${JSON.stringify(additionalData, null, 2)}`;
    }
    
    return baseLog;
  }

  private writeToFile(entry: LogEntry): void {
    try {
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `${date}.log`);
      
      const logLine = this.formatLogEntry(entry) + '\n';
      
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Erro ao escrever no arquivo de log:', error);
    }
  }

  private log(level: LogLevel, message: string, options: Partial<LogEntry> = {}): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...options
    };

    // Console output
    const consoleMessage = this.formatLogEntry(entry);
    switch (level) {
      case LogLevel.ERROR:
        console.error(consoleMessage);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        break;
    }

    // File output (only for ERROR and WARN in production)
    if (!this.isProduction || level === LogLevel.ERROR || level === LogLevel.WARN) {
      this.writeToFile(entry);
    }
  }

  error(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.ERROR, message, options);
  }

  warn(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.WARN, message, options);
  }

  info(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.INFO, message, options);
  }

  debug(message: string, options: Partial<LogEntry> = {}): void {
    this.log(LogLevel.DEBUG, message, options);
  }

  // Logs específicos para diferentes contextos
  request(req: any, message: string, level: LogLevel = LogLevel.INFO): void {
    this.log(level, message, {
      context: 'REQUEST',
      requestId: req.id || req.headers['x-request-id'],
      userId: req.user?.id || req.headers['x-user-id'],
      url: req.url,
      method: req.method,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  }

  database(operation: string, message: string, level: LogLevel = LogLevel.INFO): void {
    this.log(level, message, {
      context: 'DATABASE',
      data: { operation }
    });
  }

  auth(action: string, message: string, level: LogLevel = LogLevel.INFO): void {
    this.log(level, message, {
      context: 'AUTH',
      data: { action }
    });
  }

  file(operation: string, message: string, level: LogLevel = LogLevel.INFO): void {
    this.log(level, message, {
      context: 'FILE',
      data: { operation }
    });
  }

  // Log de performance
  performance(operation: string, duration: number, level: LogLevel = LogLevel.INFO): void {
    this.log(level, `Operação ${operation} executada em ${duration}ms`, {
      context: 'PERFORMANCE',
      data: { operation, duration }
    });
  }

  // Log de erro com contexto
  errorWithContext(message: string, error: Error, context: string = 'GENERAL'): void {
    this.error(message, {
      context,
      error
    });
  }

  // Log de início e fim de operações
  startOperation(operation: string, context: string = 'GENERAL'): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.info(`Iniciando operação: ${operation}`, {
      context,
      data: { operation, operationId }
    });
    return operationId;
  }

  endOperation(operation: string, operationId: string, context: string = 'GENERAL'): void {
    this.info(`Finalizando operação: ${operation}`, {
      context,
      data: { operation, operationId }
    });
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Middleware para logging de requests
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Adicionar ID único ao request
  req.id = requestId;
  
  // Log do início da requisição
  logger.request(req, `Requisição iniciada: ${req.method} ${req.url}`, LogLevel.INFO);
  
  // Interceptar o fim da resposta
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    logger.request(req, `Requisição finalizada: ${req.method} ${req.url} - ${statusCode} (${duration}ms)`, LogLevel.INFO);
  });
  
  next();
};

// Função helper para log de erros assíncronos
export const logAsyncError = async (operation: string, error: Error, context: string = 'ASYNC'): Promise<void> => {
  logger.errorWithContext(`Erro na operação assíncrona: ${operation}`, error, context);
};

// Função helper para log de operações com try-catch
export const withLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context: string = 'OPERATION'
): Promise<T> => {
  const operationId = logger.startOperation(operation, context);
  
  try {
    const result = await fn();
    logger.endOperation(operation, operationId, context);
    return result;
  } catch (error) {
    logger.errorWithContext(`Erro na operação: ${operation}`, error as Error, context);
    throw error;
  }
};
