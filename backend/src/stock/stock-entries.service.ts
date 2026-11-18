import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BarcodeService } from '../common/barcode/barcode.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreateStockEntryDto,
  CancelStockEntryDto,
  StockEntriesQueryParams,
} from './dto/stock-entry.dto';
import { StockEntryStatus, StockMovementType, SerialStatus, Prisma } from '@prisma/client';

@Injectable()
export class StockEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly barcodeService: BarcodeService,
  ) {}

  /**
   * Benzersiz Fiş Numarası Üret: GR-YYYY-NNNN
   */
  private async generateEntryNumber(year: number): Promise<string> {
    const prefix = `GR-${year}-`;
    const count = await this.prisma.stockEntry.count({
      where: {
        entryNumber: { startsWith: prefix },
      },
    });

    let nextNum = count + 1;
    let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    let exists = await this.prisma.stockEntry.findUnique({
      where: { entryNumber: candidate },
    });

    while (exists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
      exists = await this.prisma.stockEntry.findUnique({
        where: { entryNumber: candidate },
      });
    }

    return candidate;
  }

  /**
   * Mal Kabul / Stok Girişi Oluştur
   */
  async create(dto: CreateStockEntryDto, user: AuthenticatedUser) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('En az bir kalem eklenmelidir.');
    }

    // Depo kontrolü
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException('Seçilen depo bulunamadı.');
    }
    if (!warehouse.isActive) {
      throw new BadRequestException('Pasif durumdaki depoya mal kabul girişi yapılamaz.');
    }

    // Tedarikçi kontrolü (varsa)
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException('Seçilen tedarikçi bulunamadı.');
      }
      if (!supplier.isActive) {
        throw new BadRequestException('Pasif durumdaki tedarikçiden mal kabul yapılamaz.');
      }
    }

    const entryDate = dto.entryDate ? new Date(dto.entryDate) : new Date();
    const year = entryDate.getFullYear();

    // Kalemlerin ve serilerin ön kontrolü
    const productIds = dto.items.map((it) => it.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

    const allSerialsInPayload = new Set<string>();
    const allMacsInPayload = new Set<string>();

    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new NotFoundException(`Ürün (${item.productId}) katalogda bulunamadı.`);
      }
      if (!prod.isActive) {
        throw new BadRequestException(`"${prod.name}" ürünü pasif durumdadır.`);
      }

      if (prod.trackSerial) {
        if (!item.serials || item.serials.length !== Number(item.quantity)) {
          throw new BadRequestException(
            `"${prod.name}" ürünü seri takiplidir. Girilen miktar (${item.quantity}) ile seri sayısı (${item.serials?.length || 0}) eşit olmalıdır.`
          );
        }

        for (const s of item.serials) {
          const normSerial = s.serial?.trim().toUpperCase();
          if (!normSerial) {
            throw new BadRequestException(`"${prod.name}" için geçersiz seri numarası.`);
          }

          if (allSerialsInPayload.has(normSerial)) {
            throw new BadRequestException(`Aynı girişte mükerrer seri numarası bulundu: ${normSerial}`);
          }
          allSerialsInPayload.add(normSerial);

          // MAC Kontrolü
          if (prod.trackMac && prod.macRequired && !s.macAddress) {
            throw new BadRequestException(`"${prod.name}" için MAC adresi zorunludur.`);
          }

          if (s.macAddress) {
            const normMac = this.barcodeService.normalizeMacAddress(s.macAddress);
            if (!normMac) {
              throw new BadRequestException(`Geçersiz MAC adresi formatı: "${s.macAddress}". (Örn: AA:BB:CC:DD:EE:FF)`);
            }
            if (allMacsInPayload.has(normMac)) {
              throw new BadRequestException(`Aynı girişte mükerrer MAC adresi bulundu: ${normMac}`);
            }
            allMacsInPayload.add(normMac);
          }
        }
      }
    }

    // Veritabanında mükerrer seri / MAC kontrolü
    if (allSerialsInPayload.size > 0) {
      const existingSerials = await this.prisma.serialNumber.findMany({
        where: {
          serial: { in: Array.from(allSerialsInPayload) },
        },
      });

      for (const ex of existingSerials) {
        if (ex.status === SerialStatus.IN_STOCK) {
          throw new BadRequestException(
            `"${ex.serial}" seri numaralı ürün şu anda zaten depoda (${ex.warehouseId}) stoktadır.`
          );
        }
      }
    }

    if (allMacsInPayload.size > 0) {
      const macList = Array.from(allMacsInPayload);
      const existingMacs = await this.prisma.serialNumber.findMany({
        where: {
          OR: macList.map((m) => ({
            macAddress: { equals: m, mode: 'insensitive' },
          })),
        },
        include: {
          product: { select: { name: true } },
        },
      });

      if (existingMacs.length > 0) {
        const ex = existingMacs[0];
        throw new BadRequestException(
          `"${ex.macAddress}" MAC adresi daha önce sistemde kaydedilmiştir (Seri No: ${ex.serial}, Ürün: ${ex.product?.name || 'Cihaz'}). Aynı MAC adresi tekrar girilemez!`
        );
      }
    }

    // Tek $transaction içinde atomik kayıt
    const result = await this.prisma.$transaction(async (tx: any) => {
      const entryNumber = await this.generateEntryNumber(year);

      const stockEntry = await tx.stockEntry.create({
        data: {
          entryNumber,
          type: dto.type || 'PURCHASE',
          status: StockEntryStatus.COMPLETED,
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId || null,
          invoiceNumber: dto.invoiceNumber?.trim() || null,
          waybillNumber: dto.waybillNumber?.trim() || null,
          entryDate,
          description: dto.description?.trim() || null,
          documentUrl: dto.documentUrl?.trim() || null,
          documentName: dto.documentName?.trim() || null,
          createdById: user.id,
        },
      });

      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;
        const qty = new Prisma.Decimal(item.quantity);

        // 1. StockEntryItem kaydet
        await tx.stockEntryItem.create({
          data: {
            stockEntryId: stockEntry.id,
            productId: item.productId,
            quantity: qty,
            unitPrice: new Prisma.Decimal(item.unitPrice || 0),
            currency: item.currency || prod.currency || 'TRY',
          },
        });

        // 2. StockLevel güncelle / oluştur
        const existingLevel = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
        });

        const prevStock = existingLevel ? existingLevel.quantity : new Prisma.Decimal(0);
        const newStock = prevStock.add(qty);

        await tx.stockLevel.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
            },
          },
          update: { quantity: newStock },
          create: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
            quantity: newStock,
          },
        });

        // 3. Stok Hareketi (Movement) Kaydı
        await tx.stockMovement.create({
          data: {
            type: StockMovementType.ENTRY,
            productId: item.productId,
            targetWarehouseId: dto.warehouseId,
            quantity: qty,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'STOCK_ENTRY',
            referenceId: stockEntry.id,
            createdById: user.id,
            description: `Mal Kabul (${entryNumber}) - ${prod.name}`,
          },
        });

        // 4. Seri Numaralı Ürünler
        if (prod.trackSerial && item.serials) {
          const supplierWarrantyEnd = prod.supplierWarrantyMonths
            ? new Date(entryDate.getTime() + prod.supplierWarrantyMonths * 30 * 24 * 60 * 60 * 1000)
            : null;
          const customerWarrantyEnd = prod.customerWarrantyMonths
            ? new Date(entryDate.getTime() + prod.customerWarrantyMonths * 30 * 24 * 60 * 60 * 1000)
            : null;

          for (const s of item.serials) {
            const normSerial = s.serial.trim().toUpperCase();
            const normMac = s.macAddress ? this.barcodeService.normalizeMacAddress(s.macAddress) : null;

            const serialRecord = await tx.serialNumber.upsert({
              where: { serial: normSerial },
              update: {
                status: SerialStatus.IN_STOCK,
                warehouseId: dto.warehouseId,
                supplierId: dto.supplierId || null,
                stockEntryId: stockEntry.id,
                macAddress: normMac,
                supplierWarrantyEnd,
                customerWarrantyEnd,
              },
              create: {
                serial: normSerial,
                macAddress: normMac,
                productId: item.productId,
                status: SerialStatus.IN_STOCK,
                warehouseId: dto.warehouseId,
                supplierId: dto.supplierId || null,
                stockEntryId: stockEntry.id,
                supplierWarrantyEnd,
                customerWarrantyEnd,
              },
            });

            // Seri hareket kaydı
            await tx.stockMovement.create({
              data: {
                type: StockMovementType.ENTRY,
                productId: item.productId,
                serialId: serialRecord.id,
                targetWarehouseId: dto.warehouseId,
                quantity: new Prisma.Decimal(1),
                previousStock: prevStock,
                newStock: newStock,
                referenceType: 'STOCK_ENTRY',
                referenceId: stockEntry.id,
                createdById: user.id,
                description: `Seri Girişi: ${normSerial} (${entryNumber})`,
              },
            });
          }
        }
      }

      return stockEntry;
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'STOCK_ENTRY',
      entityId: result.id,
      details: `Mal Kabul girişi tamamlandı: Fiş No: ${result.entryNumber}, Depo: ${warehouse.name}`,
    });

    return this.findOne(result.id);
  }

  /**
   * Tüm Giriş Fişlerini Listele (Filtreleme & Sayfalama)
   */
  async findAll(query: StockEntriesQueryParams) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.StockEntryWhereInput = {};

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate || query.endDate) {
      where.entryDate = {};
      if (query.startDate) {
        where.entryDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.entryDate.lte = new Date(query.endDate);
      }
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { entryNumber: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
        { waybillNumber: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, totalRowCount] = await Promise.all([
      this.prisma.stockEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
          cancelledBy: { select: { id: true, fullName: true, email: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  brand: true,
                  model: true,
                  trackSerial: true,
                  trackMac: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: { serials: true },
          },
        },
      }),
      this.prisma.stockEntry.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRowCount / pageSize);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalRowCount,
        totalPages,
      },
    };
  }

  /**
   * Giriş Fişi Detayını Getir
   */
  async findOne(id: string) {
    const entry = await this.prisma.stockEntry.findUnique({
      where: { id },
      include: {
        warehouse: true,
        supplier: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
        cancelledBy: { select: { id: true, fullName: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                barcodes: true,
              },
            },
          },
        },
        serials: {
          orderBy: { serial: 'asc' },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Stok giriş fişi bulunamadı.');
    }

    return entry;
  }

  /**
   * Giriş Fişini İptal Et (Geri Al) — Silme Yok!
   */
  async cancel(id: string, dto: CancelStockEntryDto, user: AuthenticatedUser) {
    const entry: any = await this.findOne(id);

    if (entry.status === StockEntryStatus.CANCELLED) {
      throw new BadRequestException('Bu giriş fişi zaten iptal edilmiş.');
    }

    // Seri takipli ürünler kullanılmış mı kontrol et
    if (entry.serials && entry.serials.length > 0) {
      for (const s of entry.serials) {
        if (s.status !== SerialStatus.IN_STOCK || s.stockExitId !== null) {
          throw new BadRequestException(
            `"${s.serial}" seri numaralı ürün başka bir işlemde (sevkiyat vb.) kullanıldığı için bu giriş fişi iptal edilemez.`
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Stok Seviyelerini Ters Çevir
      for (const item of entry.items) {
        const qty = new Prisma.Decimal(item.quantity);
        const level = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: entry.warehouseId,
            },
          },
        });

        if (!level || level.quantity.lessThan(qty)) {
          throw new BadRequestException(
            `Depo stok seviyesi yetersiz olduğu için iptal yapılamaz. Mevcut: ${level?.quantity || 0}, Geri alınacak: ${qty}`
          );
        }

        const newStock = level.quantity.minus(qty);
        await tx.stockLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: entry.warehouseId,
            },
          },
          data: { quantity: newStock },
        });

        // İptal Ters Hareketi
        await tx.stockMovement.create({
          data: {
            type: StockMovementType.CANCEL_REVERSAL,
            productId: item.productId,
            sourceWarehouseId: entry.warehouseId,
            quantity: qty,
            previousStock: level.quantity,
            newStock: newStock,
            referenceType: 'STOCK_ENTRY',
            referenceId: entry.id,
            createdById: user.id,
            description: `Giriş Fişi İptali (${entry.entryNumber}) - Neden: ${dto.cancelReason}`,
          },
        });
      }

      // 2. Serileri İptal Durumuna Al
      if (entry.serials && entry.serials.length > 0) {
        const serialIds = entry.serials.map((s: any) => s.id);
        await tx.serialNumber.updateMany({
          where: { id: { in: serialIds } },
          data: {
            status: SerialStatus.SCRAPPED, // Stoktan düşüldü / İptal edildi
          },
        });
      }

      // 3. Fişi CANCELLED Yap
      await tx.stockEntry.update({
        where: { id },
        data: {
          status: StockEntryStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancelReason: dto.cancelReason.trim(),
        },
      });
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CANCEL',
      entity: 'STOCK_ENTRY',
      entityId: entry.id,
      details: `Stok giriş fişi iptal edildi: Fiş No: ${entry.entryNumber}. Gerekçe: ${dto.cancelReason}`,
    });

    return this.findOne(id);
  }
}
