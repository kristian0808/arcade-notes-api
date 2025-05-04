import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async validateUser(username: string, pass: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findOne(username);
    if (user && user.password) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        const { password, ...result } = user.toObject();
        return result;
      }
    }
    return null;
  }

  async login(user: any): Promise<TokenResponse> {
    const payload = { username: user.username, sub: user._id };
    
    // Generate JWT access token
    const access_token = this.jwtService.sign(payload);
    
    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
    
    // Save refresh token to database
    await this.refreshTokenModel.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: expiresAt,
    });
    
    return {
      access_token,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    // Find refresh token in database
    const token = await this.refreshTokenModel.findOne({ 
      token: refreshToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.usersService.findOne(token.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke old refresh token
    token.isRevoked = true;
    token.revokedAt = new Date();
    await token.save();

    // Generate new tokens (token rotation)
    const payload = { username: user.username, sub: user._id };
    
    const access_token = this.jwtService.sign(payload);
    
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await this.refreshTokenModel.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: expiresAt,
    });
    
    return {
      access_token,
      refresh_token: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Revoke refresh token
    await this.refreshTokenModel.updateOne(
      { token: refreshToken },
      { isRevoked: true, revokedAt: new Date() }
    );
  }
}
