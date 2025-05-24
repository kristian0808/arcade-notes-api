import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not in cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}: ${error.message}`, error.stack);
      return undefined;
    }
  }

  /**
   * Store a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Optional Time-to-live in milliseconds (overrides default ttl)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cached data for key: ${key}${ttl ? `, TTL: ${ttl}ms` : ''}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}: ${error.message}`, error.stack);
      // Continue execution - don't throw error for cache operations
    }
  }

  /**
   * Remove a specific item from the cache
   * @param key The cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Deleted cache for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}: ${error.message}`, error.stack);
      // Continue execution - don't throw error for cache operations
    }
  }

  /**
   * Remove all items from the cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
      this.logger.debug('Cleared all cache');
    } catch (error) {
      this.logger.error(`Error clearing cache: ${error.message}`, error.stack);
      // Continue execution - don't throw error for cache operations
    }
  }

  /**
   * Get or set a value using a factory function
   * @param key The cache key
   * @param factory Function to generate the value if not in cache
   * @param ttl Optional Time-to-live in milliseconds
   * @returns The cached or newly generated value
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      // Try to get from cache first
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
      
      // Generate the value
      this.logger.debug(`Generating value for cache key: ${key}`);
      try {
        const generatedValue = await factory();
        await this.set(key, generatedValue, ttl);
        return generatedValue;
      } catch (error) {
        this.logger.error(`Error generating value for cache key ${key}: ${error.message}`, error.stack);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Cache error for key ${key}: ${error.message}`, error.stack);
      // If there's a cache error, just execute the factory function directly
      return await factory();
    }
  }
}
