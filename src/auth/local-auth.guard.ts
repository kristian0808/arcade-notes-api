import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * This guard automatically triggers the 'local' strategy (LocalStrategy).
 * Passport under the hood will look for 'username' and 'password' in the request body
 * and pass them to the LocalStrategy's validate() method.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}