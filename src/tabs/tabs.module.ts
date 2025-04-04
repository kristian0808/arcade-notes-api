// src/tabs/tabs.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TabsController } from './tabs.controller';
import { TabsService } from './tabs.service';
import { IcafeModule } from '../icafe/icafe.module';
import { Tab, TabSchema } from 'src/notes/schemas/tab.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Tab.name,
        schema: TabSchema,
      },
    ]),
    forwardRef(() => IcafeModule),
  ],
  controllers: [TabsController],
  providers: [TabsService],
  exports: [TabsService],
})
export class TabsModule {}