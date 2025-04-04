import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IcafeService } from './icafe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from '../notes/schemas/note.schema';
import { TabsModule } from '../tabs/tabs.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => TabsModule),
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
