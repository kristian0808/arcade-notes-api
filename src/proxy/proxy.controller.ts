import { Controller, Post, Get, Put, Delete, Body, Param, Query, Headers, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map, catchError } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { Public } from 'src/auth/public.decorator';

@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly baseUrl = 'https://api.icafecloud.com/api/v2/cafe';
  private readonly cafeId: string;
  private readonly authToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.cafeId = this.configService.get<string>('ICAFE_CAFE_ID');
    this.authToken = this.configService.get<string>('ICAFE_AUTH_TOKEN');

    if (!this.cafeId || !this.authToken) {
      this.logger.error('ICAFE_CAFE_ID or ICAFE_AUTH_TOKEN missing in configuration!');
      throw new Error('Missing iCafeCloud credentials in environment variables.');
    }

    this.logger.log(`ProxyController initialized with cafe ID: ${this.cafeId}`);
  }

  private getRequestConfig(): AxiosRequestConfig {
    return {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };
  }

  // Generic proxy for any ICafe endpoint - GET requests
  @Public()
  @Get('icafe/*splat')
  async proxyGetAny(
    @Param('splat') path: string,
    @Query() queryParams: any,
  ): Promise<any> {
    // Validate and construct the full ICafe API URL
    if (!path) {
      throw new Error('Path parameter is required');
    }

    // 🔧 FIX: Decode URL and fix comma issue
    let fullPath = decodeURIComponent(path).replace(/,/g, '/');
    
    // If path doesn't start with cafe ID, prepend it
    if (!fullPath.startsWith(this.cafeId)) {
      fullPath = `${this.cafeId}/${fullPath}`;
    }
    
    const url = `${this.baseUrl}/${fullPath}`;
    
    // 🔍 DETAILED DEBUGGING LOGS
    this.logger.log(`[PROXY DEBUG] ==========================================`);
    this.logger.log(`[PROXY DEBUG] Original path param: "${path}"`);
    this.logger.log(`[PROXY DEBUG] Cafe ID: "${this.cafeId}"`);
    this.logger.log(`[PROXY DEBUG] Full path constructed: "${fullPath}"`);
    this.logger.log(`[PROXY DEBUG] Base URL: "${this.baseUrl}"`);
    this.logger.log(`[PROXY DEBUG] Final URL: "${url}"`);
    this.logger.log(`[PROXY DEBUG] Query params: ${JSON.stringify(queryParams)}`);
    this.logger.log(`[PROXY DEBUG] Auth token (first 10 chars): "${this.authToken?.substring(0, 10)}..."`);
    this.logger.log(`[PROXY DEBUG] ==========================================`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`[PROXY DEBUG] ✅ SUCCESS - Status: ${response.status}`);
          this.logger.log(`[PROXY DEBUG] ✅ Response headers: ${JSON.stringify(response.headers)}`);
          this.logger.log(`[PROXY DEBUG] ✅ Response data preview: ${JSON.stringify(response.data).substring(0, 200)}...`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`[PROXY DEBUG] ❌ ERROR - Status: ${error.response?.status}`);
          this.logger.error(`[PROXY DEBUG] ❌ Error message: ${error.message}`);
          this.logger.error(`[PROXY DEBUG] ❌ Error response: ${JSON.stringify(error.response?.data)}`);
          this.logger.error(`[PROXY DEBUG] ❌ Error config URL: ${error.config?.url}`);
          throw error;
        }),
      ),
    );
  }

  // Generic proxy for any ICafe endpoint - POST requests
  @Public()
  @Post('icafe/*splat')
  async proxyPostAny(
    @Param('splat') path: string,
    @Body() body: any,
    @Query() queryParams: any,
  ): Promise<any> {
    // Validate and construct the full ICafe API URL
    if (!path) {
      throw new Error('Path parameter is required');
    }

    // 🔧 FIX: Decode URL and fix comma issue
    let fullPath = decodeURIComponent(path).replace(/,/g, '/');
    
    // If path doesn't start with cafe ID, prepend it
    if (!fullPath.startsWith(this.cafeId)) {
      fullPath = `${this.cafeId}/${fullPath}`;
    }
    
    const url = `${this.baseUrl}/${fullPath}`;
    
    this.logger.log(`[GENERIC PROXY] POST ${url}`);
    this.logger.log(`[GENERIC PROXY] Body: ${JSON.stringify(body)}`);
    this.logger.log(`[GENERIC PROXY] Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.post(url, body, requestConfig).pipe(
        map((response) => {
          this.logger.log(`[GENERIC PROXY] POST success: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`[GENERIC PROXY] POST error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Generic proxy for any ICafe endpoint - PUT requests
  @Public()
  @Put('icafe/*splat')
  async proxyPutAny(
    @Param('splat') path: string,
    @Body() body: any,
    @Query() queryParams: any,
  ): Promise<any> {
    // Validate and construct the full ICafe API URL
    if (!path) {
      throw new Error('Path parameter is required');
    }

    // 🔧 FIX: Decode URL and fix comma issue
    let fullPath = decodeURIComponent(path).replace(/,/g, '/');
    
    // If path doesn't start with cafe ID, prepend it
    if (!fullPath.startsWith(this.cafeId)) {
      fullPath = `${this.cafeId}/${fullPath}`;
    }
    
    const url = `${this.baseUrl}/${fullPath}`;
    
    this.logger.log(`[GENERIC PROXY] PUT ${url}`);
    this.logger.log(`[GENERIC PROXY] Body: ${JSON.stringify(body)}`);
    this.logger.log(`[GENERIC PROXY] Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.put(url, body, requestConfig).pipe(
        map((response) => {
          this.logger.log(`[GENERIC PROXY] PUT success: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`[GENERIC PROXY] PUT error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Generic proxy for any ICafe endpoint - DELETE requests
  @Public()
  @Delete('icafe/*splat')
  async proxyDeleteAny(
    @Param('splat') path: string,
    @Query() queryParams: any,
  ): Promise<any> {
    // Validate and construct the full ICafe API URL
    if (!path) {
      throw new Error('Path parameter is required');
    }

    // 🔧 FIX: Decode URL and fix comma issue
    let fullPath = decodeURIComponent(path).replace(/,/g, '/');
    
    // If path doesn't start with cafe ID, prepend it
    if (!fullPath.startsWith(this.cafeId)) {
      fullPath = `${this.cafeId}/${fullPath}`;
    }
    
    const url = `${this.baseUrl}/${fullPath}`;
    
    this.logger.log(`[GENERIC PROXY] DELETE ${url}`);
    this.logger.log(`[GENERIC PROXY] Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.delete(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`[GENERIC PROXY] DELETE success: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`[GENERIC PROXY] DELETE error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

}