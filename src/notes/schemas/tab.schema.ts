import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TabDocument = Tab & Document;
export type TabItemDocument = TabItem & Document;

@Schema()
export class TabItem {
  @Prop({
    type: String,
    required: true,
  })
  productId: string;

  @Prop({
    type: String,
    required: true,
  })
  productName: string;

  @Prop({
    type: Number,
    required: true,
  })
  price: number;

  @Prop({
    type: Number,
    required: true,
    min: 1,
  })
  quantity: number;

  @Prop({
    type: Number,
    required: true,
  })
  totalPrice: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  addedAt: Date;
}

export const TabItemSchema = SchemaFactory.createForClass(TabItem);

@Schema()
export class IcafeOrder {
  @Prop({
    type: String,
    required: true,
  })
  orderId: string;

  @Prop({
    type: Object,
    required: true,
  })
  orderResponse: any; // Full ICafe API response

  @Prop({
    type: [TabItemSchema],
    required: true,
  })
  items: TabItem[]; // Items included in this specific order

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt: Date;

  @Prop({
    type: Number,
    required: true,
  })
  amount: number;
}

export const IcafeOrderSchema = SchemaFactory.createForClass(IcafeOrder);

@Schema({ timestamps: true })
export class Tab {
  @Prop({
    type: Number,
    required: true,
    index: true,
  })
  memberId: number;

  @Prop({
    type: String,
    required: true,
  })
  memberAccount: string;

  @Prop({
    type: String,
    required: false,
  })
  pcName: string;

  @Prop({
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
    index: true,
  })
  status: string;

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'partial', 'failed'],
    default: 'pending',
    index: true,
  })
  paymentStatus: string;

  @Prop({
    type: String,
    enum: ['cash', 'balance', 'card'],
    required: false,
  })
  paymentMethod: string;

  @Prop({
    type: [IcafeOrderSchema],
    default: [],
  })
  icafeOrders: IcafeOrder[];

  @Prop({
    type: [TabItemSchema],
    default: [],
  })
  failedItems: TabItem[];

  @Prop({
    type: Date,
  })
  closedAt: Date;

  @Prop({
    type: Date,
  })
  paidAt: Date;

  @Prop({
    type: [TabItemSchema],
    default: [],
  })
  items: TabItem[];

  @Prop({
    type: Number,
    default: 0,
  })
  totalAmount: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TabSchema = SchemaFactory.createForClass(Tab);
