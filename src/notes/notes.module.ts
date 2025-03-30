import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mongoose } from 'mongoose';
import { Note, NoteSchema } from './schemas/note.schema';
import { IcafeModule } from 'src/icafe/icafe.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Note.name,
                schema: NoteSchema,
            },
        ]),
        IcafeModule,
    ],
    controllers: [NotesController],
    providers: [NotesService],
})
export class NotesModule {}
