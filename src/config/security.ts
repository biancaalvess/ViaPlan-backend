// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA - BACKEND VIAPLAN
// ============================================================================

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Interface para configurações de segurança
interface SecurityConfig {
  jwtSecret: string;
  jwtExpiration: string;
  corsOrigin: string | string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  uploadPath: string;
  nodeEnv: string;
}

// Função para obter configurações de segurança
export const getSecurityConfig = (): SecurityConfig => {
  // Validar variáveis obrigatórias
  const requiredVars = ['JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`❌ Variáveis de ambiente obrigatórias não configuradas: ${missingVars.join(', ')}`);
  }
  
  // Configurações de segurança
  const config: SecurityConfig = {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiration: process.env.JWT_EXPIRATION || '24h',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutos
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '209715200'), // 200MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,jpg,jpeg,png,txt').split(','),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    nodeEnv: process.env.NODE_ENV || 'development'
  };
  
  return config;
};

// Função para validar configurações de segurança
export const validateSecurityConfig = (): boolean => {
  try {
    const config = getSecurityConfig();
    
    // Validar JWT Secret
    if (config.jwtSecret.length < 32) {
      console.error('❌ JWT_SECRET deve ter pelo menos 32 caracteres');
      return false;
    }
    
    // Validar tamanho máximo de arquivo
    if (config.maxFileSize > 500 * 1024 * 1024) { // 500MB
      console.error('❌ MAX_FILE_SIZE não pode exceder 500MB');
      return false;
    }
    
    // Validar tipos de arquivo permitidos
    const validTypes = ['pdf', 'jpg', 'jpeg', 'png', 'txt', 'doc', 'docx', 'xls', 'xlsx'];
    const invalidTypes = config.allowedFileTypes.filter(type => !validTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      console.error('❌ Tipos de arquivo não permitidos:', invalidTypes);
      return false;
    }
    
    console.log('✅ Configurações de segurança validadas');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao validar configurações de segurança:', error);
    return false;
  }
};

// Função para obter configurações públicas (não sensíveis)
export const getPublicSecurityConfig = () => {
  const config = getSecurityConfig();
  
  return {
    maxFileSize: config.maxFileSize,
    allowedFileTypes: config.allowedFileTypes,
    rateLimitWindow: config.rateLimitWindow,
    rateLimitMax: config.rateLimitMax,
    environment: config.nodeEnv
  };
};

// Função para sanitizar logs de erro
export const sanitizeErrorLog = (error: any): any => {
  if (!error) return error;
  
  const sanitized = { ...error };
  
  // Remover informações sensíveis
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  // Remover stack trace em produção
  if (process.env.NODE_ENV === 'production') {
    delete sanitized.stack;
  }
  
  return sanitized;
};

// Função para configurar variáveis de ambiente seguras
export const setupSecureEnvironment = () => {
  // Validar configurações
  if (!validateSecurityConfig()) {
    throw new Error('❌ Configurações de segurança inválidas');
  }
  
  // Configurar variáveis de ambiente seguras
  const config = getSecurityConfig();
  
  // Log de configuração (sem informações sensíveis)
  console.log('🔒 Configurações de segurança carregadas:', {
    jwtExpiration: config.jwtExpiration,
    corsOrigin: Array.isArray(config.corsOrigin) ? config.corsOrigin.length : config.corsOrigin,
    rateLimitWindow: config.rateLimitWindow,
    rateLimitMax: config.rateLimitMax,
    maxFileSize: config.maxFileSize,
    allowedFileTypes: config.allowedFileTypes.length,
    uploadPath: config.uploadPath,
    environment: config.nodeEnv
  });
  
  return config;
};

// Configuração inicial
export const SECURITY_CONFIG = setupSecureEnvironment();
