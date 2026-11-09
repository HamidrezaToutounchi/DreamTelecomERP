import { describe, it, expect } from 'vitest';

// WCAG 2.1 Bağıl Parlaklık (Relative Luminance) Hesaplama Formülü
function getLuminance(hex: string): number {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// WCAG 2.1 Kontrast Oranı Hesaplama
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('WCAG 2.1 AA Renk Kontrastı Doğrulaması (Dream Telecom SDYS)', () => {
  const brandColors = {
    brandNavy: '#004A93',
    brandTeal: '#006F8D',
    brandGreen: '#78C042',
    navy950: '#05192D',
    white: '#FFFFFF',
    green50: '#F4FAF0',
    green100: '#E7F5DD',
    green900: '#325420',
    slate700: '#334155',
    slate900: '#0F172A',
  };

  it('HATA TESPİTİ: brand-green üzerinde beyaz metin WCAG AA (4.5:1) eşiğini GEÇEMEZ', () => {
    const ratio = getContrastRatio(brandColors.brandGreen, brandColors.white);
    // Beklendiği gibi ~2.1:1 dir ve 4.5'ten küçüktür.
    expect(ratio).toBeLessThan(4.5);
  });

  it('ÇÖZÜM 1: brand-green dolgu üzerinde koyu metin (#05192D - navy-950) WCAG AA standardını sağlar (>= 4.5:1)', () => {
    const ratio = getContrastRatio(brandColors.brandGreen, brandColors.navy950);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('ÇÖZÜM 2: green-100 zemin üzerinde green-900 koyu yeşil metin WCAG AA standardını sağlar (>= 4.5:1)', () => {
    const ratio = getContrastRatio(brandColors.green100, brandColors.green900);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('brand-navy üzerinde beyaz metin WCAG AA standardını sağlar (>= 4.5:1)', () => {
    const ratio = getContrastRatio(brandColors.brandNavy, brandColors.white);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('brand-teal üzerinde beyaz metin WCAG AA standardını sağlar (>= 4.5:1)', () => {
    const ratio = getContrastRatio(brandColors.brandTeal, brandColors.white);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
