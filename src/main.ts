import { NestFactory, Reflector } from '@nestjs/core'; // Import Reflector
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // Import JwtAuthGuard

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Set global prefix
    app.setGlobalPrefix('api');

    // Enable CORS - Allow requests from frontend
    app.enableCors({
        origin: [
            'http://localhost:5173', // Vite dev server default
            'http://127.0.0.1:5173'
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // Apply global validation pipe
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true
    }));

    // Enable URI Versioning (e.g., /api/v1/...)
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1', // Set default version to '1'
    });

    // Apply global JWT authentication guard
    // Routes can be exempted using the @Public() decorator
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));

    await app.listen(3000);
    console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
