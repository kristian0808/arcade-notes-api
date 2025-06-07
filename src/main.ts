import { NestFactory, Reflector } from '@nestjs/core'; // Import Reflector
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // Import JwtAuthGuard
import * as cookieParser from 'cookie-parser'; // Import cookie-parser

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add cookie parser middleware BEFORE other configurations that might need it
  app.use(cookieParser());

  // Set global prefix
  app.setGlobalPrefix('api');

  // Production-ready CORS configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [
          /^https:\/\/.*\.vercel\.app$/,  // Allow any Vercel deployment domain
          process.env.FRONTEND_URL || 'https://your-frontend-domain.netlify.app',
          process.env.FRONTEND_URL_ALT || 'https://your-frontend-domain.vercel.app'
        ]
      : [
          'http://localhost:5173', // Vite dev server default
          'http://127.0.0.1:5173',
        ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Enable URI Versioning (e.g., /api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1', // Set default version to '1'
  });

  // Apply global JWT authentication guard
  // Routes can be exempted using the @Public() decorator
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Use PORT from environment (required for deployment platforms)
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0'); // Bind to all interfaces for deployment
  console.log(`🚀 Application is running on port ${port}`);
}
bootstrap();
