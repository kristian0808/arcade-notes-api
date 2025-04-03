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
        type: Date,
    })
    closedAt: Date;

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