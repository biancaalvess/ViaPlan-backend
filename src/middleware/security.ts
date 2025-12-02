import cors from 'cors';
import helmet from 'helmet';

// Configuração melhorada do CORS
export const corsMiddleware = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Lista de origens permitidas
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'https://viaplan-test.netlify.app',
      'https://viaplan-frontend.vercel.app',
      'https://viaplan-plants.vercel.app',
      'https://viaplan-admin.vercel.app'
    ];

    // Permitir requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Verificar se a origem está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log de tentativa de acesso não autorizado
      console.warn(`CORS: Origin não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-ViaPlan-Session', 
    'Accept', 
    'Origin', 
    'Cache-Control',
    'X-API-Key',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'Content-Length', 
    'X-ViaPlan-Session',
    'X-Total-Count',
    'X-Page-Count',
    'X-Cache',
    'X-Cache-Key',
    'X-Response-Time'
  ],
  optionsSuccessStatus: 204,
  preflightContinue: false,
  maxAge: 86400 // 24 horas
});

// Configuração robusta do Helmet
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

// Middleware de segurança básico
export const securityMiddleware = [
  helmetMiddleware,
  corsMiddleware
];

import rateLimit from 'express-rate-limit';

// Função para criar rate limiter real
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
} = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutos
    max: options.max || 100, // limite de requisições
    message: options.message || {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Muitas requisições. Tente novamente em alguns minutos.'
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiters específicos
export const authRateLimiter = createRateLimiter({ 
  windowMs: 15 * 60 * 1000, 
  max: 5, // Apenas 5 tentativas de login por 15 minutos
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
});

export const uploadRateLimiter = createRateLimiter({ 
  windowMs: 15 * 60 * 1000, 
  max: 10, // 10 uploads por 15 minutos
  message: 'Muitos uploads. Tente novamente em alguns minutos.'
});

export const apiRateLimiter = createRateLimiter({ 
  windowMs: 15 * 60 * 1000, 
  max: 1000, // 1000 requisições por 15 minutos
  message: 'Muitas requisições. Tente novamente em alguns minutos.'
});

