import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Decimal from 'decimal.js';

export interface ExchangeRateInfo {
  usdRate: number;
  lastUpdated: string;
  source: string;
}

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);
  
  // Başlangıç önbellek değeri (TCMB arka planda güncelleyene kadar)
  private cachedRate: ExchangeRateInfo = {
    usdRate: 50.18,
    lastUpdated: new Date().toISOString(),
    source: 'TCMB (Önbellek)',
  };

  private cacheExpiry: number = 0;
  private isFetching: boolean = false;
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 dakika

  onModuleInit() {
    // Modül başlarken arka planda ilk kuru çek
    this.refreshRateInBackground();
  }

  getUsdRate(): ExchangeRateInfo {
    const now = Date.now();
    if (now > this.cacheExpiry && !this.isFetching) {
      this.refreshRateInBackground();
    }
    return this.cachedRate;
  }

  private async refreshRateInBackground(): Promise<void> {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const controller = new AbortController();
      // TCMB sunucuları bazen 8-10 saniyede yanıt verdiği için timeout 15 saniyedir (arka planda çalışır, kullanıcıyı bekletmez)
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const xmlText = await response.text();
        const usdMatch =
          xmlText.match(/CurrencyCode="USD"[\s\S]*?<ForexSelling>([0-9.]+)<\/ForexSelling>/i) ||
          xmlText.match(/Kod="USD"[\s\S]*?<ForexSelling>([0-9.]+)<\/ForexSelling>/i);

        if (usdMatch && usdMatch[1]) {
          const rate = parseFloat(usdMatch[1]);
          if (!isNaN(rate) && rate > 0) {
            this.cachedRate = {
              usdRate: Number(rate.toFixed(4)),
              lastUpdated: new Date().toISOString(),
              source: 'TCMB (Türkiye Cumhuriyet Merkez Bankası)',
            };
            this.cacheExpiry = Date.now() + this.CACHE_DURATION_MS;
            this.logger.log(`TCMB USD/TRY kuru başarıyla güncellendi: ${rate} ₺`);
          }
        }
      } else {
        this.logger.warn(`TCMB yanıt kodu: ${response.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`TCMB kur çekme arka plan hatası: ${err?.message || err}`);
      this.cacheExpiry = Date.now() + 2 * 60 * 1000; // 2 dk sonra tekrar dene
    } finally {
      this.isFetching = false;
    }
  }

  toUsd(amountTry: Decimal.Value, usdRate: number): Decimal {
    if (!usdRate || usdRate <= 0) return new Decimal(0);
    return new Decimal(amountTry).dividedBy(usdRate);
  }

  toTry(amountUsd: Decimal.Value, usdRate: number): Decimal {
    return new Decimal(amountUsd).times(usdRate);
  }
}
