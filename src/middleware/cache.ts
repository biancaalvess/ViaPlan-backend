import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
import { log } from '../utils/winstonLogger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  skipCache?: boolean; // Skip cache for this request
  invalidatePattern?: string; // Pattern to invalidate related cache
}

/**
 * Middleware de cache para GET requests
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Verificar se deve pular o cache
    if (options.skipCache || req.query.skipCache === 'true') {
      return next();
    }

    try {
      const { ttl = 300, key: customKey } = options; // Default 5 minutes
      
      // Gerar chave do cache
      const cacheKey = customKey || generateCacheKey(req);
      
      // Tentar obter do cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        log.debug('Cache hit', { key: cacheKey, url: req.url });
        
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Cache miss - continuar com a requisição
      log.debug('Cache miss', { key: cacheKey, url: req.url });
      
      // Interceptar a resposta para armazenar no cache
      const originalJson = res.json;
      res.json = function(data: any) {
        // Armazenar no cache apenas se a resposta for bem-sucedida
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, { ttl }).catch(error => {
            log.error('Error setting cache', { key: cacheKey, error });
          });
        }
        
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      log.error('Cache middleware error', error);
      next(); // Continuar mesmo se houver erro no cache
    }
  };
};

/**
 * Middleware para invalidar cache
 */
export const invalidateCache = (pattern: string) => {
  return async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Interceptar a resposta para invalidar cache após operação bem-sucedida
      const originalJson = res.json;
      res.json = function(data: any) {
        // Invalidar cache apenas se a operação foi bem-sucedida
        if (res.statusCode >= 200 && res.statusCode < 300) {
          invalidateCacheByPattern(pattern).catch(error => {
            log.error('Error invalidating cache', { pattern, error });
          });
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      log.error('Cache invalidation middleware error', error);
      next();
    }
  };
};

/**
 * Gerar chave do cache baseada na requisição
 */
function generateCacheKey(req: Request): string {
  const { url, query, user } = req;
  
  // Incluir parâmetros da query na chave
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  
  // Incluir ID do usuário se autenticado
  const userId = user?.id || 'anonymous';
  
  // Gerar hash da chave
  const keyString = `${url}?${queryString}&user=${userId}`;
  return Buffer.from(keyString).toString('base64');
}

/**
 * Invalidar cache por padrão
 */
async function invalidateCacheByPattern(pattern: string): Promise<void> {
  try {
    // Para cache em memória, limpar todas as chaves que correspondem ao padrão
    if (cacheService['useMemoryCache']) {
      const memoryCache = cacheService['memoryCache'] as Map<string, any>;
      const keysToDelete: string[] = [];
      
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      for (const key of keysToDelete) {
        memoryCache.delete(key);
      }
      
      log.info('Invalidated memory cache', { pattern, count: keysToDelete.length });
      return;
    }

    // Para Redis, usar SCAN para encontrar chaves
    if (cacheService['client'] && cacheService['isConnected']) {
      const client = cacheService['client'];
      const keys = await client.keys(`viaplan:*${pattern}*`);
      
      if (keys.length > 0) {
        await client.del(keys);
        log.info('Invalidated Redis cache', { pattern, count: keys.length });
      }
    }
  } catch (error) {
    log.error('Error invalidating cache by pattern', { pattern, error });
  }
}

/**
 * Cache específico para takeoffs
 */
export const takeoffCache = cacheMiddleware({
  ttl: 600, // 10 minutos
  key: 'takeoffs'
});

/**
 * Cache específico para uploads
 */
export const uploadCache = cacheMiddleware({
  ttl: 300, // 5 minutos
  key: 'uploads'
});

/**
 * Invalidar cache de takeoffs
 */
export const invalidateTakeoffCache = invalidateCache('takeoffs');

/**
 * Invalidar cache de uploads
 */
export const invalidateUploadCache = invalidateCache('uploads');
