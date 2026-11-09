export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Telefon numarasının gerçekliğini ve biçimini kontrol eder
 */
export function validatePhone(phone: string | null | undefined): ValidationResult {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return {
      isValid: false,
      message: 'Telefon numarası kesinlikle boş bırakılamaz.',
    };
  }

  const trimmed = phone.trim();

  // Yalnızca izin verilen karakterler: rakamlar, boşluk, +, (, ), -, ., /
  if (!/^[+0-9\s()./-]+$/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Telefon numarası geçersiz karakterler içeriyor. Yalnızca rakam ve telefon karakterleri giriniz.',
    };
  }

  const digits = trimmed.replace(/\D/g, '');

  if (digits.length < 7) {
    return {
      isValid: false,
      message: 'Telefon numarası çok kısa (en az 7 hane olmalıdır).',
    };
  }
  if (digits.length > 15) {
    return {
      isValid: false,
      message: 'Telefon numarası çok uzun (en fazla 15 hane olmalıdır).',
    };
  }

  // Sahte / tekrar eden hane kontrolü (Örn: 0000000000, 1111111111, 9999999999)
  if (/^(\d)\1+$/.test(digits)) {
    return {
      isValid: false,
      message: 'Geçersiz / sahte telefon numarası (tüm haneler aynı olamaz).',
    };
  }

  // Basit ardışık sahte kontrolü (1234567890, 0123456789, 9876543210)
  const sequentialPatterns = ['0123456789', '1234567890', '9876543210', '1234567'];
  if (sequentialPatterns.some((pattern) => digits.includes(pattern))) {
    return {
      isValid: false,
      message: 'Geçersiz / sahte sıralı telefon numarası tespit edildi.',
    };
  }

  // Türkiye numaraları için yerel kontrol
  let localDigits = digits;
  if (trimmed.startsWith('+90') || digits.startsWith('90')) {
    localDigits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    localDigits = digits.slice(1);
  }

  if (localDigits.length === 10) {
    const firstDigit = localDigits[0];
    if (!['2', '3', '4', '5', '8'].includes(firstDigit)) {
      return {
        isValid: false,
        message: 'Türkiye telefon numaraları 05XX (cep), 02XX/03XX (sabit) veya 0850 ile başlamalıdır.',
      };
    }
  } else if (localDigits.length === 7) {
    if (!localDigits.startsWith('444')) {
      return {
        isValid: false,
        message: '7 haneli telefon numaraları 444 ile başlamalıdır.',
      };
    }
  } else if (!trimmed.startsWith('+') && digits.length !== 10 && digits.length !== 11) {
    return {
      isValid: false,
      message: 'Lütfen geçerli bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).',
    };
  }

  return { isValid: true };
}

/**
 * E-posta adresinin gerçek ve geçerli biçimde olduğunu kontrol eder
 */
export function validateEmail(email: string | null | undefined): ValidationResult {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { isValid: true }; // Boşsa (opsiyonel alanlar için) serbesttir
  }

  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Geçersiz e-posta formatı. Lütfen "ornek@sirket.com" biçiminde gerçek bir e-posta giriniz.',
    };
  }

  const parts = trimmed.split('.');
  const tld = parts[parts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return {
      isValid: false,
      message: 'E-posta uzantısı geçerli değil (Örn: .com, .com.tr, .net).',
    };
  }

  return { isValid: true };
}
