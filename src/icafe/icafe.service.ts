import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom, catchError, map } from 'rxjs';

@Injectable()
    export class IcafeService {
        private readonly logger = new Logger(IcafeService.name);
        private readonly baseUrl = 'https://api.icafecloud.com';
        private readonly cafeId: string;
        private readonly authToken: string;

        constructor(
            private readonly httpService: HttpService,
            private readonly configService: ConfigService,
        ) {
            // Retrieve credentials once during service initialization
            this.cafeId = this.configService.get<string>('ICAFE_CAFE_ID');
            this.authToken = this.configService.get<string>('ICAFE_AUTH_TOKEN');

            if (!this.cafeId || !this.authToken) {
                this.logger.error('iCafeCloud Cafe ID or Auth Token missing in configuration!');
                throw new Error('Missing iCafeCloud credentials in environment variables.');
            }
        }

        // Helper to get standard request configuration
        private getRequestConfig(): AxiosRequestConfig {
            return {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Accept': 'application/json',
                    // Add Content-Type if needed for POST/PUT, but not for GET
                },
            };
        }

        /**
   * Fetches the list and status of all PCs from iCafeCloud.
   * @returns Promise<any[]> Array of PC objects from the API.
   * @throws HttpException on API error.
   */
  async getPcsList(): Promise<any[]> {
    const url = `${this.baseUrl}/${this.cafeId}/pcs`;
    this.logger.log(`Fetching PC list from: ${url}`);

    const requestConfig = this.getRequestConfig();

    return firstValueFrom( // Convert Observable to Promise
      this.httpService.get(url, requestConfig).pipe(
        map(response => {
          // Assuming the actual PC array is nested under response.data.data
          // Adjust this based on the exact structure you observed in Postman
          if (response.data && Array.isArray(response.data.data)) {
            this.logger.log(`Successfully fetched ${response.data.data.length} PCs.`);
            return response.data.data;
          } else {
            this.logger.warn('PC list response structure unexpected:', response.data);
            return []; // Return empty array or throw error if structure is mandatory
          }
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`Error fetching PC list: ${error.message}`, error.stack);
          const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
          const message = error.response?.data || 'Failed to fetch PC list from iCafeCloud';
          throw new HttpException(message, status);
        }),
      ),
    );
  }

   /**
   * Fetches detailed status, including current user, for a specific PC.
   * @param pcName The name of the PC (e.g., "PC14")
   * @returns Promise<any> Object containing details for the specified PC.
   * @throws HttpException on API error or if PC not found (based on API behavior).
   */
   async getConsoleDetail(pcName: string): Promise<any> {
    // URL encode the pcName in case it contains special characters
    const encodedPcName = encodeURIComponent(pcName);
    const url = `${this.baseUrl}/${this.cafeId}/pcs/action/consoleDetail?pc_name=${encodedPcName}`;
    this.logger.log(`Fetching console detail for ${pcName} from: ${url}`);

    const requestConfig = this.getRequestConfig();

    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map(response => {
          // Assuming the detailed PC object is directly under response.data.data
          // Adjust based on the exact structure you observed
          if (response.data && response.data.data) {
             this.logger.log(`Successfully fetched console detail for ${pcName}.`);
            // You might want to check here if response.data.data is an object
            return response.data.data;
          } else {
            // This might happen if the PC name doesn't exist or the API returns differently
            this.logger.warn(`Console detail response structure unexpected for ${pcName}:`, response.data);
            // Depending on API behavior for non-existent PC, you might get a 404 handled below,
            // or a 200 with empty data. Decide how to handle empty data.
            // Returning null might be appropriate if the PC detail simply wasn't found but no error occurred.
             return null;
             // OR throw new HttpException(`Console detail not found or invalid format for ${pcName}`, HttpStatus.NOT_FOUND);
          }
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`Error fetching console detail for ${pcName}: ${error.message}`, error.stack);
          const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
          // Handle 404 specifically if the API uses it for non-existent PCs
          if (status === HttpStatus.NOT_FOUND) {
             this.logger.warn(`Console detail API returned 404 for ${pcName}. PC likely not found.`);
             throw new HttpException(`PC '${pcName}' not found via iCafeCloud API`, HttpStatus.NOT_FOUND);
          }
          const message = error.response?.data || `Failed to fetch console detail for ${pcName} from iCafeCloud`;
          throw new HttpException(message, status);
        }),
      ),
    );
  }

    }
