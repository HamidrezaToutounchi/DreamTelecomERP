import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Veritabanı bağlantısı başarıyla kuruldu.');

      // Otomatik Veri Bütünlüğü: Alt revizyonu bulunan eski tekliflerin durumunu REVISED olarak işaretle
      try {
        const updatedCount = await this.$executeRawUnsafe(`
          UPDATE quotes 
          SET status = 'REVISED' 
          WHERE id IN (
            SELECT DISTINCT "parentQuoteId" 
            FROM quotes 
            WHERE "parentQuoteId" IS NOT NULL
          ) AND status != 'REVISED';
        `);
        if (updatedCount > 0) {
          this.logger.log(`${updatedCount} adet üst teklif revizyon durumu 'REVISED' olarak onarıldı.`);
        }
      } catch (e: any) {
        // Tablolar henüz oluşmadıysa sessizce devam et
      }
    } catch (error: any) {
      this.logger.warn('Veritabanına bağlanılamadı (seed veya migration gerekebilir): ' + (error?.message || error));
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Veritabanı bağlantısı kapatıldı.');
  }
}
