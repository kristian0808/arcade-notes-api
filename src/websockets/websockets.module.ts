import { Module } from '@nestjs/common';
import { IcafeModule } from 'src/icafe/icafe.module';
import { DashboardGateway } from './dashboard.gateway';

@Module({
    imports: [IcafeModule],
    providers: [DashboardGateway],
    exports: [DashboardGateway],
})
export class WebsocketsModule { }
