import { Module } from '@nestjs/common';
import { PcsController } from './pcs.controller';
import { IcafeModule } from '../icafe/icafe.module';

@Module({
    imports: [IcafeModule],
    controllers: [PcsController],
    providers: [],
})
export class PcsModule {}
