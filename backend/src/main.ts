import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DecimalTransformInterceptor } from './common/interceptors/decimal-transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  // Global Decimal to String Interceptor
  app.useGlobalInterceptors(new DecimalTransformInterceptor());

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger / OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Dream Telecom - SDYS CRM Backend API')
    .setDescription(
      'Dream Telecom Satış & Dağıtım Yönetim Sistemi (SDYS) kurumsal RESTful API ve Socket.io altyapısı. ' +
        'Frontend Orval React Query kod üretimi için OpenAPI 3.0 standardına tam uyumludur.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Erişim Belirteci giriniz (Örn: Bearer <token>)',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Kimlik doğrulama ve kullanıcı profili')
    .addTag('Users', 'Kullanıcı ve satış temsilcisi yönetimi')
    .addTag('Leads', 'Potansiyel müşteri, Excel import ve temsilcilere dağıtım')
    .addTag('Customers', 'Müşteri yönetimi ve leadden dönüşüm')
    .addTag('Interactions', 'Müşteri & Lead temas ve görüşme geçmişi')
    .addTag('Quotes', 'Teklif hazırlama, revizyon versiyonlama ve PDF çıktısı')
    .addTag('Sales', 'Satış ve fatura takip işlemleri')
    .addTag('Analytics', 'Satış müdürü dashboard özetleri ve detaylı raporlar')
    .addTag('Uploads', 'Ürün fotoğrafları ve dosya yükleme')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Dream Telecom SDYS Backend çalışıyor: http://localhost:${port}/api/v1`);
  logger.log(`📚 OpenAPI Swagger Dokümantasyonu: http://localhost:${port}/api/docs`);
  logger.log(`⚡ Socket.io Gateway aktif: http://localhost:${port}`);
}

bootstrap();
