import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * This guard automatically triggers the 'jwt' strategy (JwtStrategy).
 * It validates the JWT found in the 'Authorization: Bearer <token>' header.
 * It also allows bypassing authentication for routes marked with the @Public() decorator.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true; // Allow access if @Public() is used
    }

    // If not public, proceed with standard JWT authentication
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    // info might be JsonWebTokenError or TokenExpiredError
    if (err || !user) {
      // Customize error message based on info if needed
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user; // Passport attaches the validated user payload to request.user
  }
}