import { Module, forwardRef } from '@nestjs/common'; // Added forwardRef
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { LocalStrategy } from './local.strategy'; // Import LocalStrategy
import { JwtStrategy } from './jwt.strategy'; // Import JwtStrategy
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { CacheModule } from '../cache/cache.module'; // Added CacheModule import

// Removed jwtConstants export

@Module({
  imports: [
    UsersModule,
    PassportModule,
    forwardRef(() => CacheModule), // Added CacheModule to imports
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema }
    ]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRY', '15m'),
          issuer: configService.get<string>('JWT_ISSUER', 'icafe-notes'),
          audience: configService.get<string>('JWT_AUDIENCE', 'icafe-notes-client')
        },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy], // Register strategies
  controllers: [AuthController],
  exports: [AuthService], // Export AuthService if needed by other modules
})
export class AuthModule {}
