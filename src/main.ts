import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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

    await app.listen(3000);
    console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
