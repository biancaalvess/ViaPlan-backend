import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
const envFile = process.env.NODE_ENV === 'production' ? './env.production' : './env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export interface AppConfig {
  // Configurações básicas
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  
  // Configurações de segurança
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGINS: string[];
  
  
  // Configurações de upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  THUMBNAIL_DIR: string;
  
  // Configurações de logging
  LOG_LEVEL: string;
  LOG_DIR: string;
  
  // Configurações de rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

// Validação das variáveis de ambiente obrigatórias
const requiredEnvVars = [
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(`⚠️  AVISO DE SEGURANÇA: Usando valores padrão temporários para: ${missingEnvVars.join(', ')}`);
    console.warn('🚨 CONFIGURE AS VARIÁVEIS DE AMBIENTE IMEDIATAMENTE!');
  } else {
    throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missingEnvVars.join(', ')}`);
  }
}

// Configuração da aplicação
export const config: AppConfig = {
  // Configurações básicas
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3003'),
  HOST: process.env.HOST || 'localhost',
  
  // Configurações de segurança
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  AVISO DE SEGURANÇA: Usando valores padrão temporários para: JWT_SECRET');
      console.log('🚨 CONFIGURE AS VARIÁVEIS DE AMBIENTE IMEDIATAMENTE!');
      return 'TEMP_JWT_SECRET_FOR_PRODUCTION_' + Date.now();
    }
    return 'DEV_JWT_SECRET_ONLY_FOR_DEVELOPMENT_' + Date.now();
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CORS_ORIGINS: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000'
      ],
  
  
  // Configurações de upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '209715200'), // 200MB em bytes
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  THUMBNAIL_DIR: process.env.THUMBNAIL_DIR || path.join(process.cwd(), 'thumbnails'),
  
  // Configurações de logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
  
  // Configurações de rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

// Configurações específicas por ambiente
export const environmentConfig = {
  development: {
    cors: {
      origin: config.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With', 'Cache-Control']
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
    },
    multer: {
      limits: {
        fileSize: config.MAX_FILE_SIZE,
        files: 10
      }
    }
  },
  
  production: {
    cors: {
      origin: config.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    multer: {
      limits: {
        fileSize: config.MAX_FILE_SIZE,
        files: 5
      }
    }
  }
};

// Função para obter configuração baseada no ambiente
export const getEnvironmentConfig = () => {
  return environmentConfig[config.NODE_ENV as keyof typeof environmentConfig] || environmentConfig.development;
};

// Função para validar configuração
export const validateConfig = (): void => {
  const errors: string[] = [];
  
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT deve estar entre 1 e 65535');
  }
  
  if (config.MAX_FILE_SIZE <= 0) {
    errors.push('MAX_FILE_SIZE deve ser maior que 0');
  }
  
  if (config.RATE_LIMIT_WINDOW_MS <= 0) {
    errors.push('RATE_LIMIT_WINDOW_MS deve ser maior que 0');
  }
  
  if (config.RATE_LIMIT_MAX_REQUESTS <= 0) {
    errors.push('RATE_LIMIT_MAX_REQUESTS deve ser maior que 0');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuração inválida: ${errors.join(', ')}`);
  }
};

// Função para obter configuração de CORS
export const getCorsConfig = () => {
  return getEnvironmentConfig().cors;
};

// Função para obter configuração do Helmet
export const getHelmetConfig = () => {
  return getEnvironmentConfig().helmet;
};

// Função para obter configuração do Multer
export const getMulterConfig = () => {
  return getEnvironmentConfig().multer;
};

// Função para verificar se está em produção
export const isProduction = () => config.NODE_ENV === 'production';

// Função para verificar se está em desenvolvimento
export const isDevelopment = () => config.NODE_ENV === 'development';

// Função para obter URL base da aplicação
export const getBaseUrl = () => {
  const protocol = isProduction() ? 'https' : 'http';
  return `${protocol}://${config.HOST}:${config.PORT}`;
};

// Exportar configuração padrão
export default config;
