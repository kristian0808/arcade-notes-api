import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { IcafeModule } from 'src/icafe/icafe.module';

@Module({
  imports: [IcafeModule],
  providers: [ProductsService],
  controllers: [ProductsController]
})
export class ProductsModule {}
