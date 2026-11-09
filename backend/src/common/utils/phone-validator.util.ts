import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export interface PhoneValidationResult {
  isValid: boolean;
  message?: string;
  normalized?: string;
}

/**
 * Telefon numarasının gerçekliğini ve biçimini kontrol eder
 */
export function validatePhone(phone: string | null | undefined): PhoneValidationResult {
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

  // Sadece rakamları ayıkla
  const digits = trimmed.replace(/\D/g, '');

  // Uzunluk kontrolü (E.164 standardı 7 ile 15 hane arası)
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
      message: 'Geçersiz / sahte sıralı numara tespit edildi.',
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
    // Türkiye'de 10 haneli numaraların ilk hanesi 2, 3, 4 (sabit), 5 (GSM cep) veya 8 (850 kurumsal) olmalıdır
    const firstDigit = localDigits[0];
    if (!['2', '3', '4', '5', '8'].includes(firstDigit)) {
      return {
        isValid: false,
        message: 'Türkiye telefon numaraları 05XX (cep), 02XX/03XX (sabit) veya 0850 ile başlamalıdır.',
      };
    }
  } else if (localDigits.length === 7) {
    // 444'lü özel kurumsal hatlar (Örn: 444 88 99)
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

  return {
    isValid: true,
    normalized: trimmed,
  };
}

/**
 * E-posta adresinin gerçek ve geçerli biçimde olduğunu kontrol eder
 */
export function validateEmail(email: string | null | undefined): { isValid: boolean; message?: string } {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return { isValid: true }; // Boşsa (opsiyonel alanlar için) serbesttir
  }

  const trimmed = email.trim();

  // Standart RFC e-posta regex'i
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      message: 'Geçersiz e-posta formatı. Lütfen "ornek@sirket.com" biçiminde gerçek bir e-posta giriniz.',
    };
  }

  // TLD (en son nokta sonrası uzantı) en az 2 harfli olmalı
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

/**
 * Class-Validator için özel Telefon Doğrulayıcı Decorator
 */
export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          const res = validatePhone(value);
          return res.isValid;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Lütfen geçerli ve gerçek bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).';
        },
      },
    });
  };
}

/**
 * Class-Validator için özel Sıkı E-posta Doğrulayıcı Decorator
 */
export function IsValidEmailStrict(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmailStrict',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (!value) return true; // Opsiyonel
          const res = validateEmail(value);
          return res.isValid;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@sirket.com).';
        },
      },
    });
  };
}
