import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/schemas/user.schema'; // Import User type from schema

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Optionally configure field names if they differ from 'username' and 'password'
    // super({ usernameField: 'email' });
    super();
  }

  /**
   * Passport automatically calls this method with credentials from the request body.
   * It uses the validateUser method from AuthService to check credentials.
   */
  async validate(username: string, password: string): Promise<Omit<User, 'password'>> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user; // Passport attaches this user object to request.user
  }
}