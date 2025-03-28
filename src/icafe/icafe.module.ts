import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IcafeService } from './icafe.service';

@Module({
  imports: [HttpModule],
  providers: [IcafeService],
  exports: [IcafeService],
})
export class IcafeModule {}
