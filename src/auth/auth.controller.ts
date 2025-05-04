import { Controller, Post, UseGuards, Request, HttpCode, HttpStatus, Get, Body } from '@nestjs/common'; // Re-added Body
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service'; // Import UsersService
import { LocalAuthGuard } from './local-auth.guard';
import { User } from '../users/schemas/user.schema'; // Import User type from schema
import { Public } from './public.decorator'; // Import Public decorator
import { CreateUserDto } from '../users/dto/create-user.dto'; // Re-added CreateUserDto import

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService, // Inject UsersService
  ) {}

  /**
   * Handles POST /auth/login requests.
   * The LocalAuthGuard intercepts the request, validates credentials using LocalStrategy.
   * If valid, the user object (returned by LocalStrategy.validate) is attached to req.user.
   * We then call authService.login with req.user to generate the JWT.
   */
  @Public() // Mark this route as public
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK) // Set response code to 200 OK on success
  @Post('login')
  async login(@Request() req: { user: Omit<User, 'password'> }) {
    // req.user is populated by the LocalAuthGuard/LocalStrategy
    return this.authService.login(req.user);
  }

  /* --- COMMENTED OUT: Public Registration Endpoint ---
  /**
   * Handles POST /auth/register requests.
   * Creates a new user using UsersService.
   */
  /*
  @Public() // Mark this route as public
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // The ValidationPipe automatically validates the incoming body against CreateUserDto
    const user = await this.usersService.create(createUserDto);
    // Exclude password from the response
    // The toJSON method in the schema handles this if called implicitly,
    // otherwise, manually exclude it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject(); // Use toObject() to get a plain object
    return result;
  }
  */

  /**
   * Handles GET /auth/profile requests.
   * This route is protected by the global JwtAuthGuard.
   * It returns the user object attached to the request by JwtStrategy.validate().
   */
  @Get('profile')
  getProfile(@Request() req: { user: Omit<User, 'password'> }) {
    // req.user is populated by the JwtAuthGuard/JwtStrategy
    return req.user;
  }
}
