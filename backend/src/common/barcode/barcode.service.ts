import { Injectable } from '@nestjs/common';

export interface ParsedBarcodeResult {
  raw: string;
  normalized: string;
  type: 'MAC' | 'GS1' | 'BARCODE' | 'SERIAL';
  gtin?: string;
  serial?: string;
  mac?: string;
  extra?: Record<string, string>;
}

@Injectable()
export class BarcodeService {
  /**
   * Türkçe Q klavye harf kaymalarını düzelten harita
   */
  private static readonly TURKISH_CHAR_MAP: Record<string, string> = {
    'ı': 'i',
    'İ': 'I',
    'ş': 's',
    'Ş': 'S',
    'ğ': 'g',
    'Ğ': 'G',
    'ü': 'u',
    'Ü': 'U',
    'ö': 'o',
    'Ö': 'O',
    'ç': 'c',
    'Ç': 'C',
  };

  /**
   * Ham barkod/seri metnini temizler:
   * 1. Kontrol karakterlerini ve boşlukları kırpar.
   * 2. Türkçe Q klavye tuş haritalamasını İngilizce alfabeye çevirir.
   */
  cleanInput(input: string): string {
    if (!input) return '';
    let cleaned = input.trim().replace(/[\x00-\x1F\x7F]/g, '');
    for (const [trChar, enChar] of Object.entries(BarcodeService.TURKISH_CHAR_MAP)) {
      cleaned = cleaned.split(trChar).join(enChar);
    }
    return cleaned;
  }

  /**
   * MAC Adresi Doğrulama ve Normalizasyon (Örn: AA:BB:CC:DD:EE:FF)
   */
  normalizeMacAddress(input: string): string | null {
    if (!input) return null;
    const cleaned = this.cleanInput(input).toUpperCase();
    const hexOnly = cleaned.replace(/[^A-F0-9]/g, '');

    if (hexOnly.length !== 12) {
      return null;
    }

    const parts: string[] = [];
    for (let i = 0; i < 12; i += 2) {
      parts.push(hexOnly.slice(i, i + 2));
    }
    return parts.join(':');
  }

  /**
   * Barkod (EAN-13, UPC-A, GTIN-14) Normalizasyonu
   * UPC-A (12 hane) -> 14 haneli GTIN standardına "00" önekiyle
   * EAN-13 (13 hane) -> 14 haneli GTIN standardına "0" önekiyle
   */
  normalizeBarcode(barcode: string): string {
    const cleaned = this.cleanInput(barcode).replace(/\s+/g, '');
    if (/^\d{12}$/.test(cleaned)) {
      return '00' + cleaned;
    }
    if (/^\d{13}$/.test(cleaned)) {
      return '0' + cleaned;
    }
    return cleaned;
  }

  /**
   * GS1 DataMatrix / GS1-128 AI Ayrıştırma (AI 01: GTIN, AI 21: Serial)
   */
  parseGS1(input: string): { gtin?: string; serial?: string; extra: Record<string, string> } | null {
    const cleaned = this.cleanInput(input);
    const extra: Record<string, string> = {};
    let gtin: string | undefined;
    let serial: string | undefined;

    // 1. Parantezli Format: (01)0869... (21)SER12345
    if (cleaned.includes('(01)') || cleaned.includes('(21)')) {
      const gtinMatch = cleaned.match(/\(01\)([0-9]{14}|[0-9]{13}|[0-9]{12})/);
      if (gtinMatch) {
        gtin = this.normalizeBarcode(gtinMatch[1]);
      }
      const serialMatch = cleaned.match(/\(21\)([A-Za-z0-9\-_]+)/);
      if (serialMatch) {
        serial = serialMatch[1].toUpperCase();
      }
      return { gtin, serial, extra };
    }

    // 2. FNC1 veya GS1 Prefiks Formatı (01...21...)
    // Örnek: ]d2010869000000000021SN123456
    const raw = cleaned.startsWith(']d2') || cleaned.startsWith(']C1') ? cleaned.slice(3) : cleaned;
    if (raw.startsWith('01') && raw.length >= 16) {
      const rawGtin = raw.substring(2, 16);
      gtin = this.normalizeBarcode(rawGtin);
      const remaining = raw.substring(16);

      if (remaining.startsWith('21')) {
        // AI 21 seri numarası (Group separator \x1D veya string sonu)
        const serialPart = remaining.substring(2).split(/[\x1D\x1E]/)[0];
        serial = serialPart.toUpperCase();
      }
      return { gtin, serial, extra };
    }

    return null;
  }

  /**
   * Genel Barkod / Seri No / MAC Çözümleme
   */
  parse(rawInput: string): ParsedBarcodeResult {
    const cleaned = this.cleanInput(rawInput);

    // 1. MAC Adresi Kontrolü
    const mac = this.normalizeMacAddress(cleaned);
    if (mac) {
      return {
        raw: rawInput,
        normalized: mac,
        type: 'MAC',
        mac,
      };
    }

    // 2. GS1 Kontrolü
    const gs1 = this.parseGS1(cleaned);
    if (gs1 && (gs1.gtin || gs1.serial)) {
      return {
        raw: rawInput,
        normalized: gs1.serial || gs1.gtin || cleaned,
        type: 'GS1',
        gtin: gs1.gtin,
        serial: gs1.serial,
        extra: gs1.extra,
      };
    }

    // 3. Standart Sayısal Barkod (EAN-8, UPC, EAN-13, GTIN-14)
    if (/^\d{8,14}$/.test(cleaned)) {
      const normalizedGtin = this.normalizeBarcode(cleaned);
      return {
        raw: rawInput,
        normalized: normalizedGtin,
        type: 'BARCODE',
        gtin: normalizedGtin,
      };
    }

    // 4. Standart Seri Numarası
    return {
      raw: rawInput,
      normalized: cleaned.toUpperCase(),
      type: 'SERIAL',
      serial: cleaned.toUpperCase(),
    };
  }
}
