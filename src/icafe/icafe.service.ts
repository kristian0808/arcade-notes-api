import { NotesService } from './../notes/notes.service';
import { TabsService } from './../tabs/tabs.service';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { Model } from 'mongoose';
import { firstValueFrom, catchError, map } from 'rxjs';
import { Note, NoteDocument } from 'src/notes/schemas/note.schema';
import { BillingLogsParamsDto } from './dto/billing-logs-params.dto';
import { BillingLogResponseDto } from './dto/billing-log.dto';
import { TimeframeEnum } from 'src/members/dto/member-rankings-query.dto';
import { MemberRankingDto } from 'src/members/dto/member-ranking.dto';
import { MemberUsageData } from './dto/member-usage-data.dto';

@Injectable()
export class IcafeService {
    private readonly logger = new Logger(IcafeService.name);
    private readonly baseUrl = 'https://api.icafecloud.com/api/v2/cafe';
    private readonly cafeId: string;
    private readonly authToken: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => TabsService))
        private readonly tabsService: TabsService,
        @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
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

        const requestConfig = {
            ...this.getRequestConfig(),
            params: {
                sort: 'asc'
            }
        };

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

    // Billing logs for members
    async getBillingLogs(params: BillingLogsParamsDto): Promise<BillingLogResponseDto | null> {
    const url = `${this.baseUrl}/${this.cafeId}/billingLogs`;
    
    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (params.dateStart) queryParams.date_start = params.dateStart;
    if (params.dateEnd) queryParams.date_end = params.dateEnd;
    if (params.member) queryParams.member = params.member;
    if (params.event) queryParams.event = params.event;
    if (params.page) queryParams.page = params.page.toString();
    
    const requestConfig = {
      ...this.getRequestConfig(),
      params: queryParams
    };
    
    return firstValueFrom(
      this.httpService.get(url, requestConfig).pipe(
        map(response => {
          if (response.data?.code === 200 && response.data?.data) {
            return response.data.data;
          }
          this.logger.warn('Unexpected billingLogs response structure:', response.data);
          return null;
        }),
        catchError((error: AxiosError) => {
          this.logger.error(`Error fetching billing logs: ${error.message}`, error.stack);
          throw new HttpException(
            'Failed to fetch billing logs from iCafeCloud',
            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
          );
        })
      )
    );
  }

  async calculateMemberRankings(timeframe: TimeframeEnum = TimeframeEnum.MONTH): Promise<MemberRankingDto[]> {
    // Calculate date range based on timeframe
    const { startDate, endDate } = this.getDateRangeForTimeframe(timeframe);
    
    this.logger.log(`Calculating member rankings from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
    // We'll need to fetch multiple pages potentially
    const memberUsageMap = new Map<string, MemberUsageData>();
    let currentPage = 1;
    let hasMorePages = true;
    
    // First, gather all CHECKOUT events to calculate usage time
    while (hasMorePages) {
      const logsResponse = await this.getBillingLogs({
        dateStart: startDate.toISOString().split('T')[0],
        dateEnd: endDate.toISOString().split('T')[0],
        event: 'CHECKOUT',
        page: currentPage
      });
      
      if (!logsResponse || !logsResponse.log_list || logsResponse.log_list.length === 0) {
        hasMorePages = false;
        continue;
      }
      
      // Process each log entry
      for (const log of logsResponse.log_list) {
        const memberAccount = log.log_member_account;
        if (!memberAccount) continue;
        
        // Parse the time used
        const usedSeconds = this.parseTimeToSeconds(log.log_used_secs);
        
        // Skip if no time was used
        if (usedSeconds <= 0) continue;
        
        // Initialize member data if not exists
        if (!memberUsageMap.has(memberAccount)) {
          memberUsageMap.set(memberAccount, {
            memberAccount,
            totalSeconds: 0,
            sessionCount: 0,
            lastActive: null,
            totalTopups: 0
          });
        }
        
        // Update member stats
        const memberData = memberUsageMap.get(memberAccount);
        memberData.totalSeconds += usedSeconds;
        memberData.sessionCount += 1;
        
        // Update last active date if more recent
        const logDate = new Date(log.log_date_local);
        if (!memberData.lastActive || logDate > memberData.lastActive) {
          memberData.lastActive = logDate;
        }
      }
      
      // Check if there are more pages
      const paging = logsResponse.paging_info;
      if (paging && parseInt(paging.page) < paging.pages) {
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }
    
    // Now fetch TOPUP events to add topup amounts
    hasMorePages = true;
    currentPage = 1;
    
    while (hasMorePages) {
      const logsResponse = await this.getBillingLogs({
        dateStart: startDate.toISOString().split('T')[0],
        dateEnd: endDate.toISOString().split('T')[0],
        event: 'TOPUP',
        page: currentPage
      });
      
      if (!logsResponse || !logsResponse.log_list || logsResponse.log_list.length === 0) {
        hasMorePages = false;
        continue;
      }
      
      // Process each topup
      for (const log of logsResponse.log_list) {
        const memberAccount = log.log_member_account;
        if (!memberAccount) continue;
        
        // Calculate total topup (cash + card)
        const cashAmount = parseFloat(log.log_money) || 0;
        const cardAmount = parseFloat(log.log_card) || 0;
        const topupAmount = cashAmount + cardAmount;
        
        // Skip if no amount was topped up
        if (topupAmount <= 0) continue;
        
        // Initialize member data if not exists (they might have topped up but not played)
        if (!memberUsageMap.has(memberAccount)) {
          memberUsageMap.set(memberAccount, {
            memberAccount,
            totalSeconds: 0,
            sessionCount: 0,
            lastActive: new Date(log.log_date_local),
            totalTopups: 0
          });
        }
        
        // Update topup amount
        const memberData = memberUsageMap.get(memberAccount);
        memberData.totalTopups += topupAmount;
      }
      
      // Check if there are more pages
      const paging = logsResponse.paging_info;
      if (paging && parseInt(paging.page) < paging.pages) {
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }
    
    // Convert to array and calculate derived values
    const rankings = Array.from(memberUsageMap.values())
      .map(data => ({
        memberAccount: data.memberAccount,
        totalHours: Math.round((data.totalSeconds / 3600) * 10) / 10, // Round to 1 decimal
        sessionCount: data.sessionCount,
        avgSessionHours: data.sessionCount > 0 ? 
          Math.round((data.totalSeconds / data.sessionCount / 3600) * 10) / 10 : 0,
        totalTopups: data.totalTopups,
        lastActive: data.lastActive ? data.lastActive.toISOString() : null
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
    
    return rankings;
  }
  
  // Helper to parse HH:MM:SS format to seconds
  private parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    
    // Try to parse as HH:MM:SS format
    const match = timeStr.match(/(\d+):(\d+):(\d+)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseInt(match[3], 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    // If it's just a number, assume it's seconds
    const seconds = parseFloat(timeStr);
    if (!isNaN(seconds)) {
      return seconds;
    }
    
    return 0;
  }
  
  // Helper for date range calculation
  private getDateRangeForTimeframe(timeframe: 'day' | 'week' | 'month' | 'all'): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
        // Go back 1 year as a reasonable "all time" period
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    return { startDate, endDate };
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
                        map(response => {
                            this.logger.debug('Raw iCafeCloud response:', JSON.stringify(response.data, null, 2));
                            return response.data?.data;
                        }),
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
    // In icafeService.ts
    async getPcsWithUserInfo(): Promise<any[]> {
        try {
            // Get basic PC list
            const baseUrl = `${this.baseUrl}/${this.cafeId}/pcs`;
            const requestConfig = this.getRequestConfig();

            const response = await firstValueFrom(
                this.httpService.get(baseUrl, requestConfig).pipe(
                    map(response => response.data?.data || [])
                )
            );

            // Process each PC
            const pcsWithDetails = await Promise.all(
                response.map(async (pc: any) => {
                    // Transform basic PC data
                    interface TransformedPc {
                        pc_id: string;
                        pc_name: string;
                        status: string;
                        pc_area_name: string;
                        pc_enabled: boolean;
                        current_member_id?: number;
                        current_member_account?: string;
                        time_left?: string;
                        has_active_tab?: boolean;
                    }

                    const transformedPc: TransformedPc = {
                        pc_id: pc.pc_icafe_id || pc.id,
                        pc_name: pc.pc_name || pc.name,
                        status: pc.pc_in_using === 1 ? 'in_use' : 'available',
                        pc_area_name: pc.pc_area_name,
                        pc_enabled: pc.pc_enabled,
                        current_member_id: undefined,
                        current_member_account: undefined,
                        time_left: undefined,
                        has_active_tab: false
                    };

                    // If PC is in use, get member details
                    if (pc.pc_in_using === 1) {
                        try {
                            // Get console details for this PC
                            const consoleDetail = await this.getConsoleDetail(pc.pc_name);
                            const parsedData = await this.getProducts();
                            const productNames = parsedData.map(item => item.product_name);
                            // console.log(`Product List: ${JSON.stringify(productNames)}`);

                            if (consoleDetail) {
                                // Add member info to the PC object
                                transformedPc.current_member_id = consoleDetail.member_id;
                                transformedPc.current_member_account = consoleDetail.member_account;
                                transformedPc.time_left = consoleDetail.left_time;

                                // Check for active tab
                                const hasActiveTab = await this.tabsService.hasActiveTab(consoleDetail.member_id);
                                transformedPc.has_active_tab = hasActiveTab;
                            }
                        } catch (error) {
                            this.logger.warn(`Could not get console details for ${pc.pc_name}: ${error.message}`);
                        }
                    }

                    return transformedPc;
                })
            );

            // Get all PC names
            const pcNames = pcsWithDetails.map(pc => pc.pc_name);

            try {
                // Query notes directly in this service instead of using a separate service
                const activeNotes = await this.noteModel.find({
                    pcName: { $in: pcNames },
                    isActive: true
                }).exec();

                // Create a map of PC names to boolean (has active notes)
                const notesMap: Record<string, boolean> = {};
                pcNames.forEach(pcName => {
                    notesMap[pcName] = activeNotes.some(note => note.pcName === pcName);
                });

                // Add notes info to each PC
                return pcsWithDetails.map(pc => ({
                    ...pc,
                    has_notes: !!notesMap[pc.pc_name]
                }));
            } catch (error) {
                this.logger.error(`Failed to add notes info to PCs: ${error.message}`);
                return pcsWithDetails; // Return PCs without notes info
            }
        } catch (error) {
            this.logger.error(`Failed to get PCs with user info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetches all members from iCafeCloud.
     * @returns Promise<any[]> Array of all members from iCafeCloud.
     * @throws HttpException on API error.
     */
    async getAllMembers(): Promise<any[]> {
        const url = `${this.baseUrl}/${this.cafeId}/members`;
        let currentPage = 1;
        let allMembers: any[] = [];
        let hasMoreResults = true;

        // First request to get total pages info
        const requestConfig = {
            ...this.getRequestConfig(),
            params: {
                sort: 'asc',
                sort_name: 'member_account',
                page: currentPage,
                guest: 0
            }
        };

        try {
            // Get first page and pagination info
            const firstPageResponse = await firstValueFrom(
                this.httpService.get(url, requestConfig).pipe(
                    map(response => response.data)
                )
            );

            if (!firstPageResponse?.data?.members) {
                return [];
            }

            // Add first page results
            allMembers = [...firstPageResponse.data.members];

            // Extract pagination info
            const totalPages = firstPageResponse.data.paging_info?.pages || 1;
            this.logger.log(`Total pages: ${totalPages}, fetched page 1 with ${allMembers.length} members`);

            // If more than one page, fetch remaining pages in parallel
            if (totalPages > 1) {
                const remainingPageRequests = [];

                // Create requests for all remaining pages
                for (let page = 2; page <= totalPages; page++) {
                    const pageConfig = {
                        ...this.getRequestConfig(),
                        params: {
                            sort: 'asc',
                            sort_name: 'member_account',
                            page: page,
                            guest: 0
                        }
                    };

                    remainingPageRequests.push(
                        firstValueFrom(
                            this.httpService.get(url, pageConfig).pipe(
                                map(response => {
                                    const members = response.data?.data?.members || [];
                                    this.logger.log(`Fetched page ${page} with ${members.length} members`);
                                    return members;
                                })
                            )
                        )
                    );
                }

                // Execute all remaining page requests in parallel
                const remainingPagesResults = await Promise.all(remainingPageRequests);

                // Combine all results
                for (const pageMembers of remainingPagesResults) {
                    allMembers = [...allMembers, ...pageMembers];
                }
            }

            this.logger.log(`Successfully fetched ${allMembers.length} total members`);
            return allMembers;
        } catch (error) {
            this.logger.error(`Failed to fetch all members: ${error.message}`, error.stack);
            throw error;
        }
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

    // Add to IcafeService
    async getProducts(query?: string): Promise<any[]> {
        const url = `${this.baseUrl}/${this.cafeId}/products`;
        const requestConfig = {
            ...this.getRequestConfig(),
            params: {
                search_text: query || '',
                sort_name: 'product_name',
                sort: 'asc'
            }
        };

        return firstValueFrom(
            this.httpService.get(url, requestConfig).pipe(
                map(response => {
                    if (response.data?.data?.items) {
                        return response.data.data.items;
                    }
                    return [];
                }),
                catchError(error => {
                    this.logger.error(`Error fetching products: ${error.message}`, error.stack);
                    throw new HttpException(
                        'Failed to fetch products from iCafeCloud',
                        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
                    );
                })
            )
        );
    }
}
