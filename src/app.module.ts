import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { NotesModule } from './notes/notes.module';
import { IcafeModule } from './icafe/icafe.module';
import { PcsModule } from './pcs/pcs.module';
import { MembersModule } from './members/members.module';
import { TabsModule } from './tabs/tabs.module';
import { ProductsModule } from './products/products.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    // Import the ConfigModule to use the ConfigService
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigModule available globally
      envFilePath: '.env', // Load the .env file
    }),
    DatabaseModule,
    NotesModule,
    IcafeModule,
    PcsModule,
    MembersModule,
    TabsModule,
    ProductsModule,
    ScheduleModule.forRoot(), // Schedule module for cron jobs @Interval
    WebsocketsModule, AuthModule, UsersModule, CacheModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
