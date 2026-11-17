import { BarcodeService } from './barcode.service';

describe('BarcodeService (Unit Tests)', () => {
  let service: BarcodeService;

  beforeEach(() => {
    service = new BarcodeService();
  });

  describe('cleanInput & Türkçe Q Klavye Düzeltmesi', () => {
    it('boşluk ve kontrol karakterlerini kırpmalıdır', () => {
      const input = '  \x02SN123456\x03\r\n  ';
      expect(service.cleanInput(input)).toBe('SN123456');
    });

    it('Türkçe karakterleri İngilizce eşdeğerlerine çevirmelidir', () => {
      const turkishInput = 'ışöüçğIŞÖÜÇĞ';
      expect(service.cleanInput(turkishInput)).toBe('isoucgISOUCG');
    });
  });

  describe('normalizeMacAddress', () => {
    it('farklı formatlardaki MAC adreslerini standart formata getirmelidir', () => {
      expect(service.normalizeMacAddress('001122334455')).toBe('00:11:22:33:44:55');
      expect(service.normalizeMacAddress('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
      expect(service.normalizeMacAddress('00:11:22:33:44:55')).toBe('00:11:22:33:44:55');
      expect(service.normalizeMacAddress('0011.2233.4455')).toBe('00:11:22:33:44:55');
      expect(service.normalizeMacAddress('aabbccddeeff')).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('geçersiz uzunluk veya hex dışı girdi için null dönmelidir', () => {
      expect(service.normalizeMacAddress('00:11:22')).toBeNull();
      expect(service.normalizeMacAddress('00:11:22:33:44:ZZ')).toBeNull();
      expect(service.normalizeMacAddress('')).toBeNull();
    });
  });

  describe('normalizeBarcode', () => {
    it('12 haneli UPC-A kodunu 14 haneli GTIN formatına çevirmelidir', () => {
      expect(service.normalizeBarcode('012345678905')).toBe('00012345678905');
    });

    it('13 haneli EAN-13 kodunu 14 haneli GTIN formatına çevirmelidir', () => {
      expect(service.normalizeBarcode('8691234567890')).toBe('08691234567890');
    });

    it('14 haneli GTIN kodunu olduğu gibi bırakmalıdır', () => {
      expect(service.normalizeBarcode('00869123456789')).toBe('00869123456789');
    });
  });

  describe('GS1 ve Genel Parse', () => {
    it('parantezli GS1 formatını GTIN ve Seri olarak ayrıştırmalıdır', () => {
      const res = service.parse('(01)08691234567890(21)SER12345');
      expect(res.type).toBe('GS1');
      expect(res.gtin).toBe('08691234567890');
      expect(res.serial).toBe('SER12345');
    });

    it('Zebra barkod okuyucu FNC1 formatını ayrıştırmalıdır', () => {
      const res = service.parse(']d2010869123456789021SER999');
      expect(res.type).toBe('GS1');
      expect(res.gtin).toBe('08691234567890');
      expect(res.serial).toBe('SER999');
    });

    it('düz seri numarasını SERIAL olarak tanımalıdır', () => {
      const res = service.parse('SN-2026-X89');
      expect(res.type).toBe('SERIAL');
      expect(res.serial).toBe('SN-2026-X89');
    });

    it('MAC adresini MAC olarak tanımalıdır', () => {
      const res = service.parse('e4:aa:ea:12:34:56');
      expect(res.type).toBe('MAC');
      expect(res.mac).toBe('E4:AA:EA:12:34:56');
    });
  });
});
