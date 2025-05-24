import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheRefreshService } from './cache-refresh.service';
import { IcafeModule } from '../icafe/icafe.module'; // Import IcafeModule

@Module({
  imports: [
    NestCacheModule.register({
      ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
      max: 100, // maximum number of items in cache
      isGlobal: true,
    }),
    IcafeModule, // Add IcafeModule to imports
  ],
  providers: [CacheService, CacheRefreshService],
  exports: [CacheService, CacheRefreshService], // Export CacheRefreshService
})
export class CacheModule {}
