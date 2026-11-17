import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarcodeService } from '../common/barcode/barcode.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  QuickCreateCustomerDto,
  StockCustomerSearchItemDto,
  StockLookupResultDto,
} from './dto/stock.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barcodeService: BarcodeService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Telefon numarasını sadece son 10 haneli rakamlar olarak normalize eder
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }

  /**
   * Şirket ünvanını karşılaştırma için temizler (A.Ş, LTD. vb. ekleri ve noktalama işaretlerini kaldırır)
   */
  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\.,\-_/\\()]/g, ' ')
      .replace(/\b(a\s*s|as|a\s*s\s*|anonim sirkeri|anonim sirketi|ltd|sti|limited sirkeri|limited sirketi|san|tic|sanayi|ve|ticaret)\b/gi, '')
      .replace(/\s+/g, '')
      .trim();
  }

  /**
   * Tüm müşteriler arasında genel arama (Satış temsilcisi filtresine takılmaz)
   */
  async searchCustomers(query?: string): Promise<StockCustomerSearchItemDto[]> {
    const q = query?.trim() || '';
    if (!q) {
      return this.prisma.customer.findMany({
        take: 50,
        orderBy: { companyName: 'asc' },
        select: {
          id: true,
          companyName: true,
          taxNumber: true,
          taxOffice: true,
          phone: true,
          email: true,
          contactPerson: true,
          address: true,
        },
      });
    }

    return this.prisma.customer.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: 'insensitive' } },
          { taxNumber: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { contactPerson: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 50,
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        taxNumber: true,
        taxOffice: true,
        phone: true,
        email: true,
        contactPerson: true,
        address: true,
      },
    });
  }

  /**
   * Hızlı Müşteri Oluşturma (Mükerrer Kontrollü)
   */
  async quickCreateCustomer(
    dto: QuickCreateCustomerDto,
    user: AuthenticatedUser,
  ): Promise<StockCustomerSearchItemDto> {
    const taxNumber = dto.taxNumber?.trim();
    if (taxNumber) {
      const existingTax = await this.prisma.customer.findFirst({
        where: { taxNumber },
      });
      if (existingTax) {
        throw new BadRequestException(
          `Bu vergi numarasına (${taxNumber}) sahip bir müşteri zaten sistemde kayıtlı: "${existingTax.companyName}"`,
        );
      }
    }

    const normPhone = this.normalizePhone(dto.phone);
    if (normPhone) {
      const allCustomers = await this.prisma.customer.findMany({
        select: { id: true, companyName: true, phone: true },
      });
      const phoneMatch = allCustomers.find(
        (c) => this.normalizePhone(c.phone) === normPhone,
      );
      if (phoneMatch) {
        throw new BadRequestException(
          `Bu telefon numarasına (${dto.phone}) sahip bir müşteri zaten sistemde kayıtlı: "${phoneMatch.companyName}"`,
        );
      }

      const inputNormName = this.normalizeCompanyName(dto.companyName);
      if (inputNormName.length >= 3) {
        const nameMatch = allCustomers.find(
          (c) => this.normalizeCompanyName(c.companyName) === inputNormName,
        );
        if (nameMatch) {
          throw new BadRequestException(
            `"${dto.companyName}" ünvanına çok benzer bir müşteri zaten sistemde kayıtlı: "${nameMatch.companyName}". Lütfen mevcut müşteriyi seçiniz.`,
          );
        }
      }
    }

    // Temsilci belirleme (Seçilmediyse ekleyen kullanıcı)
    const assignedToId = dto.assignedToId || user.id;

    const customer = await this.prisma.customer.create({
      data: {
        companyName: dto.companyName.trim(),
        contactPerson: dto.contactPerson.trim(),
        phone: dto.phone.trim(),
        email: dto.email?.trim() || null,
        taxNumber: dto.taxNumber?.trim() || null,
        taxOffice: dto.taxOffice?.trim() || null,
        address: dto.address?.trim() || null,
        source: 'STOCK',
        assignedToId,
        createdById: user.id,
      },
      select: {
        id: true,
        companyName: true,
        taxNumber: true,
        taxOffice: true,
        phone: true,
        email: true,
        contactPerson: true,
        address: true,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'CUSTOMER',
      entityId: customer.id,
      details: `Stok modülünden hızlı müşteri eklendi: ${customer.companyName}`,
    });

    return customer;
  }

  /**
   * Akıllı Barkod / Seri No / MAC / Kod Arama
   */
  async lookup(rawCode: string): Promise<StockLookupResultDto> {
    if (!rawCode?.trim()) {
      return { matchedBy: 'NONE' };
    }

    const parsed = this.barcodeService.parse(rawCode);

    // 1. Seri No ile eşleşme
    const searchSerial = parsed.serial || rawCode.trim().toUpperCase();
    if (searchSerial) {
      const serialRecord = await this.prisma.serialNumber.findFirst({
        where: {
          OR: [
            { serial: { equals: searchSerial, mode: 'insensitive' } },
            { serial: { equals: rawCode.trim(), mode: 'insensitive' } },
          ],
        },
        include: {
          product: {
            include: {
              stockLevels: {
                include: { warehouse: true },
              },
            },
          },
        },
      });

      if (serialRecord) {
        const customer = serialRecord.currentCustomerId
          ? await this.prisma.customer.findUnique({
              where: { id: serialRecord.currentCustomerId },
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
                email: true,
                address: true,
              },
            })
          : null;

        return {
          matchedBy: 'SERIAL',
          serial: serialRecord,
          product: serialRecord.product,
          customer,
          stockLevels: serialRecord.product.stockLevels,
        };
      }
    }

    // 2. MAC Adresi ile eşleşme
    if (parsed.mac || rawCode.includes(':')) {
      const searchMac = parsed.mac || rawCode.trim();
      const serialRecord = await this.prisma.serialNumber.findFirst({
        where: {
          macAddress: { equals: searchMac, mode: 'insensitive' },
        },
        include: {
          product: {
            include: {
              stockLevels: {
                include: { warehouse: true },
              },
            },
          },
        },
      });

      if (serialRecord) {
        const customer = serialRecord.currentCustomerId
          ? await this.prisma.customer.findUnique({
              where: { id: serialRecord.currentCustomerId },
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
                email: true,
                address: true,
              },
            })
          : null;

        return {
          matchedBy: 'MAC',
          serial: serialRecord,
          product: serialRecord.product,
          customer,
          stockLevels: serialRecord.product.stockLevels,
        };
      }
    }

    // 3. Ürün Barkodu ile eşleşme
    const searchBarcodes = [parsed.normalized, parsed.raw.trim()];
    if (parsed.gtin) {
      searchBarcodes.push(parsed.gtin);
    }

    const barcodeRecord = await this.prisma.productBarcode.findFirst({
      where: { barcode: { in: searchBarcodes } },
      include: {
        product: {
          include: {
            stockLevels: {
              include: { warehouse: true },
            },
            barcodes: true,
          },
        },
      },
    });

    if (barcodeRecord) {
      return {
        matchedBy: 'BARCODE',
        product: barcodeRecord.product,
        stockLevels: barcodeRecord.product.stockLevels,
      };
    }

    // 4. Ürün Kodu ile eşleşme
    const productByCode = await this.prisma.product.findFirst({
      where: {
        OR: [
          { code: { equals: parsed.normalized, mode: 'insensitive' } },
          { code: { equals: parsed.raw.trim(), mode: 'insensitive' } },
        ],
      },
      include: {
        stockLevels: {
          include: { warehouse: true },
        },
        barcodes: true,
      },
    });

    if (productByCode) {
      return {
        matchedBy: 'PRODUCT_CODE',
        product: productByCode,
        stockLevels: productByCode.stockLevels,
      };
    }

    return { matchedBy: 'NONE' };
  }
}
