import { SetMetadata } from '@nestjs/common';

/**
 * Key used to store metadata indicating whether a route is public.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark a route handler or controller as public (no authentication required).
 * Usage: Apply @Public() to a route handler method or above a controller class.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);