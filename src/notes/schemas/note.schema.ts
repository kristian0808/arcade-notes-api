import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
    @Prop({
        type: Number,
        required: true,
        index: true,
    })
    memberId: number;

    @Prop({
        type: String,
        required: false,
    })
    memberAccount: string;

    @Prop({
        type: String,
        required: false,
    })
    pcName: string;

    @Prop({
        type: String,
        required: true,
        index: true,
    })
    content: string;

    @Prop({
        type: Boolean,
        required: true,
        default: true,
        index: true,
    })
    isActive: boolean;

    @Prop()
    createdAt: Date;
    
    @Prop()
    updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);