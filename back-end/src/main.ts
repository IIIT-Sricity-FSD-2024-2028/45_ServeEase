import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const requestLogger = new Logger('ServeEaseRequest');

  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      requestLogger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'role'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), '..', 'front-end', 'front-end'));

  const config = new DocumentBuilder()
    .setTitle('ServeEase API')
    .setDescription('In-memory NestJS backend with CRUD, DTO validation, RBAC, and Swagger.')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'role',
        in: 'header',
        description: 'Role-based access header. Use "admin" for full access or "user" for read-only GET access.',
      },
      'role',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  mkdirSync(join(process.cwd(), 'docs'), { recursive: true });
  writeFileSync(join(process.cwd(), 'docs', 'swagger.json'), JSON.stringify(document, null, 2));

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

void bootstrap();
