import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { IcafeModule } from '../icafe/icafe.module';

@Module({
    imports: [IcafeModule],
    controllers: [MembersController],
    providers: [],
})
export class MembersModule {}
