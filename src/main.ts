import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? '*',
    credentials: true,
  });

  app.use(helmet());

  app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'cookie-secret',
  });

  app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lodging Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
