import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tab, TabDocument, TabItem } from 'src/notes/schemas/tab.schema';
import { CreateTabDto } from './dto/create-tab.dto';
import { TabResponseDto } from './dto/tab-response.dto';
import { AddTabItemDto } from './dto/add-tab-item.dto';
import { UpdateTabItemQuantityDto } from './dto/update-tab-item-quantity.dto';
import { ProcessPaymentDto, PaymentMethod } from './dto/process-payment.dto';
import { PaymentResponseDto, PaymentStatus } from './dto/payment-response.dto';
import { IcafeService } from '../icafe/icafe.service';

@Injectable()
export class TabsService {
  private readonly logger = new Logger(TabsService.name);

  constructor(
    @InjectModel(Tab.name) private tabModel: Model<TabDocument>,
    @Inject(forwardRef(() => 'DashboardGateway'))
    private dashboardGateway: any,
    @Inject(forwardRef(() => IcafeService))
    private icafeService: IcafeService,
  ) {}

  /**
   * Create a new tab for a member
   */
  async createTab(createTabDto: CreateTabDto): Promise<TabResponseDto> {
    this.logger.log(`Creating new tab for member ID: ${createTabDto.memberId}`);

    // Check if member already has an active tab
    const existingTab = await this.tabModel
      .findOne({
        memberId: createTabDto.memberId,
        status: 'active',
      })
      .exec();

    if (existingTab) {
      this.logger.warn(
        `Member ID ${createTabDto.memberId} already has an active tab.`,
      );
      return this.mapToTabResponse(existingTab);
    }

    // Create a new tab
    const newTab = new this.tabModel({
      memberId: createTabDto.memberId,
      memberAccount: createTabDto.memberAccount,
      pcName: createTabDto.pcName,
      status: 'active',
      items: [],
      totalAmount: 0,
    });

    const savedTab = await newTab.save();
    this.logger.log(`Tab created with ID: ${savedTab._id}`);

    // Broadcast active tabs update via WebSocket
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast active tabs update after tab creation', error);
    }

    return this.mapToTabResponse(savedTab);
  }

  /**
   * Get an active tab for a specific member
   */
  async getActiveTabForMember(
    memberId: number,
  ): Promise<TabResponseDto | null> {
    this.logger.log(`Fetching active tab for member ID: ${memberId}`);

    const tab = await this.tabModel
      .findOne({
        memberId: memberId,
        status: 'active',
      })
      .exec();

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
  async addItemToTab(
    tabId: string,
    addItemDto: AddTabItemDto,
  ): Promise<TabItem> {
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
      addedAt: new Date(),
    };

    // Add to items array
    tab.items.push(newItem);

    // Update total amount
    tab.totalAmount += totalPrice;

    // Save the tab
    await tab.save();

    this.logger.log(
      `Item added to tab ID: ${tabId}, new total: ${tab.totalAmount}`,
    );

    // Broadcast active tabs update via WebSocket
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast active tabs update after item addition', error);
    }

    return newItem;
  }

  async updateTabItemQuantity(
    tabId: string,
    itemIndex: number,
    updateDto: UpdateTabItemQuantityDto,
  ): Promise<TabResponseDto> {
    this.logger.log(
      `Updating item quantity in tab ID: ${tabId}, item index: ${itemIndex}`,
    );

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
      throw new NotFoundException(
        `Item at index ${itemIndex} not found in tab`,
      );
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

    this.logger.log(
      `Item quantity updated in tab ID: ${tabId}, new total: ${tab.totalAmount}`,
    );

    // Broadcast active tabs update via WebSocket
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast active tabs update after quantity update', error);
    }

    return this.mapToTabResponse(tab);
  }

  /**
   * Remove an item from a tab
   */
  async removeTabItem(
    tabId: string,
    itemIndex: number,
  ): Promise<TabResponseDto> {
    this.logger.log(
      `Removing item from tab ID: ${tabId}, item index: ${itemIndex}`,
    );

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
      throw new NotFoundException(
        `Item at index ${itemIndex} not found in tab`,
      );
    }

    // Get item to be removed for total adjustment
    const removedItem = tab.items[itemIndex];

    // Remove the item
    tab.items.splice(itemIndex, 1);

    // Update total amount
    tab.totalAmount -= removedItem.totalPrice;

    // Save the tab
    await tab.save();

    this.logger.log(
      `Item removed from tab ID: ${tabId}, new total: ${tab.totalAmount}`,
    );

    // Broadcast active tabs update via WebSocket
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast active tabs update after item removal', error);
    }

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

    this.logger.log(
      `Tab closed successfully: ${tabId}, final amount: ${tab.totalAmount}`,
    );

    // Broadcast active tabs update via WebSocket
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast active tabs update after tab closure', error);
    }

    return this.mapToTabResponse(tab);
  }

  /**
   * Get all tabs (with optional filters)
   */
  async getTabs(status?: string, memberId?: number): Promise<TabResponseDto[]> {
    this.logger.log(
      `Fetching tabs with filters - status: ${status}, memberId: ${memberId}`,
    );

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (memberId) {
      query.memberId = memberId;
    }

    // Execute query
    const tabs = await this.tabModel.find(query).sort({ createdAt: -1 }).exec();

    this.logger.log(`Found ${tabs.length} tabs`);

    return tabs.map((tab) => this.mapToTabResponse(tab));
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
      paymentStatus: tab.paymentStatus,
      paymentMethod: tab.paymentMethod,
      icafeOrders: tab.icafeOrders || [],
      failedItems: tab.failedItems || [],
      items: tab.items,
      totalAmount: tab.totalAmount,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
      closedAt: tab.closedAt,
      paidAt: tab.paidAt,
    };
  }

  /**
   * Get members with active tabs including tab summary information
   */
  async getActiveMembersWithTabs() {
    this.logger.log('Fetching members with active tabs');

    const activeTabs = await this.tabModel
      .find({ status: 'active' })
      .sort({ createdAt: -1 })
      .exec();

    return activeTabs.map(tab => ({
      memberId: tab.memberId,
      memberAccount: tab.memberAccount,
      pcName: tab.pcName,
      totalAmount: tab.totalAmount,
      itemCount: tab.items.length,
      createdAt: tab.createdAt,
      tabId: tab._id.toString(),
    }));
  }

  /**
   * Check if a member has an active tab
   */
  async hasActiveTab(memberId: number): Promise<boolean> {
    this.logger.log(`Checking for active tab for member ID: ${memberId}`);

    const activeTab = await this.tabModel
      .findOne({
        memberId: memberId,
        status: 'active',
      })
      .exec();

    return !!activeTab;
  }

  // Payment System Methods

  /**
   * Test mode validation constants
   */
  private readonly TEST_MEMBER_ID = 312076765360;
  private readonly TEST_PRODUCT_NAMES = ['TEST-DRINK-PRODUCT'];

  /**
   * Validate payment request for test mode safety
   */
  private async validatePaymentRequest(tab: TabDocument, paymentMethod: PaymentMethod): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Test mode validation
    if (!isProduction) {
      if (tab.memberId !== this.TEST_MEMBER_ID) {
        throw new BadRequestException(
          `Development mode: Only test member ${this.TEST_MEMBER_ID} allowed for payment processing`
        );
      }
      
      // Validate all items are test products
      for (const item of tab.items) {
        if (!this.TEST_PRODUCT_NAMES.includes(item.productName)) {
          throw new BadRequestException(
            `Development mode: Only test products allowed. Found: ${item.productName}`
          );
        }
      }
    }

    // General validations
    if (tab.status !== 'active') {
      throw new BadRequestException('Cannot process payment for non-active tab');
    }

    if (tab.paymentStatus === 'paid') {
      throw new BadRequestException('Tab is already paid');
    }

    if (tab.items.length === 0) {
      throw new BadRequestException('Cannot process payment for empty tab');
    }

    // Validate total amount
    if (tab.totalAmount <= 0) {
      throw new BadRequestException('Tab total amount must be greater than 0');
    }
  }

  /**
   * Validate member has sufficient balance for balance payments
   */
  private async validateMemberBalance(memberId: number, totalAmount: number, paymentMethod: PaymentMethod): Promise<void> {
    if (paymentMethod !== PaymentMethod.BALANCE) {
      return; // Only validate balance for balance payments
    }

    try {
      const member = await this.icafeService.getMemberById(memberId);
      
      if (!member) {
        throw new NotFoundException(`Member with ID ${memberId} not found`);
      }

      const memberBalance = parseFloat(member.member_balance || '0');
      
      if (memberBalance < totalAmount) {
        throw new BadRequestException(
          `Insufficient balance. Required: $${totalAmount.toFixed(2)}, Available: $${memberBalance.toFixed(2)}`
        );
      }
      
      this.logger.log(`Member ${memberId} balance validation passed: $${memberBalance.toFixed(2)} >= $${totalAmount.toFixed(2)}`);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to validate member balance: ${error.message}`);
      throw new BadRequestException('Failed to validate member balance');
    }
  }

  /**
   * Validate all tab items exist in ICafe system
   */
  private async validateTabItems(tabItems: TabItem[]): Promise<{ productId: string; quantity: number; item: TabItem }[]> {
    const validatedItems: { productId: string; quantity: number; item: TabItem }[] = [];
    
    for (const item of tabItems) {
      try {
        const icafeProductId = await this.icafeService.getProductIdByName(item.productName);
        
        if (!icafeProductId) {
          throw new BadRequestException(`Product "${item.productName}" not found in ICafe system`);
        }
        
        // Validate stock if needed (ICafe will handle this during order creation)
        validatedItems.push({
          productId: icafeProductId,
          quantity: item.quantity,
          item: item,
        });
        
      } catch (error) {
        this.logger.error(`Failed to validate item "${item.productName}": ${error.message}`);
        throw new BadRequestException(`Failed to validate product: ${item.productName}`);
      }
    }
    
    return validatedItems;
  }

  /**
   * Map payment method to ICafe payment method code
   */
  private mapPaymentMethodToIcafe(paymentMethod: PaymentMethod): number {
    switch (paymentMethod) {
      case PaymentMethod.CASH:
        return 0;
      case PaymentMethod.BALANCE:
        return 1;
      case PaymentMethod.CARD:
        return 2;
      default:
        throw new BadRequestException(`Unsupported payment method: ${paymentMethod}`);
    }
  }

  /**
   * Log payment attempt for debugging
   */
  private logPaymentAttempt(tab: TabDocument, paymentMethod: PaymentMethod): void {
    this.logger.log(`Payment attempt started:
      Tab ID: ${tab._id}
      Member: ${tab.memberAccount} (${tab.memberId})
      Items: ${tab.items.length}
      Total: $${tab.totalAmount.toFixed(2)}
      Payment Method: ${paymentMethod}
      Test Mode: ${process.env.NODE_ENV !== 'production'}
    `);
  }

  /**
   * Process payment for a tab - Main payment processing method
   */
  async processTabPayment(tabId: string, processPaymentDto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Processing payment for tab ${tabId} with method ${processPaymentDto.paymentMethod}`);

    // Get the tab
    const tab = await this.tabModel.findById(tabId).exec();
    if (!tab) {
      throw new NotFoundException(`Tab with ID ${tabId} not found`);
    }

    // Log payment attempt
    this.logPaymentAttempt(tab, processPaymentDto.paymentMethod);

    try {
      // Phase 1: Validation
      await this.validatePaymentRequest(tab, processPaymentDto.paymentMethod);
      await this.validateMemberBalance(tab.memberId, tab.totalAmount, processPaymentDto.paymentMethod);
      
      // Phase 2: Validate and prepare items
      const validatedItems = await this.validateTabItems(tab.items);
      
      // Phase 3: Create ICafe order
      const orderResult = await this.createIcafeOrder(tab, validatedItems, processPaymentDto.paymentMethod);
      
      // Phase 4: Update tab with payment results
      const updatedTab = await this.updateTabWithPaymentResults(tab, orderResult, processPaymentDto.paymentMethod);
      
      // Phase 5: Broadcast updates
      await this.broadcastTabUpdates();
      
      // Build response
      const response: PaymentResponseDto = {
        success: true,
        paymentStatus: updatedTab.paymentStatus as PaymentStatus,
        message: 'Payment processed successfully',
        icafeOrders: updatedTab.icafeOrders || [],
        failedItems: updatedTab.failedItems || [],
        totalProcessed: validatedItems.length,
        totalFailed: 0,
        tab: {
          id: updatedTab._id.toString(),
          status: updatedTab.status,
          paymentStatus: updatedTab.paymentStatus,
          paymentMethod: updatedTab.paymentMethod,
          totalAmount: updatedTab.totalAmount,
          paidAt: updatedTab.paidAt,
          closedAt: updatedTab.closedAt,
        },
      };

      this.logger.log(`Payment processed successfully for tab ${tabId}`);
      return response;

    } catch (error) {
      this.logger.error(`Payment processing failed for tab ${tabId}: ${error.message}`, error.stack);
      
      // Update tab with failed payment status
      await this.updateTabPaymentStatus(tab, PaymentStatus.FAILED);
      
      throw error;
    }
  }

  /**
   * Create ICafe order from validated tab items
   */
  private async createIcafeOrder(
    tab: TabDocument, 
    validatedItems: { productId: string; quantity: number; item: TabItem }[],
    paymentMethod: PaymentMethod
  ): Promise<any> {
    // Prepare ICafe order data
    const orderData = {
      product_id: validatedItems.map(item => item.productId),
      order_item_qty: validatedItems.map(item => item.quantity),
      order_payment_method: this.mapPaymentMethodToIcafe(paymentMethod),
      order_member_id: tab.memberId,
      order_member_account: tab.memberAccount,
      order_status: 2, // 2 = done/completed order
    };

    this.logger.log(`Creating ICafe order:`, JSON.stringify(orderData, null, 2));

    // Create order in ICafe
    const orderResponse = await this.icafeService.createOrder(orderData);
    
    if (orderResponse.code !== 200) {
      throw new BadRequestException(`ICafe order creation failed: ${orderResponse.message}`);
    }

    this.logger.log(`ICafe order created successfully: ${orderResponse.data.order_no}`);
    return orderResponse;
  }

  /**
   * Update tab with payment results
   */
  private async updateTabWithPaymentResults(
    tab: TabDocument,
    orderResponse: any,
    paymentMethod: PaymentMethod
  ): Promise<TabDocument> {
    const now = new Date();
    
    // Create ICafe order record
    const icafeOrder = {
      orderId: orderResponse.data.order_no.toString(),
      orderResponse: orderResponse,
      items: [...tab.items], // All items were processed successfully
      createdAt: now,
      amount: tab.totalAmount,
    };

    // Update tab
    tab.status = 'closed';
    tab.paymentStatus = PaymentStatus.PAID;
    tab.paymentMethod = paymentMethod;
    tab.icafeOrders = [icafeOrder];
    tab.failedItems = []; // No failed items in successful processing
    tab.paidAt = now;
    tab.closedAt = now;

    const updatedTab = await tab.save();
    this.logger.log(`Tab ${tab._id} updated with payment results`);
    
    return updatedTab;
  }

  /**
   * Update tab payment status only (for error cases)
   */
  private async updateTabPaymentStatus(tab: TabDocument, paymentStatus: PaymentStatus): Promise<void> {
    tab.paymentStatus = paymentStatus;
    await tab.save();
    this.logger.log(`Tab ${tab._id} payment status updated to ${paymentStatus}`);
  }

  /**
   * Broadcast tab updates via WebSocket
   */
  private async broadcastTabUpdates(): Promise<void> {
    try {
      await this.dashboardGateway?.broadcastActiveTabsUpdate();
    } catch (error) {
      this.logger.warn('Failed to broadcast tab updates after payment', error);
    }
  }

  // Error Recovery and Partial Payment Methods

  /**
   * Process payment with partial success handling (Option B approach)
   */
  async processTabPaymentWithRecovery(tabId: string, processPaymentDto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Processing payment with recovery for tab ${tabId}`);

    const tab = await this.tabModel.findById(tabId).exec();
    if (!tab) {
      throw new NotFoundException(`Tab with ID ${tabId} not found`);
    }

    this.logPaymentAttempt(tab, processPaymentDto.paymentMethod);

    try {
      // Phase 1: Basic validation
      await this.validatePaymentRequest(tab, processPaymentDto.paymentMethod);
      await this.validateMemberBalance(tab.memberId, tab.totalAmount, processPaymentDto.paymentMethod);
      
      // Phase 2: Validate items and attempt processing
      const itemsToProcess = tab.failedItems.length > 0 ? tab.failedItems : tab.items;
      const processingResult = await this.processItemsWithRecovery(tab, itemsToProcess, processPaymentDto.paymentMethod);
      
      // Phase 3: Update tab based on results
      const updatedTab = await this.updateTabWithPartialResults(tab, processingResult, processPaymentDto.paymentMethod);
      
      // Phase 4: Broadcast updates
      await this.broadcastTabUpdates();
      
      // Build response
      const response: PaymentResponseDto = {
        success: processingResult.successfulItems.length > 0,
        paymentStatus: this.determinePaymentStatus(processingResult, tab.items.length),
        message: this.buildPaymentMessage(processingResult),
        icafeOrders: updatedTab.icafeOrders || [],
        failedItems: updatedTab.failedItems || [],
        totalProcessed: processingResult.successfulItems.length,
        totalFailed: processingResult.failedItems.length,
        tab: {
          id: updatedTab._id.toString(),
          status: updatedTab.status,
          paymentStatus: updatedTab.paymentStatus,
          paymentMethod: updatedTab.paymentMethod,
          totalAmount: updatedTab.totalAmount,
          paidAt: updatedTab.paidAt,
          closedAt: updatedTab.closedAt,
        },
      };

      return response;

    } catch (error) {
      this.logger.error(`Payment processing with recovery failed: ${error.message}`, error.stack);
      await this.updateTabPaymentStatus(tab, PaymentStatus.FAILED);
      throw error;
    }
  }

  /**
   * Process items with individual error handling
   */
  private async processItemsWithRecovery(
    tab: TabDocument,
    itemsToProcess: TabItem[],
    paymentMethod: PaymentMethod
  ): Promise<{
    successfulItems: { item: TabItem; icafeOrder: any }[];
    failedItems: { item: TabItem; error: string }[];
  }> {
    const results = {
      successfulItems: [] as { item: TabItem; icafeOrder: any }[],
      failedItems: [] as { item: TabItem; error: string }[],
    };

    this.logger.log(`Processing ${itemsToProcess.length} items individually for recovery`);

    // Process each item individually to identify specific failures
    for (const item of itemsToProcess) {
      try {
        // Validate individual item
        const icafeProductId = await this.icafeService.getProductIdByName(item.productName);
        if (!icafeProductId) {
          results.failedItems.push({
            item,
            error: `Product "${item.productName}" not found in ICafe system`,
          });
          continue;
        }

        // Create individual order for this item
        const orderData = {
          product_id: [icafeProductId],
          order_item_qty: [item.quantity],
          order_payment_method: this.mapPaymentMethodToIcafe(paymentMethod),
          order_member_id: tab.memberId,
          order_member_account: tab.memberAccount,
          order_status: 2,
        };

        const orderResponse = await this.icafeService.createOrder(orderData);
        
        if (orderResponse.code === 200) {
          results.successfulItems.push({ item, icafeOrder: orderResponse });
          this.logger.log(`Successfully processed item: ${item.productName}`);
        } else {
          results.failedItems.push({
            item,
            error: `ICafe order failed: ${orderResponse.message}`,
          });
        }

      } catch (error) {
        const errorMessage = this.extractErrorMessage(error);
        results.failedItems.push({ item, error: errorMessage });
        this.logger.warn(`Failed to process item "${item.productName}": ${errorMessage}`);
      }
    }

    this.logger.log(`Processing complete: ${results.successfulItems.length} successful, ${results.failedItems.length} failed`);
    return results;
  }

  /**
   * Update tab with partial processing results
   */
  private async updateTabWithPartialResults(
    tab: TabDocument,
    processingResult: {
      successfulItems: { item: TabItem; icafeOrder: any }[];
      failedItems: { item: TabItem; error: string }[];
    },
    paymentMethod: PaymentMethod
  ): Promise<TabDocument> {
    const now = new Date();
    
    // Add successful orders to existing ICafe orders
    const newIcafeOrders = processingResult.successfulItems.map(result => ({
      orderId: result.icafeOrder.data.order_no.toString(),
      orderResponse: result.icafeOrder,
      items: [result.item],
      createdAt: now,
      amount: result.item.totalPrice,
    }));

    // Update ICafe orders array
    tab.icafeOrders = [...(tab.icafeOrders || []), ...newIcafeOrders];
    
    // Update failed items
    tab.failedItems = processingResult.failedItems.map(result => result.item);
    
    // Determine payment status and tab status
    const paymentStatus = this.determinePaymentStatus(processingResult, tab.items.length);
    tab.paymentStatus = paymentStatus;
    
    if (paymentStatus === PaymentStatus.PAID) {
      tab.status = 'closed';
      tab.paidAt = now;
      tab.closedAt = now;
    } else if (paymentStatus === PaymentStatus.PARTIAL) {
      // Keep tab active for retry of failed items
      tab.status = 'active';
    }

    if (!tab.paymentMethod) {
      tab.paymentMethod = paymentMethod;
    }

    const updatedTab = await tab.save();
    this.logger.log(`Tab ${tab._id} updated with partial results - Status: ${paymentStatus}`);
    
    return updatedTab;
  }

  /**
   * Determine payment status based on processing results
   */
  private determinePaymentStatus(
    processingResult: {
      successfulItems: { item: TabItem; icafeOrder: any }[];
      failedItems: { item: TabItem; error: string }[];
    },
    totalItems: number
  ): PaymentStatus {
    const successCount = processingResult.successfulItems.length;
    const failedCount = processingResult.failedItems.length;

    if (successCount === totalItems && failedCount === 0) {
      return PaymentStatus.PAID;
    } else if (successCount > 0 && failedCount > 0) {
      return PaymentStatus.PARTIAL;
    } else {
      return PaymentStatus.FAILED;
    }
  }

  /**
   * Build appropriate message for payment response
   */
  private buildPaymentMessage(processingResult: {
    successfulItems: { item: TabItem; icafeOrder: any }[];
    failedItems: { item: TabItem; error: string }[];
  }): string {
    const successCount = processingResult.successfulItems.length;
    const failedCount = processingResult.failedItems.length;

    if (successCount > 0 && failedCount === 0) {
      return 'Payment processed successfully for all items';
    } else if (successCount > 0 && failedCount > 0) {
      return `Partial payment: ${successCount} items processed, ${failedCount} items failed. Failed items can be retried.`;
    } else {
      return 'Payment failed for all items';
    }
  }

  /**
   * Extract user-friendly error message from exception
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Retry payment for failed items only
   */
  async retryFailedItems(tabId: string, processPaymentDto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Retrying failed items for tab ${tabId}`);
    
    const tab = await this.tabModel.findById(tabId).exec();
    if (!tab) {
      throw new NotFoundException(`Tab with ID ${tabId} not found`);
    }

    if (!tab.failedItems || tab.failedItems.length === 0) {
      throw new BadRequestException('No failed items to retry');
    }

    // Use the recovery process to retry only failed items
    return this.processTabPaymentWithRecovery(tabId, processPaymentDto);
  }
}
