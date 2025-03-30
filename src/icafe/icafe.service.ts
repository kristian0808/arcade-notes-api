import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom, catchError, map } from 'rxjs';

@Injectable()
export class IcafeService {
    private readonly logger = new Logger(IcafeService.name);
    private readonly baseUrl = 'https://api.icafecloud.com/api/v2/cafe';
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

    // Helper to get standard request config
    private getRequestConfig(): AxiosRequestConfig {
        return {
            headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Accept': 'application/json',
            },
        };
    }

    async getMemberById(memberId: number): Promise<any> {
        const url = `${this.baseUrl}/${this.cafeId}/members/${memberId}`;
        this.logger.log(`Fetching member ID ${memberId} from: ${url}`);

        const requestConfig = this.getRequestConfig();

        return firstValueFrom(
            this.httpService.get(url, requestConfig).pipe(
                map(response => {
                    if (response.data?.data?.member) {
                        this.logger.log(`Successfully fetched member ID ${memberId}.`);
                        return response.data.data.member;
                    } else {
                        this.logger.warn('Member response structure unexpected:', response.data);
                        return null;
                    }
                }),
                catchError((error: AxiosError) => {
                    const status = error.response?.status;
                    if (status === HttpStatus.NOT_FOUND) {
                        this.logger.warn(`Member ID ${memberId} not found via iCafeCloud API (404).`);
                        throw new NotFoundException(`Member with ID ${memberId} not found in iCafeCloud.`);
                    }
                    this.logger.error(`Error fetching member detail for ID ${memberId}: ${error.message}`, error.stack);
                    const message = error.response?.data || `Failed to fetch member detail for ID ${memberId} from iCafeCloud`;
                    throw new HttpException(message, status || HttpStatus.INTERNAL_SERVER_ERROR);
                }),
            ),
        );
    }

    /**
     * Search for a member by their account name with pagination support
     * @param accountName The account name to search for
     * @returns The member object if found
     * @throws NotFoundException if member not found
     */
    async getMemberByAccount(accountName: string): Promise<any> {
        this.logger.log(`Searching for member with account name: ${accountName}`);
        
        const url = `${this.baseUrl}/${this.cafeId}/members`;
        let currentPage = 1;
        let allMembers: any[] = [];
        let hasMoreResults = true;

        while (hasMoreResults) {
            const requestConfig = {
                ...this.getRequestConfig(),
                params: {
                    search_text: accountName,
                    search_field: 'member_account',
                    sort_name: 'member_account',
                    sort: 'asc',
                    page: currentPage
                }
            };

            try {
                const response = await firstValueFrom(
                    this.httpService.get(url, requestConfig).pipe(
                        map(response => response.data?.data),
                        catchError((error: AxiosError) => {
                            this.logger.error(
                                `Error searching for member with account ${accountName}: ${error.message}`,
                                error.stack
                            );
                            throw new HttpException(
                                `Failed to search for member with account ${accountName}`,
                                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                            );
                        })
                    )
                );

                if (response?.members && Array.isArray(response.members)) {
                    const members = response.members;
                    this.logger.log(`Fetched ${members.length} members from page ${currentPage}`);

                    // Add members from this page to our collection
                    allMembers = [...allMembers, ...members];

                    // Look for exact match in current batch
                    const exactMatch = members.find(
                        member => member.member_account === accountName
                    );
                    
                    if (exactMatch) {
                        this.logger.log(`Found exact match for ${accountName} with ID ${exactMatch.member_id}`);
                        return exactMatch;
                    }

                    // If we got less members than expected or none, we've reached the end
                    if (members.length === 0) {
                        hasMoreResults = false;
                    } else {
                        currentPage++;
                    }
                } else {
                    hasMoreResults = false;
                }
            } catch (error) {
                this.logger.error(`Failed to fetch page ${currentPage}: ${error.message}`);
                break;
            }
        }

        // If we've collected members but no exact match, try to find the best match
        if (allMembers.length > 0) {
            // Try case-insensitive match
            const lowerAccountName = accountName.toLowerCase();
            const caseInsensitiveMatch = allMembers.find(
                member => member.member_account.toLowerCase() === lowerAccountName
            );

            if (caseInsensitiveMatch) {
                this.logger.log(`Found case-insensitive match for ${accountName}`);
                return caseInsensitiveMatch;
            }

            // Return the first result as closest match
            this.logger.log(`No exact match found, returning closest match from ${allMembers.length} total results`);
            return allMembers[0];
        }

        // If we've exhausted all pages and found no matches
        this.logger.warn(`No members found matching account name: ${accountName} after checking ${currentPage} pages`);
        throw new NotFoundException(`Member with account name '${accountName}' not found`);
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

        return firstValueFrom(
            this.httpService.get(url, requestConfig).pipe(
                map(response => {
                    if (response.data && Array.isArray(response.data.data)) {
                        this.logger.log(`Successfully fetched ${response.data.data.length} PCs.`);
                        return response.data.data;
                    } else {
                        this.logger.warn('PC list response structure unexpected:', response.data);
                        return [];
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
    async getConsoleDetail(pcName: string): Promise<any | null> {
        const encodedPcName = encodeURIComponent(pcName);
        const url = `${this.baseUrl}/${this.cafeId}/pcs/action/consoleDetail?pc_name=${encodedPcName}`;
        this.logger.log(`Fetching console detail for ${pcName} from: ${url}`);
    
        const requestConfig = this.getRequestConfig();
    
        return firstValueFrom(
          this.httpService.get(url, requestConfig).pipe(
            map(response => {
              if (response.data?.data.pc) {
                 this.logger.log(`Successfully fetched console detail for ${pcName}.`);
                return response.data.data.pc;
              } else {
                this.logger.warn(`Console detail response structure unexpected for ${pcName}:`, response.data);
                return null;
              }
            }),
            catchError((error: AxiosError) => {
              this.logger.error(`Error fetching console detail for ${pcName}: ${error.message}`, error.stack);
              const status = error.response?.status;
              if (status === HttpStatus.NOT_FOUND) {
                 this.logger.warn(`Console detail API returned 404 for ${pcName}. PC likely not found.`);
                 throw new NotFoundException(`PC '${pcName}' not found via iCafeCloud API`);
              }
              const message = error.response?.data || `Failed to fetch console detail for ${pcName} from iCafeCloud`;
              throw new HttpException(message, status || HttpStatus.INTERNAL_SERVER_ERROR);
            }),
          ),
        );
    }
}
