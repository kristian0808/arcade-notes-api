import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './auth.module'; // Import constants for secret key
import { UsersService } from '../users/users.service'; // Import UsersService
import { User } from '../users/schemas/user.schema'; // Import User type from schema

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService, // Inject UsersService if you need to validate user existence/status
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extracts token from 'Authorization: Bearer <token>'
      ignoreExpiration: false, // Ensure expired tokens are rejected
      secretOrKey: jwtConstants.secret, // Use the same secret key as in AuthModule
    });
  }

  /**
   * Passport first verifies the JWT's signature and decodes the JSON.
   * It then invokes this validate() method passing the decoded JSON as its single parameter.
   * We can use this payload to retrieve the user or perform further validation.
   */
  async validate(payload: any): Promise<Omit<User, 'password'>> {
    // Payload contains { username: '...', sub: '...', iat: ..., exp: ... }
    // You could fetch the full user object from the database here if needed
    const user = await this.usersService.findOne(payload.username);
    if (!user) {
      // Optional: Check if user still exists or is active
      throw new UnauthorizedException('User not found or inactive');
    }
    // Passport attaches this return value to request.user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user; // Ensure password is not returned
    return result;
  }
}