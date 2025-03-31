import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IcafeService } from './icafe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from '../notes/schemas/note.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      {
        name: Note.name,
        schema: NoteSchema,
      },
    ]),
  ],
  providers: [IcafeService],
  exports: [IcafeService],
})
export class IcafeModule {}