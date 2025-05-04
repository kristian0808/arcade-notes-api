import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedingService } from './seeding/seeding.service';
import { UsersModule } from '../users/users.module'; // Import UsersModule


@Module({
    imports: [
        ConfigModule, // Import ConfigModule to make ConfigService available
        UsersModule,  // Import UsersModule to make UsersService available
        MongooseModule.forRootAsync({
            imports: [ConfigModule], // Make ConfigModule available to the factory
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get('DATABASE_URL'),
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [SeedingService],
})

export class DatabaseModule { }
