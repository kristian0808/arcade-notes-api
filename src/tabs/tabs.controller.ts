// src/tabs/tabs.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Logger,
    HttpCode,
    HttpStatus,
    NotFoundException,
    BadRequestException,
    ParseIntPipe
} from '@nestjs/common';
import { TabsService } from './tabs.service';
import { CreateTabDto } from './dto/create-tab.dto';
import { AddTabItemDto } from './dto/add-tab-item.dto';
import { UpdateTabItemQuantityDto } from './dto/update-tab-item-quantity.dto';
import { TabResponseDto } from './dto/tab-response.dto';
import { TabItem } from 'src/notes/schemas/tab.schema';

@Controller('tabs') // Removed 'api/' prefix
export class TabsController {
    private readonly logger = new Logger(TabsController.name);

    constructor(private readonly tabsService: TabsService) {}

    @Post()
    async createTab(@Body() createTabDto: CreateTabDto): Promise<TabResponseDto> {
        this.logger.log(`Creating new tab for member ID: ${createTabDto.memberId}`);
        return this.tabsService.createTab(createTabDto);
    }

    @Get('member/:memberId/active')
    async getActiveTabForMember(
        @Param('memberId', ParseIntPipe) memberId: number
    ): Promise<TabResponseDto | { active: false }> {
        this.logger.log(`Getting active tab for member ID: ${memberId}`);

        const tab = await this.tabsService.getActiveTabForMember(memberId);

        if (!tab) {
            return { active: false };
        }

        return tab;
    }

    @Get(':id')
    async getTabById(@Param('id') id: string): Promise<TabResponseDto> {
        this.logger.log(`Getting tab with ID: ${id}`);
        return this.tabsService.getTabById(id);
    }

    @Post(':id/items')
    async addItemToTab(
        @Param('id') id: string,
        @Body() addItemDto: AddTabItemDto
    ): Promise<TabItem> {
        this.logger.log(`Adding item to tab ID: ${id}`);
        return this.tabsService.addItemToTab(id, addItemDto);
    }

    @Put(':id/items/:itemIndex')
    async updateTabItemQuantity(
        @Param('id') id: string,
        @Param('itemIndex', ParseIntPipe) itemIndex: number,
        @Body() updateDto: UpdateTabItemQuantityDto
    ): Promise<TabResponseDto> {
        this.logger.log(`Updating item quantity in tab ID: ${id}, item index: ${itemIndex}`);
        return this.tabsService.updateTabItemQuantity(id, itemIndex, updateDto);
    }

    @Delete(':id/items/:itemIndex')
    async removeTabItem(
        @Param('id') id: string,
        @Param('itemIndex', ParseIntPipe) itemIndex: number
    ): Promise<TabResponseDto> {
        this.logger.log(`Removing item from tab ID: ${id}, item index: ${itemIndex}`);
        return this.tabsService.removeTabItem(id, itemIndex);
    }

    @Post(':id/close')
    @HttpCode(HttpStatus.OK)
    async closeTab(@Param('id') id: string): Promise<TabResponseDto> {
        this.logger.log(`Closing tab with ID: ${id}`);
        return this.tabsService.closeTab(id);
    }

    @Get()
    async getTabs(
        @Query('status') status?: string,
        @Query('memberId', new ParseIntPipe({ optional: true })) memberId?: number
    ): Promise<TabResponseDto[]> {
        this.logger.log(`Getting tabs with filters - status: ${status}, memberId: ${memberId}`);
        return this.tabsService.getTabs(status, memberId);
    }
}