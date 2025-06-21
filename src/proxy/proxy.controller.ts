import { Controller, Post, Get, Put, Delete, Body, Param, Query, Headers, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map, catchError } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { Public } from 'src/auth/public.decorator';

@Controller('api/v1/proxy')
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
  @Get('icafe/*')
  async proxyGetAny(
    @Param('0') path: string,
    @Query() queryParams: any,
  ): Promise<any> {
    // Construct the full ICafe API URL
    let fullPath = path;
    
    // If path doesn't start with cafe ID, prepend it
    if (!fullPath.startsWith(this.cafeId)) {
      fullPath = `${this.cafeId}/${fullPath}`;
    }
    
    const url = `${this.baseUrl}/${fullPath}`;
    
    this.logger.log(`[GENERIC PROXY] GET ${url}`);
    this.logger.log(`[GENERIC PROXY] Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`[GENERIC PROXY] GET success: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`[GENERIC PROXY] GET error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Generic proxy for any ICafe endpoint - POST requests
  @Public()
  @Post('icafe/*')
  async proxyPostAny(
    @Param('0') path: string,
    @Body() body: any,
    @Query() queryParams: any,
  ): Promise<any> {
    // Construct the full ICafe API URL
    let fullPath = path;
    
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
  @Put('icafe/*')
  async proxyPutAny(
    @Param('0') path: string,
    @Body() body: any,
    @Query() queryParams: any,
  ): Promise<any> {
    // Construct the full ICafe API URL
    let fullPath = path;
    
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
  @Delete('icafe/*')
  async proxyDeleteAny(
    @Param('0') path: string,
    @Query() queryParams: any,
  ): Promise<any> {
    // Construct the full ICafe API URL
    let fullPath = path;
    
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

  // Specific endpoint for testing - members
  @Public()
  @Get('members')
  async getMembers(@Query() queryParams: any): Promise<any> {
    const url = `${this.baseUrl}/${this.cafeId}/members`;
    
    this.logger.log(`Proxying members request to: ${url}`);
    this.logger.log(`Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`Members proxy response status: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`Members proxy error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Specific endpoint for testing - PCs
  @Public()
  @Get('pcs')
  async getPcs(@Query() queryParams: any): Promise<any> {
    const url = `${this.baseUrl}/${this.cafeId}/pcs`;
    
    this.logger.log(`Proxying PCs request to: ${url}`);
    this.logger.log(`Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`PCs proxy response status: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`PCs proxy error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Specific endpoint for testing - Products
  @Public()
  @Get('products')
  async getProducts(@Query() queryParams: any): Promise<any> {
    const url = `${this.baseUrl}/${this.cafeId}/products`;
    
    this.logger.log(`Proxying products request to: ${url}`);
    this.logger.log(`Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`Products proxy response status: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`Products proxy error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }

  // Specific endpoint for testing - Billing Logs
  @Public()
  @Get('billingLogs')
  async getBillingLogs(@Query() queryParams: any): Promise<any> {
    const url = `${this.baseUrl}/${this.cafeId}/billingLogs`;
    
    this.logger.log(`Proxying billing logs request to: ${url}`);
    this.logger.log(`Query params: ${JSON.stringify(queryParams)}`);

    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams,
    };

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map((response) => {
          this.logger.log(`Billing logs proxy response status: ${response.status}`);
          return response.data;
        }),
        catchError((error) => {
          this.logger.error(`Billing logs proxy error: ${error.message}`, error.stack);
          throw error;
        }),
      ),
    );
  }
}