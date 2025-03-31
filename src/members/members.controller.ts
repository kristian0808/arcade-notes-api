import { Controller, Get, Param, Query, NotFoundException, InternalServerErrorException, ParseIntPipe, Logger, BadRequestException } from '@nestjs/common';
import { IcafeService } from '../icafe/icafe.service';
import { MemberResponseDto } from '../notes/dto/icafeMember.dto';

@Controller('api/members')
export class MembersController {
    private readonly logger = new Logger(MembersController.name);
    constructor(private readonly icafeService: IcafeService) {}

    @Get('search')
    async searchMembers(@Query('query') accountName: string): Promise<MemberResponseDto[]> {
        this.logger.log(`Received request for GET /api/members/search?query=${accountName}`);
        if (!accountName?.trim()) {
            this.logger.log('Empty search query received, returning empty array.');
            return [];
        }
        try {
            const member = await this.icafeService.getMemberByAccount(accountName);
            return [member];
        } catch (error) {
            if (error instanceof NotFoundException) {
                this.logger.warn(`Member search for "${accountName}" returned no results (404).`);
                return [];
            }
            this.logger.error(`Failed to search members for query "${accountName}": ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to search members');
        }
    }

    @Get(':memberId')
    async getMemberById(@Param('memberId', ParseIntPipe) memberId: number): Promise<MemberResponseDto> {
        this.logger.log(`Received request for GET /api/members/${memberId}`);
        try {
            const member = await this.icafeService.getMemberById(memberId);
            return member;
        } catch (error) {
            this.logger.error(`Failed to get member by ID ${memberId}: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException(`Failed to retrieve member with ID ${memberId}`);
        }
    }

    @Get()
    async getAllMembers(): Promise<MemberResponseDto[]> {
        this.logger.log('Fetching all members');
        try {
            const members = await this.icafeService.getAllMembers();
            // this.logger.log('Members to return to frontend:', JSON.stringify(members, null, 2));
            return members;
        } catch (error) {
            this.logger.error(`Failed to fetch all members: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch all members');
        }
    }
}
