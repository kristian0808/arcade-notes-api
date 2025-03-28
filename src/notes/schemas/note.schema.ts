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
    memeberId: number;

    @Prop({
        type: String,
        required: true,
    })
    memeberAccount: string;

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
}

export const NoteSchema = SchemaFactory.createForClass(Note);