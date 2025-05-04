import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy'; // Import LocalStrategy
import { JwtStrategy } from './jwt.strategy'; // Import JwtStrategy

// TODO: Move secret and expiration to configuration (e.g., .env file)
export const jwtConstants = {
  secret: 'YOUR_SECRET_KEY', // Replace with a strong secret key!
};

@Module({
  imports: [
    UsersModule,
    PassportModule, // Import PassportModule
    JwtModule.register({
      global: true, // Make JwtService available globally
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60m' }, // Example: Token expires in 60 minutes
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy], // Register strategies
  controllers: [AuthController],
  exports: [AuthService], // Export AuthService if needed by other modules
})
export class AuthModule {}
