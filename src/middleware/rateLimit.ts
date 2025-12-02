import rateLimit from 'express-rate-limit';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const createRateLimit = (options: RateLimitOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: options.standardHeaders !== false,
    legacyHeaders: options.legacyHeaders || false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (_req, res) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      
      res.set({
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': options.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + options.windowMs).toISOString()
      });
      
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: retryAfter,
        limit: options.max,
        windowMs: options.windowMs,
      });
    },
  });
};

// Predefined rate limiters - Ajustados para serem menos restritivos
export const strictLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Aumentado de 5 para 20 requests por windowMs
  message: 'Too many requests from this IP, please try again later.',
});

export const standardLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Aumentado de 100 para 200 requests por windowMs
  message: 'Too many requests from this IP, please try again later.',
});

export const uploadLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Aumentado de 50 para 100 upload requests por windowMs
  message: 'Too many upload requests from this IP, please try again later.',
});

export const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Aumentado de 10 para 30 auth requests por windowMs
  message: 'Too many authentication attempts from this IP, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Novo limitador para endpoints do sistema
export const systemLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 system requests por 15 minutos
  message: 'Too many system requests from this IP, please try again later.',
});

export default createRateLimit;
