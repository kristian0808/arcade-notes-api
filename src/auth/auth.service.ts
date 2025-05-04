import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema'; // Import User type from schema
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // Import bcrypt for password hashing (install if needed)

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials.
   * IMPORTANT: This basic implementation compares plain text passwords.
   * In a real application, you MUST hash passwords during user creation/update
   * and compare the provided password with the stored hash using bcrypt.compare().
   *
   * Example (assuming user.password is the stored hash):
   * const isMatch = await bcrypt.compare(pass, user.password);
   * if (user && isMatch) { ... }
   */
  async validateUser(username: string, pass: string): Promise<Omit<User, 'password'> | null> {
    // findOne now selects the password field
    const user = await this.usersService.findOne(username);
    if (user && user.password) { // Check if user and password exist
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user.toObject(); // Use toObject() to work with a plain object
        return result;
      }
    }
    return null;
  }

  /**
   * Generates a JWT access token for a validated user.
   * This is called after the user is validated by a strategy (e.g., LocalStrategy).
   */
  async login(user: any): Promise<{ access_token: string }> { // Use 'any' or a specific type including _id
    const payload = { username: user.username, sub: user._id /* Use _id from Mongoose */ };
    return {
      access_token: this.jwtService.sign(payload), // Use sign (sync) or signAsync
    };
  }
}
