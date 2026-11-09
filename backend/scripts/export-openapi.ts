import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function exportOpenApi() {
  console.log('🔄 OpenAPI şeması üretiliyor...');
  const app = await NestFactory.create(AppModule, { logger: false });

  app.setGlobalPrefix('api/v1');

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
        description: 'JWT Erişim Belirteci (Örn: Bearer <token>)',
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

  const outputDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`✅ OpenAPI şeması başarıyla dışa aktarıldı: ${outputPath}`);
  await app.close();
  process.exit(0);
}

exportOpenApi().catch((err) => {
  console.error('❌ OpenAPI export hatası:', err);
  process.exit(1);
});
