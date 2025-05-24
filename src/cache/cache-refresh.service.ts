import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule'; // CronExpression is not strictly needed for '*/4 * * * *'
import { IcafeService } from '../icafe/icafe.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TimeframeEnum } from '../members/dto/member-rankings-query.dto';

@Injectable()
export class CacheRefreshService {
  private readonly logger = new Logger(CacheRefreshService.name);
  // Assuming '/api/v1' is your global prefix. Adjust if necessary.
  // If you don't have a global prefix or it's configured differently,
  // these keys might need to be just '/members/rankings?timeframe=...' and '/members'
  private readonly API_V1_PREFIX = '/api/v1'; 

  constructor(
    @Inject(forwardRef(() => IcafeService))
    private readonly icafeService: IcafeService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Refresh cache for member rankings (e.g., monthly) every 4 minutes.
   * This runs slightly more frequently than the cache TTL (5 minutes) to keep it warm.
   */
  @Cron('*/4 * * * *') // Runs every 4 minutes
  async refreshMonthlyMemberRankingsCache() {
    const timeframe = TimeframeEnum.MONTH;
    // Construct the cache key exactly as CacheInterceptor would for this request
    const cacheKey = `${this.API_V1_PREFIX}/members/rankings?timeframe=${timeframe}`;
    this.logger.log(`Warming cache for member rankings (timeframe: ${timeframe}) with key: ${cacheKey}`);
    
    try {
      const rankingsData = await this.icafeService.calculateMemberRankings(timeframe);
      // Set the data in cache with the same TTL as defined in CacheModule
      await this.cacheManager.set(cacheKey, rankingsData, 5 * 60);
      this.logger.log(`Successfully warmed cache for member rankings (timeframe: ${timeframe})`);
    } catch (error) {
      this.logger.error(`Error warming member rankings cache (timeframe: ${timeframe}): ${error.message}`, error.stack);
    }
  }

  async refreshRankingCacheForTimeframe(timeframe: TimeframeEnum) {
    const cacheKey = `${this.API_V1_PREFIX}/members/rankings?timeframe=${timeframe}`;
    this.logger.log(`Refreshing cache for member rankings (timeframe: ${timeframe}) with key: ${cacheKey}`);
    try {
      const rankingsData = await this.icafeService.calculateMemberRankings(timeframe);
      await this.cacheManager.set(cacheKey, rankingsData, 5 * 60); // 5 minutes TTL
      this.logger.log(`Successfully refreshed cache for member rankings (timeframe: ${timeframe})`);
    } catch (error) {
      this.logger.error(`Error refreshing member rankings cache (timeframe: ${timeframe}): ${error.message}`, error.stack);
    }
  }

  async refreshAllRankingTimeframesCache() {
    this.logger.log('Starting refresh for all ranking timeframes cache...');
    const timeframes = Object.values(TimeframeEnum);
    for (const timeframe of timeframes) {
      await this.refreshRankingCacheForTimeframe(timeframe);
    }
    this.logger.log('Completed refresh for all ranking timeframes cache.');
  }
  
  /**
   * Refresh all members cache every 4 minutes.
   */
  @Cron('*/4 * * * *') // Runs every 4 minutes
  async refreshAllMembersCache() {
    const cacheKey = `${this.API_V1_PREFIX}/members`;
    this.logger.log(`Warming cache for all members with key: ${cacheKey}`);
    
    try {
      const membersData = await this.icafeService.getAllMembers();
      await this.cacheManager.set(cacheKey, membersData, 5 * 60);
      this.logger.log('Successfully warmed cache for all members');
    } catch (error) {
      this.logger.error(`Error warming all members cache: ${error.message}`, error.stack);
    }
  }
}
