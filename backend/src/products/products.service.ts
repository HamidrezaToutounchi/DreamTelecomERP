import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductSalesStatDto,
} from './dto/product.dto';
import { DecimalUtil } from '../common/utils/decimal.util';
import { Prisma, ProductType } from '@prisma/client';
import Decimal from 'decimal.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();
    const brand = dto.brand?.trim() || null;
    const model = dto.model?.trim() || null;
    let code = dto.code?.trim() || null;

    // 1. Mükerrer Ürün Kontrolü (İsim + Marka + Model)
    const existing = await this.prisma.product.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        brand: brand ? { equals: brand, mode: 'insensitive' } : null,
        model: model ? { equals: model, mode: 'insensitive' } : null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `"${name}" isimli${brand ? ` (Marka: ${brand})` : ''}${model ? ` (Model: ${model})` : ''} ürün/hizmet zaten sistemde kayıtlı. Mükerrer kayıt oluşturulamaz.`,
      );
    }

    // 2. Otomatik Ürün Kodu Üretimi (Eğer girilmemişse sistem otomatik üretir)
    if (!code) {
      const typePrefix =
        dto.type === ProductType.SOFTWARE
          ? 'SW'
          : dto.type === ProductType.SERVICE
          ? 'SRV'
          : 'HW';
      const count = await this.prisma.product.count();
      code = `DT-${typePrefix}-${String(count + 1).padStart(4, '0')}`;

      // Çakışma kontrolü
      const existingCode = await this.prisma.product.findUnique({ where: { code } });
      if (existingCode) {
        code = `DT-${typePrefix}-${Date.now().toString().slice(-4)}`;
      }
    } else {
      // Kullanıcı elle kod girdiyse mükerrer kontrolü
      const existingCode = await this.prisma.product.findUnique({
        where: { code },
      });
      if (existingCode) {
        throw new ConflictException(`"${code}" kodlu ürün/hizmet zaten sistemde kayıtlı.`);
      }
    }

    return this.prisma.product.create({
      data: {
        name,
        brand,
        model,
        type: dto.type,
        code,
        description: dto.description?.trim() || null,
        unitPrice: DecimalUtil.formatMoney(dto.unitPrice),
        currency: dto.currency,
        taxRate: dto.taxRate ?? 20,
        imageUrl: dto.imageUrl || null,
        trackSerial: dto.trackSerial ?? false,
        trackMac: dto.trackMac ?? false,
        macRequired: dto.macRequired ?? false,
        customerWarrantyMonths: dto.customerWarrantyMonths ?? 24,
        supplierWarrantyMonths: dto.supplierWarrantyMonths ?? 24,
        minStockLevel: dto.minStockLevel ? DecimalUtil.formatMoney(dto.minStockLevel) : '0',
        unit: dto.unit || 'ADET',
        isActive: true,
      },
      include: {
        barcodes: true,
      },
    });
  }

  async findAll(query: ProductQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.brand) {
      where.brand = { contains: query.brand.trim(), mode: 'insensitive' };
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          barcodes: true,
        },
      }),
    ]);

    return {
      data,
      meta: {
        totalRowCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalRowCount / pageSize) || 1,
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        barcodes: true,
        stockLevels: {
          include: { warehouse: true },
        },
      },
    });
    if (!product) {
      throw new NotFoundException('Ürün veya hizmet bulunamadı.');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Ürün veya hizmet bulunamadı.');
    }

    const name = dto.name !== undefined ? dto.name.trim() : product.name;
    const brand = dto.brand !== undefined ? (dto.brand?.trim() || null) : product.brand;
    const model = dto.model !== undefined ? (dto.model?.trim() || null) : product.model;
    const code = dto.code !== undefined ? (dto.code?.trim() || null) : product.code;

    // Check duplicate if name/brand/model changed
    if (name !== product.name || brand !== product.brand || model !== product.model) {
      const existing = await this.prisma.product.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
          brand: brand ? { equals: brand, mode: 'insensitive' } : null,
          model: model ? { equals: model, mode: 'insensitive' } : null,
        },
      });
      if (existing) {
        throw new ConflictException('Bu isim, marka ve modele sahip başka bir ürün/hizmet zaten mevcut.');
      }
    }

    if (code && code !== product.code) {
      const existingCode = await this.prisma.product.findUnique({ where: { code } });
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(`"${code}" kodlu başka bir ürün/hizmet zaten mevcut.`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name,
        brand,
        model,
        type: dto.type ?? product.type,
        code,
        description: dto.description !== undefined ? dto.description?.trim() || null : product.description,
        unitPrice: dto.unitPrice ? DecimalUtil.formatMoney(dto.unitPrice) : product.unitPrice,
        currency: dto.currency ?? product.currency,
        taxRate: dto.taxRate ?? product.taxRate,
        imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : product.imageUrl,
        trackSerial: dto.trackSerial !== undefined ? dto.trackSerial : product.trackSerial,
        trackMac: dto.trackMac !== undefined ? dto.trackMac : product.trackMac,
        macRequired: dto.macRequired !== undefined ? dto.macRequired : product.macRequired,
        customerWarrantyMonths: dto.customerWarrantyMonths !== undefined ? dto.customerWarrantyMonths : product.customerWarrantyMonths,
        supplierWarrantyMonths: dto.supplierWarrantyMonths !== undefined ? dto.supplierWarrantyMonths : product.supplierWarrantyMonths,
        minStockLevel: dto.minStockLevel ? DecimalUtil.formatMoney(dto.minStockLevel) : product.minStockLevel,
        unit: dto.unit !== undefined ? dto.unit : product.unit,
      },
      include: {
        barcodes: true,
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Ürün veya hizmet bulunamadı.');
    }
    // Soft delete to preserve historical quote references
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Ürün Bazlı Satış Raporu ve İstatistikleri
   * Satışa dönüşmüş teklif kalemleri üzerinden ürün bazlı adet ve ciro hesaplar.
   */
  async getProductSalesSummary(): Promise<ProductSalesStatDto[]> {
    // Tüm satışları ve ilişkili teklif kalemlerini çek
    const sales = await this.prisma.sale.findMany({
      include: {
        quote: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    const statsMap = new Map<string, {
      productId: string;
      productName: string;
      brand?: string | null;
      model?: string | null;
      type: ProductType;
      totalSoldQuantity: number;
      totalRevenueDec: Decimal;
      salesCount: number;
    }>();

    for (const sale of sales) {
      if (!sale.quote?.items) continue;

      for (const item of sale.quote.items) {
        const key = item.productId || item.productName;
        const lineTotal = new Decimal(item.lineTotal.toString());
        const qty = item.quantity;

        const current = statsMap.get(key) || {
          productId: item.productId || key,
          productName: item.product?.name || item.productName,
          brand: item.product?.brand || item.brand || null,
          model: item.product?.model || item.model || null,
          type: item.product?.type || ProductType.PHYSICAL,
          totalSoldQuantity: 0,
          totalRevenueDec: new Decimal(0),
          salesCount: 0,
        };

        current.totalSoldQuantity += qty;
        current.totalRevenueDec = current.totalRevenueDec.plus(lineTotal);
        current.salesCount += 1;

        statsMap.set(key, current);
      }
    }

    return Array.from(statsMap.values()).map((stat) => ({
      productId: stat.productId,
      productName: stat.productName,
      brand: stat.brand,
      model: stat.model,
      type: stat.type,
      totalSoldQuantity: stat.totalSoldQuantity,
      totalRevenue: stat.totalRevenueDec.toFixed(2),
      salesCount: stat.salesCount,
    })).sort((a, b) => Number(b.totalRevenue) - Number(a.totalRevenue));
  }

  /**
   * Ürüne Yeni Barkod Ekle
   */
  async addBarcode(productId: string, barcodeStr: string, isDefault: boolean = false) {
    const product = await this.findOne(productId);
    const cleanBarcode = barcodeStr.trim();
    if (!cleanBarcode) {
      throw new BadRequestException('Geçerli bir barkod giriniz.');
    }

    const existing = await this.prisma.productBarcode.findUnique({
      where: { barcode: cleanBarcode },
      include: { product: true },
    });

    if (existing) {
      throw new ConflictException(
        `"${cleanBarcode}" barkodu zaten "${existing.product.name}" isimli ürüne tanımlı.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.productBarcode.updateMany({
          where: { productId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.productBarcode.create({
        data: {
          productId,
          barcode: cleanBarcode,
          isDefault,
        },
      });
    });
  }

  /**
   * Barkodu Sil
   */
  async removeBarcode(productId: string, barcodeId: string) {
    const barcode = await this.prisma.productBarcode.findFirst({
      where: { id: barcodeId, productId },
    });
    if (!barcode) {
      throw new NotFoundException('Barkod bulunamadı.');
    }

    await this.prisma.productBarcode.delete({
      where: { id: barcodeId },
    });

    return { success: true };
  }

  /**
   * Varsayılan Barkod Olarak Belirle
   */
  async setDefaultBarcode(productId: string, barcodeId: string) {
    const barcode = await this.prisma.productBarcode.findFirst({
      where: { id: barcodeId, productId },
    });
    if (!barcode) {
      throw new NotFoundException('Barkod bulunamadı.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productBarcode.updateMany({
        where: { productId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.productBarcode.update({
        where: { id: barcodeId },
        data: { isDefault: true },
      });
    });
  }
}
