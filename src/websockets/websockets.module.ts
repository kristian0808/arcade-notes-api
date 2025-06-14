import { Module, forwardRef } from '@nestjs/common';
import { IcafeModule } from 'src/icafe/icafe.module';
import { TabsModule } from 'src/tabs/tabs.module';
import { DashboardGateway } from './dashboard.gateway';

@Module({
  imports: [IcafeModule, forwardRef(() => TabsModule)],
  providers: [
    DashboardGateway,
    {
      provide: 'DashboardGateway',
      useExisting: DashboardGateway,
    },
  ],
  exports: [DashboardGateway, 'DashboardGateway'],
})
export class WebsocketsModule {}
