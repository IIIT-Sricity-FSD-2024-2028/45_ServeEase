import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { configureSecurityMiddleware } from './middleware/security.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  configureSecurityMiddleware(app);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useStaticAssets(join(process.cwd(), '..', 'front-end'));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

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
