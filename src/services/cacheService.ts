// Redis é opcional - usar apenas se REDIS_URL estiver configurado
// import { createClient, RedisClientType } from 'redis';
import { log } from '../utils/winstonLogger';

type RedisClientType = any; // Placeholder type quando redis não está instalado

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private useMemoryCache = true;
  private memoryCache = new Map<string, { value: unknown; expires: number }>();

  constructor() {
    this.initializeCache();
  }

  /**
   * Inicializar cache (Redis ou memória)
   */
  private async initializeCache(): Promise<void> {
    try {
      // Tentar conectar ao Redis se disponível
      // Redis não está instalado - usando apenas cache em memória
      if (false && process.env.REDIS_URL) {
        // this.client = createClient({ url: process.env.REDIS_URL });

        this.client.on('error', (err: Error) => {
          log.warn('Redis connection error, falling back to memory cache', err);
          this.isConnected = false;
          this.useMemoryCache = true;
        });

        this.client.on('connect', () => {
          log.info('Connected to Redis cache');
          this.isConnected = true;
          this.useMemoryCache = false;
        });

        await this.client.connect();
      } else {
        log.info('Redis not configured, using memory cache');
        this.useMemoryCache = true;
      }
    } catch (error) {
      log.warn('Failed to connect to Redis, using memory cache', error);
      this.useMemoryCache = true;
    }
  }

  /**
   * Obter valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.useMemoryCache) {
        return this.getFromMemoryCache<T>(key);
      }

      if (this.client && this.isConnected) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      }

      return null;
    } catch (error) {
      log.error('Error getting from cache', { key, error });
      return null;
    }
  }

  /**
   * Definir valor no cache
   */
  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<boolean> {
    try {
      const { ttl = 3600, prefix = 'viaplan:' } = options;
      const fullKey = `${prefix}${key}`;

      if (this.useMemoryCache) {
        return this.setInMemoryCache(fullKey, value, ttl);
      }

      if (this.client && this.isConnected) {
        await this.client.setEx(fullKey, ttl, JSON.stringify(value));
        return true;
      }

      return false;
    } catch (error) {
      log.error('Error setting cache', { key, error });
      return false;
    }
  }

  /**
   * Deletar valor do cache
   */
  async delete(key: string, prefix = 'viaplan:'): Promise<boolean> {
    try {
      const fullKey = `${prefix}${key}`;

      if (this.useMemoryCache) {
        return this.deleteFromMemoryCache(fullKey);
      }

      if (this.client && this.isConnected) {
        const result = await this.client.del(fullKey);
        return result > 0;
      }

      return false;
    } catch (error) {
      log.error('Error deleting from cache', { key, error });
      return false;
    }
  }

  /**
   * Verificar se chave existe no cache
   */
  async exists(key: string, prefix = 'viaplan:'): Promise<boolean> {
    try {
      const fullKey = `${prefix}${key}`;

      if (this.useMemoryCache) {
        return this.memoryCache.has(fullKey) && this.memoryCache.get(fullKey)!.expires > Date.now();
      }

      if (this.client && this.isConnected) {
        const result = await this.client.exists(fullKey);
        return result > 0;
      }

      return false;
    } catch (error) {
      log.error('Error checking cache existence', { key, error });
      return false;
    }
  }

  /**
   * Limpar cache
   */
  async clear(prefix = 'viaplan:'): Promise<boolean> {
    try {
      if (this.useMemoryCache) {
        this.memoryCache.clear();
        return true;
      }

      if (this.client && this.isConnected) {
        const keys = await this.client.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        return true;
      }

      return false;
    } catch (error) {
      log.error('Error clearing cache', { error });
      return false;
    }
  }

  /**
   * Obter múltiplas chaves
   */
  async mget<T>(keys: string[], prefix = 'viaplan:'): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => `${prefix}${key}`);

      if (this.useMemoryCache) {
        return fullKeys.map(key => this.getFromMemoryCache<T>(key));
      }

      if (this.client && this.isConnected) {
        const values = await this.client.mGet(fullKeys);
        return values.map((value: string | null) => value ? JSON.parse(value) : null);
      }

      return keys.map(() => null);
    } catch (error) {
      log.error('Error getting multiple from cache', { keys, error });
      return keys.map(() => null);
    }
  }

  /**
   * Definir múltiplas chaves
   */
  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<boolean> {
    try {
      const { ttl = 3600, prefix = 'viaplan:' } = options;

      if (this.useMemoryCache) {
        for (const [key, value] of Object.entries(keyValuePairs)) {
          this.setInMemoryCache(`${prefix}${key}`, value, ttl);
        }
        return true;
      }

      if (this.client && this.isConnected) {
        const pipeline = this.client.multi();
        
        for (const [key, value] of Object.entries(keyValuePairs)) {
          pipeline.setEx(`${prefix}${key}`, ttl, JSON.stringify(value));
        }
        
        await pipeline.exec();
        return true;
      }

      return false;
    } catch (error) {
      log.error('Error setting multiple in cache', { error });
      return false;
    }
  }

  /**
   * Obter estatísticas do cache
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    connected: boolean;
    keys: number;
    memoryUsage?: number;
  }> {
    try {
      if (this.useMemoryCache) {
        return {
          type: 'memory',
          connected: true,
          keys: this.memoryCache.size
        };
      }

      if (this.client && this.isConnected) {
        const keys = await this.client.keys('viaplan:*');
        const info = await this.client.info('memory');
        
        return {
          type: 'redis',
          connected: true,
          keys: keys.length,
          memoryUsage: this.parseRedisMemoryInfo(info)
        };
      }

      return {
        type: 'redis',
        connected: false,
        keys: 0
      };
    } catch (error) {
      log.error('Error getting cache stats', { error });
      return {
        type: 'redis',
        connected: false,
        keys: 0
      };
    }
  }

  /**
   * Cache em memória - obter
   */
  private getFromMemoryCache<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    
    if (!item) {
      return null;
    }

    if (item.expires <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Cache em memória - definir
   */
  private setInMemoryCache(key: string, value: unknown, ttl: number): boolean {
    try {
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
      });

      // Limpar itens expirados periodicamente
      if (this.memoryCache.size > 1000) {
        this.cleanupMemoryCache();
      }

      return true;
    } catch (error) {
      log.error('Error setting in memory cache', { key, error });
      return false;
    }
  }

  /**
   * Cache em memória - deletar
   */
  private deleteFromMemoryCache(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  /**
   * Limpar cache em memória de itens expirados
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Parsear informações de memória do Redis
   */
  private parseRedisMemoryInfo(info: string): number {
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        return parseInt(line.split(':')[1]);
      }
    }
    return 0;
  }

  /**
   * Fechar conexão
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Instância singleton
export const cacheService = new CacheService();
export default cacheService;
