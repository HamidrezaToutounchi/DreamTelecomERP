import Decimal from 'decimal.js';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * String veya Decimal parasal değeri ASLA Number'a çevirmeden,
 * Decimal.js ve Intl.NumberFormat standartlarına uygun olarak biçimlendirir.
 */
export function formatMoney(
  value: string | number | Decimal | undefined | null,
  currency: string = 'TRY',
): string {
  if (value === undefined || value === null || value === '') {
    return '0,00 ' + (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺');
  }

  let dec: Decimal;
  if (value instanceof Decimal) {
    dec = value;
  } else {
    try {
      const sanitized = String(value).trim().replace(/,/g, '.');
      const clean = sanitized.endsWith('.') ? sanitized.slice(0, -1) || '0' : sanitized;
      dec = new Decimal(clean === '' || clean === '.' ? 0 : clean);
    } catch {
      dec = new Decimal(0);
    }
  }

  const fixed = dec.toFixed(2);
  const [integerPart, decimalPart] = fixed.split('.');

  // Binlik ayracı ekle (Türkçe nokta)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const symbolMap: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€',
  };

  const symbol = symbolMap[currency] || currency;
  return `${formattedInteger},${decimalPart} ${symbol}`;
}

/**
 * ISO tarihini Europe/Istanbul saat dilimine göre okunabilir formatta gösterir.
 */
export function formatDate(
  dateInput: string | Date | undefined | null,
  formatPattern: string = 'dd.MM.yyyy HH:mm',
): string {
  if (!dateInput) return '-';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(date, formatPattern, { locale: tr });
  } catch {
    return String(dateInput);
  }
}

/**
 * Sadece tarih (Gün.Ay.Yıl)
 */
export function formatDateOnly(dateInput: string | Date | undefined | null): string {
  return formatDate(dateInput, 'dd.MM.yyyy');
}
