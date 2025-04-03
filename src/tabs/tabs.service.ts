import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tab, TabDocument, TabItem } from 'src/notes/schemas/tab.schema';
import { CreateTabDto } from './dto/create-tab.dto';
import { TabResponseDto } from './dto/tab-response.dto';
import { AddTabItemDto } from './dto/add-tab-item.dto';
import { UpdateTabItemQuantityDto } from './dto/update-tab-item-quantity.dto';

@Injectable()
export class TabsService {
    private readonly logger = new Logger(TabsService.name);

    constructor(
        @InjectModel(Tab.name) private tabModel: Model<TabDocument>,
    ) {}

    /**
     * Create a new tab for a member
     */
    async createTab(createTabDto: CreateTabDto): Promise<TabResponseDto> {
        this.logger.log(`Creating new tab for member ID: ${createTabDto.memberId}`);
        
        // Check if member already has an active tab
        const existingTab = await this.tabModel.findOne({
            memberId: createTabDto.memberId,
            status: 'active'
        }).exec();
        
        if (existingTab) {
            this.logger.warn(`Member ID ${createTabDto.memberId} already has an active tab.`);
            return this.mapToTabResponse(existingTab);
        }
        
        // Create a new tab
        const newTab = new this.tabModel({
            memberId: createTabDto.memberId,
            memberAccount: createTabDto.memberAccount,
            pcName: createTabDto.pcName,
            status: 'active',
            items: [],
            totalAmount: 0
        });
        
        const savedTab = await newTab.save();
        this.logger.log(`Tab created with ID: ${savedTab._id}`);
        
        return this.mapToTabResponse(savedTab);
    }
    
     /**
     * Get an active tab for a specific member
     */
     async getActiveTabForMember(memberId: number): Promise<TabResponseDto | null> {
        this.logger.log(`Fetching active tab for member ID: ${memberId}`);
        
        const tab = await this.tabModel.findOne({
            memberId: memberId,
            status: 'active'
        }).exec();
        
        if (!tab) {
            this.logger.log(`No active tab found for member ID: ${memberId}`);
            return null;
        }
        
        return this.mapToTabResponse(tab);
    }

     /**
     * Get a specific tab by ID
     */
     async getTabById(tabId: string): Promise<TabResponseDto> {
        this.logger.log(`Fetching tab with ID: ${tabId}`);
        
        const tab = await this.tabModel.findById(tabId).exec();
        
        if (!tab) {
            this.logger.warn(`Tab not found with ID: ${tabId}`);
            throw new NotFoundException(`Tab with ID ${tabId} not found`);
        }
        
        return this.mapToTabResponse(tab);
    }

    /**
     * Add an item to an existing tab
     */
    async addItemToTab(tabId: string, addItemDto: AddTabItemDto): Promise<TabItem> {
        this.logger.log(`Adding item to tab ID: ${tabId}`);
        
        // Find the tab
        const tab = await this.tabModel.findById(tabId).exec();
        
        if (!tab) {
            this.logger.warn(`Tab not found with ID: ${tabId}`);
            throw new NotFoundException(`Tab with ID ${tabId} not found`);
        }
        
        if (tab.status !== 'active') {
            this.logger.warn(`Cannot add item to closed tab with ID: ${tabId}`);
            throw new BadRequestException(`Cannot add items to a closed tab`);
        }
        
        // Calculate item total price
        const totalPrice = addItemDto.price * addItemDto.quantity;
        
        // Create new item
        const newItem: TabItem = {
            productId: addItemDto.productId,
            productName: addItemDto.productName,
            price: addItemDto.price,
            quantity: addItemDto.quantity,
            totalPrice: totalPrice,
            addedAt: new Date()
        };
        
        // Add to items array
        tab.items.push(newItem);
        
        // Update total amount
        tab.totalAmount += totalPrice;
        
        // Save the tab
        await tab.save();
        
        this.logger.log(`Item added to tab ID: ${tabId}, new total: ${tab.totalAmount}`);
        
        return newItem;
    }

    async updateTabItemQuantity(
        tabId: string, 
        itemIndex: number, 
        updateDto: UpdateTabItemQuantityDto
    ): Promise<TabResponseDto> {
        this.logger.log(`Updating item quantity in tab ID: ${tabId}, item index: ${itemIndex}`);
        
        // Find the tab
        const tab = await this.tabModel.findById(tabId).exec();
        
        if (!tab) {
            this.logger.warn(`Tab not found with ID: ${tabId}`);
            throw new NotFoundException(`Tab with ID ${tabId} not found`);
        }
        
        if (tab.status !== 'active') {
            this.logger.warn(`Cannot update item in closed tab with ID: ${tabId}`);
            throw new BadRequestException(`Cannot update items in a closed tab`);
        }
        
        // Validate item index
        if (itemIndex < 0 || itemIndex >= tab.items.length) {
            throw new NotFoundException(`Item at index ${itemIndex} not found in tab`);
        }
        
        const item = tab.items[itemIndex];
        const oldQuantity = item.quantity;
        const oldTotalPrice = item.totalPrice;
        
        // Update quantity and total price
        item.quantity = updateDto.quantity;
        item.totalPrice = item.price * updateDto.quantity;
        
        // Update tab total
        tab.totalAmount = tab.totalAmount - oldTotalPrice + item.totalPrice;
        
        // Save the tab
        await tab.save();
        
        this.logger.log(`Item quantity updated in tab ID: ${tabId}, new total: ${tab.totalAmount}`);
        
        return this.mapToTabResponse(tab);
    }

     /**
     * Remove an item from a tab
     */
     async removeTabItem(tabId: string, itemIndex: number): Promise<TabResponseDto> {
        this.logger.log(`Removing item from tab ID: ${tabId}, item index: ${itemIndex}`);
        
        // Find the tab
        const tab = await this.tabModel.findById(tabId).exec();
        
        if (!tab) {
            this.logger.warn(`Tab not found with ID: ${tabId}`);
            throw new NotFoundException(`Tab with ID ${tabId} not found`);
        }
        
        if (tab.status !== 'active') {
            this.logger.warn(`Cannot remove item from closed tab with ID: ${tabId}`);
            throw new BadRequestException(`Cannot remove items from a closed tab`);
        }
        
        // Validate item index
        if (itemIndex < 0 || itemIndex >= tab.items.length) {
            throw new NotFoundException(`Item at index ${itemIndex} not found in tab`);
        }
        
        // Get item to be removed for total adjustment
        const removedItem = tab.items[itemIndex];
        
        // Remove the item
        tab.items.splice(itemIndex, 1);
        
        // Update total amount
        tab.totalAmount -= removedItem.totalPrice;
        
        // Save the tab
        await tab.save();
        
        this.logger.log(`Item removed from tab ID: ${tabId}, new total: ${tab.totalAmount}`);
        
        return this.mapToTabResponse(tab);
    }

    /**
     * Close a tab (mark as paid)
     */
    async closeTab(tabId: string): Promise<TabResponseDto> {
        this.logger.log(`Closing tab with ID: ${tabId}`);
        
        // Find the tab
        const tab = await this.tabModel.findById(tabId).exec();
        
        if (!tab) {
            this.logger.warn(`Tab not found with ID: ${tabId}`);
            throw new NotFoundException(`Tab with ID ${tabId} not found`);
        }
        
        if (tab.status !== 'active') {
            this.logger.warn(`Tab is already closed: ${tabId}`);
            throw new BadRequestException(`Tab is already closed`);
        }
        
        // Update tab status and closed time
        tab.status = 'closed';
        tab.closedAt = new Date();
        
        // Save the tab
        await tab.save();
        
        this.logger.log(`Tab closed successfully: ${tabId}, final amount: ${tab.totalAmount}`);
        
        return this.mapToTabResponse(tab);
    }

    /**
     * Get all tabs (with optional filters)
     */
    async getTabs(status?: string, memberId?: number): Promise<TabResponseDto[]> {
        this.logger.log(`Fetching tabs with filters - status: ${status}, memberId: ${memberId}`);
        
        // Build query
        const query: any = {};
        
        if (status) {
            query.status = status;
        }
        
        if (memberId) {
            query.memberId = memberId;
        }
        
        // Execute query
        const tabs = await this.tabModel.find(query)
            .sort({ createdAt: -1 })
            .exec();
        
        this.logger.log(`Found ${tabs.length} tabs`);
        
        return tabs.map(tab => this.mapToTabResponse(tab));
    }

     /**
     * Helper method to convert TabDocument to TabResponseDto
     */
     private mapToTabResponse(tab: TabDocument): TabResponseDto {
        return {
            id: tab._id.toString(),
            memberId: tab.memberId,
            memberAccount: tab.memberAccount,
            pcName: tab.pcName,
            status: tab.status,
            items: tab.items,
            totalAmount: tab.totalAmount,
            createdAt: tab.createdAt,
            updatedAt: tab.updatedAt,
            closedAt: tab.closedAt
        };
    }
}
