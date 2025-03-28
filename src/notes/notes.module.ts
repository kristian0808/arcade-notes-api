import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mongoose } from 'mongoose';
import { Note, NoteSchema } from './schemas/note.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Note.name,
                schema: NoteSchema,
            },
        ]),
    ],
})
export class NotesModule {}
