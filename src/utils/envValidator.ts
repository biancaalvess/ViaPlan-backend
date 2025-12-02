import Joi from 'joi';

// Schema de validação para variáveis de ambiente
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number()
    .port()
    .default(3003),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET deve ter pelo menos 32 caracteres',
      'any.required': 'JWT_SECRET é obrigatório'
    }),
  
  
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
  
  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://localhost:5173'),
  
  MAX_FILE_SIZE: Joi.number()
    .default(209715200), // 200MB
  
  UPLOAD_DIR: Joi.string()
    .default('./uploads'),
  
  THUMBNAIL_DIR: Joi.string()
    .default('./thumbnails'),
  
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(900000), // 15 minutos
  
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .default(100),
  
  // Redis é opcional (usado pelo cacheService)
  REDIS_URL: Joi.string()
    .optional()
});

export interface ValidatedEnv {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  LOG_LEVEL: string;
  CORS_ORIGINS: string;
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;
  THUMBNAIL_DIR: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  REDIS_URL?: string;
}

export function validateEnvironment(): ValidatedEnv {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    console.error('❌ Erro na validação das variáveis de ambiente:', {
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    
    console.error('❌ Variáveis de ambiente inválidas:');
    error.details.forEach(detail => {
      console.error(`   - ${detail.path.join('.')}: ${detail.message}`);
    });
    
    process.exit(1);
  }

  console.log('✅ Variáveis de ambiente validadas com sucesso');
  
  return value as ValidatedEnv;
}

export function checkRequiredEnvVars(): void {
  const requiredVars = [
    'JWT_SECRET'
  ];

  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Configure essas variáveis no arquivo .env');
    process.exit(1);
  }
}

export function logEnvironmentInfo(env: ValidatedEnv): void {
  console.log('🔧 Configuração do ambiente:');
  console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   - PORT: ${env.PORT}`);
  console.log(`   - LOG_LEVEL: ${env.LOG_LEVEL}`);
  console.log(`   - UPLOAD_DIR: ${env.UPLOAD_DIR}`);
  console.log(`   - THUMBNAIL_DIR: ${env.THUMBNAIL_DIR}`);
  console.log(`   - MAX_FILE_SIZE: ${env.MAX_FILE_SIZE / 1024 / 1024}MB`);
  console.log(`   - CORS_ORIGINS: ${env.CORS_ORIGINS}`);
  console.log(`   - RATE_LIMIT: ${env.RATE_LIMIT_MAX_REQUESTS} req/${env.RATE_LIMIT_WINDOW_MS / 1000}s`);
  
  if (env.REDIS_URL) {
    console.log(`   - REDIS_URL: ${env.REDIS_URL}`);
  }
}
