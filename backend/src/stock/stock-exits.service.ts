import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreateStockExitDto,
  ApproveStockExitDto,
  RejectStockExitDto,
  ShipStockExitDto,
  CancelStockExitDto,
  StockExitsQueryParams,
  AvailableSerialsQueryParams,
} from './dto/stock-exit.dto';
import {
  StockExitStatus,
  StockExitType,
  StockMovementType,
  SerialStatus,
  ApprovalStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class StockExitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Benzersiz Fiş Numarası Üret: CK-YYYY-NNNN
   */
  private async generateExitNumber(year: number): Promise<string> {
    const prefix = `CK-${year}-`;
    const count = await this.prisma.stockExit.count({
      where: {
        exitNumber: { startsWith: prefix },
      },
    });

    let nextNum = count + 1;
    let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    let exists = await this.prisma.stockExit.findUnique({
      where: { exitNumber: candidate },
    });

    while (exists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
      exists = await this.prisma.stockExit.findUnique({
        where: { exitNumber: candidate },
      });
    }

    return candidate;
  }

  /**
   * Depodaki Kullanılabilir (IN_STOCK) Serileri Listele
   */
  async getAvailableSerials(query: AvailableSerialsQueryParams) {
    const where: Prisma.SerialNumberWhereInput = {
      productId: query.productId,
      warehouseId: query.warehouseId,
      status: SerialStatus.IN_STOCK,
    };

    if (query.search) {
      const s = query.search.trim().toUpperCase();
      where.OR = [
        { serial: { contains: s, mode: 'insensitive' } },
        { macAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    return this.prisma.serialNumber.findMany({
      where,
      take: 100,
      orderBy: { serial: 'asc' },
    });
  }

  /**
   * Stok Çıkış / Sevkiyat Talebi Oluştur
   */
  async create(dto: CreateStockExitDto, user: AuthenticatedUser) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('En az bir çıkış kalemi eklenmelidir.');
    }

    // Depo kontrolü
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException('Çıkış yapılacak depo bulunamadı.');
    }
    if (!warehouse.isActive) {
      throw new BadRequestException('Pasif durumdaki depodan stok çıkışı yapılamaz.');
    }

    // Müşteri kontrolü (Satış Sevkiyatı ise zorunlu)
    const exitType = dto.type || StockExitType.SALE_SHIPMENT;
    let customer: any = null;
    if (exitType === StockExitType.SALE_SHIPMENT) {
      if (!dto.customerId) {
        throw new BadRequestException('Müşteri satış sevkiyatında müşteri seçilmesi zorunludur.');
      }
      customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('Seçilen müşteri bulunamadı.');
      }
    } else if (dto.customerId) {
      customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
    }

    const exitDate = dto.exitDate ? new Date(dto.exitDate) : new Date();
    const year = exitDate.getFullYear();

    // Kalemlerin ve stok seviyelerinin kontrolü
    const productIds = dto.items.map((it) => it.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

    const allRequestedSerials = new Set<string>();

    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new NotFoundException(`Ürün (${item.productId}) katalogda bulunamadı.`);
      }
      if (!prod.isActive) {
        throw new BadRequestException(`"${prod.name}" ürünü pasif durumdadır.`);
      }

      // Stok seviyesi kontrolü
      const stockLevel = await this.prisma.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });

      const currentQty = stockLevel ? Number(stockLevel.quantity) : 0;
      if (currentQty < Number(item.quantity)) {
        throw new BadRequestException(
          `"${prod.name}" için depodaki mevcut stok yetersiz. Mevcut: ${currentQty}, Talep edilen: ${item.quantity}`
        );
      }

      // Seri no takipli ürün kontrolü
      if (prod.trackSerial) {
        if (!item.serials || item.serials.length !== Number(item.quantity)) {
          throw new BadRequestException(
            `"${prod.name}" ürünü seri takiplidir. Çıkış miktarı (${item.quantity}) kadar seri numarası seçilmelidir.`
          );
        }

        for (const s of item.serials) {
          const normSerial = s.trim().toUpperCase();
          if (allRequestedSerials.has(normSerial)) {
            throw new BadRequestException(`Aynı çıkış talebinde mükerrer seri numarası bulundu: ${normSerial}`);
          }
          allRequestedSerials.add(normSerial);
        }
      }
    }

    // Seçilen serilerin depoda ve IN_STOCK durumda olduğunu doğrula
    if (allRequestedSerials.size > 0) {
      const serialRecords = await this.prisma.serialNumber.findMany({
        where: {
          serial: { in: Array.from(allRequestedSerials) },
          warehouseId: dto.warehouseId,
        },
      });

      const serialMap = new Map<string, any>(serialRecords.map((r: any) => [r.serial, r]));

      for (const s of allRequestedSerials) {
        const record = serialMap.get(s);
        if (!record) {
          throw new BadRequestException(
            `"${s}" seri numaralı ürün seçilen depoda (${warehouse.name}) bulunamadı.`
          );
        }
        if (record.status !== SerialStatus.IN_STOCK) {
          throw new BadRequestException(
            `"${s}" seri numarası şu anda çıkışa uygun değil (Durum: ${record.status}).`
          );
        }
      }
    }

    // Onay ayarlarını kontrol et
    const approvalSettings = await this.prisma.approvalSetting.findMany({
      where: { isActive: true },
      orderBy: { step: 'asc' },
    });

    const hasApprovalSteps = approvalSettings.length > 0;
    const initialStatus = hasApprovalSteps ? StockExitStatus.PENDING_APPROVAL : StockExitStatus.APPROVED;

    const result = await this.prisma.$transaction(async (tx: any) => {
      const exitNumber = await this.generateExitNumber(year);

      const stockExit = await tx.stockExit.create({
        data: {
          exitNumber,
          type: exitType,
          status: initialStatus,
          warehouseId: dto.warehouseId,
          customerId: dto.customerId || null,
          waybillNumber: dto.waybillNumber?.trim() || null,
          carrierCompany: dto.carrierCompany?.trim() || null,
          trackingNumber: dto.trackingNumber?.trim() || null,
          recipientPerson: dto.recipientPerson?.trim() || customer?.contactPerson || null,
          recipientPhone: dto.recipientPhone?.trim() || customer?.phone || null,
          deliveryAddress: dto.deliveryAddress?.trim() || customer?.address || null,
          exitDate,
          description: dto.description?.trim() || null,
          documentUrl: dto.documentUrl?.trim() || null,
          documentName: dto.documentName?.trim() || null,
          createdById: user.id,
        },
      });

      // Kalemleri kaydet
      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;
        await tx.stockExitItem.create({
          data: {
            stockExitId: stockExit.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice || 0),
            currency: item.currency || prod.currency || 'TRY',
          },
        });
      }

      // Serileri REZERVED durumuna al
      if (allRequestedSerials.size > 0) {
        await tx.serialNumber.updateMany({
          where: { serial: { in: Array.from(allRequestedSerials) } },
          data: {
            status: SerialStatus.RESERVED,
            stockExitId: stockExit.id,
          },
        });
      }

      // Onay adımları varsa StockExitApproval oluştur
      if (hasApprovalSteps) {
        for (const setting of approvalSettings) {
          await tx.stockExitApproval.create({
            data: {
              stockExitId: stockExit.id,
              step: setting.step,
              roleId: setting.roleId || null,
              approverId: setting.userId || null,
              status: ApprovalStatus.PENDING,
            },
          });
        }
      }

      return stockExit;
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'STOCK_EXIT',
      entityId: result.id,
      details: `Stok çıkış talebi oluşturuldu: Fiş No: ${result.exitNumber}, Tür: ${result.type}, Depo: ${warehouse.name}`,
    });

    return this.findOne(result.id);
  }

  /**
   * Çıkış Fişini Onayla (Sıralı Onay Mekanizması)
   */
  async approve(id: string, dto: ApproveStockExitDto, user: AuthenticatedUser) {
    const exit: any = await this.findOne(id);

    if (exit.status !== StockExitStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Yalnızca onay bekleyen çıkış fişleri onaylanabilir.');
    }

    const approvals: any[] = exit.approvals || [];
    const pendingApproval = approvals.find((a) => a.status === ApprovalStatus.PENDING);

    if (!pendingApproval) {
      throw new BadRequestException('Bu çıkış fişi için bekleyen onay adımı bulunamadı.');
    }

    // Yetki kontrolü: Kullanıcı yönetici mi veya atanmış onaycı mı?
    const isManager = user.role === 'SALES_MANAGER' || user.isSuperAdmin;
    const isAssigned = pendingApproval.approverId === user.id || pendingApproval.roleId === user.appRoleId;

    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Bu onay adımını onaylama yetkiniz bulunmamaktadır.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      // Mevcut adımı APPROVED yap
      await tx.stockExitApproval.update({
        where: { id: pendingApproval.id },
        data: {
          status: ApprovalStatus.APPROVED,
          approverId: user.id,
          actionDate: new Date(),
          note: dto.note?.trim() || null,
        },
      });

      // Kalan bekleyen adım var mı kontrol et
      const remainingPending = approvals.filter(
        (a) => a.id !== pendingApproval.id && a.status === ApprovalStatus.PENDING
      );

      if (remainingPending.length === 0) {
        // Tüm adımlar tamamlandı -> Fiş APPROVED durumuna geçer (Sevk Edilebilir)
        await tx.stockExit.update({
          where: { id },
          data: { status: StockExitStatus.APPROVED },
        });
      }
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'APPROVE',
      entity: 'STOCK_EXIT',
      entityId: exit.id,
      details: `Stok çıkışı onaylandı: Fiş No: ${exit.exitNumber}, Adım: ${pendingApproval.step}`,
    });

    return this.findOne(id);
  }

  /**
   * Çıkış Fişini Reddet
   */
  async reject(id: string, dto: RejectStockExitDto, user: AuthenticatedUser) {
    const exit: any = await this.findOne(id);

    if (exit.status !== StockExitStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Yalnızca onay bekleyen çıkış fişleri reddedilebilir.');
    }

    // Yetki kontrolü: Kullanıcı yönetici mi veya atanmış onaycı mı?
    const isManager = user.role === 'SALES_MANAGER' || user.isSuperAdmin;
    const isAssigned = exit.approvals?.some(
      (a: any) =>
        (a.approverId === user.id || a.roleId === user.appRoleId) &&
        a.status === ApprovalStatus.PENDING
    );

    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Bu çıkış fişini reddetme yetkiniz bulunmamaktadır.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      // Bekleyen onay adımlarını REJECTED yap
      await tx.stockExitApproval.updateMany({
        where: { stockExitId: id, status: ApprovalStatus.PENDING },
        data: {
          status: ApprovalStatus.REJECTED,
          approverId: user.id,
          actionDate: new Date(),
          note: dto.note.trim(),
        },
      });

      // Fişi CANCELLED yap
      await tx.stockExit.update({
        where: { id },
        data: {
          status: StockExitStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: user.id,
          cancelReason: `Reddedildi: ${dto.note.trim()}`,
        },
      });

      // Rezerve serileri IN_STOCK durumuna geri al
      if (exit.serials && exit.serials.length > 0) {
        const serialIds = exit.serials.map((s: any) => s.id);
        await tx.serialNumber.updateMany({
          where: { id: { in: serialIds } },
          data: {
            status: SerialStatus.IN_STOCK,
            stockExitId: null,
          },
        });
      }
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'REJECT',
      entity: 'STOCK_EXIT',
      entityId: exit.id,
      details: `Stok çıkışı reddedildi: Fiş No: ${exit.exitNumber}. Gerekçe: ${dto.note}`,
    });

    return this.findOne(id);
  }

  /**
   * Sevkiyatı Tamamla / Sevk Et (Fiziksel Stok Düşüşü)
   */
  async ship(id: string, dto: ShipStockExitDto, user: AuthenticatedUser) {
    const exit: any = await this.findOne(id);

    if (exit.status === StockExitStatus.SHIPPED) {
      throw new BadRequestException('Bu çıkış fişi zaten sevk edilmiştir.');
    }

    if (exit.status === StockExitStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş bir çıkış fişi sevk edilemez.');
    }

    // Normalde APPROVED olmalı; yönetici/superAdmin ise PENDING_APPROVAL iken de sevk edebilsin (bypass)
    if (exit.status === StockExitStatus.PENDING_APPROVAL) {
      const isManager = user.role === 'SALES_MANAGER' || user.isSuperAdmin;
      if (!isManager) {
        throw new BadRequestException('Bu çıkış fişi henüz onaylanmamıştır.');
      }
    }

    await this.prisma.$transaction(async (tx: any) => {
      // 1. Stok Seviyelerini Düşür
      for (const item of exit.items) {
        const qty = new Prisma.Decimal(item.quantity);
        const stockLevel = await tx.stockLevel.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: exit.warehouseId,
            },
          },
        });

        if (!stockLevel || stockLevel.quantity.lessThan(qty)) {
          throw new BadRequestException(
            `Depo stok seviyesi yetersiz olduğu için sevkiyat yapılamaz. Mevcut: ${stockLevel?.quantity || 0}, Gerekli: ${qty}`
          );
        }

        const newStock = stockLevel.quantity.minus(qty);
        await tx.stockLevel.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: exit.warehouseId,
            },
          },
          data: { quantity: newStock },
        });

        // Stok Hareketi (Çıkış) Kaydı
        await tx.stockMovement.create({
          data: {
            type: StockMovementType.EXIT,
            productId: item.productId,
            sourceWarehouseId: exit.warehouseId,
            quantity: qty,
            previousStock: stockLevel.quantity,
            newStock: newStock,
            referenceType: 'STOCK_EXIT',
            referenceId: exit.id,
            createdById: user.id,
            description: `Stok Sevkiyatı (${exit.exitNumber}) - ${item.product?.name || ''}`,
          },
        });
      }

      // 2. Seri Numaralı Ürünleri SHIPPED Yap ve Müşteriye Bağla
      if (exit.serials && exit.serials.length > 0) {
        const serialIds = exit.serials.map((s: any) => s.id);
        await tx.serialNumber.updateMany({
          where: { id: { in: serialIds } },
          data: {
            status: SerialStatus.SHIPPED,
            currentCustomerId: exit.customerId || null,
          },
        });

        // Her seri için hareket kaydı
        for (const s of exit.serials) {
          await tx.stockMovement.create({
            data: {
              type: StockMovementType.EXIT,
              productId: s.productId,
              serialId: s.id,
              sourceWarehouseId: exit.warehouseId,
              quantity: new Prisma.Decimal(1),
              previousStock: new Prisma.Decimal(1),
              newStock: new Prisma.Decimal(0),
              referenceType: 'STOCK_EXIT',
              referenceId: exit.id,
              createdById: user.id,
              description: `Seri Çıkışı: ${s.serial} (${exit.exitNumber})`,
            },
          });
        }
      }

      // 3. Fiş Durumunu SHIPPED Yap ve Sevkiyat Alanlarını Güncelle
      await tx.stockExit.update({
        where: { id },
        data: {
          status: StockExitStatus.SHIPPED,
          shippedAt: new Date(),
          ...(dto.waybillNumber ? { waybillNumber: dto.waybillNumber.trim() } : {}),
          ...(dto.carrierCompany ? { carrierCompany: dto.carrierCompany.trim() } : {}),
          ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber.trim() } : {}),
          ...(dto.recipientPerson ? { recipientPerson: dto.recipientPerson.trim() } : {}),
          ...(dto.recipientPhone ? { recipientPhone: dto.recipientPhone.trim() } : {}),
          ...(dto.deliveryAddress ? { deliveryAddress: dto.deliveryAddress.trim() } : {}),
          ...(dto.documentUrl ? { documentUrl: dto.documentUrl.trim() } : {}),
          ...(dto.documentName ? { documentName: dto.documentName.trim() } : {}),
        },
      });
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'SHIP',
      entity: 'STOCK_EXIT',
      entityId: exit.id,
      details: `Stok sevkiyatı tamamlandı: Fiş No: ${exit.exitNumber}, Kargo: ${dto.carrierCompany || exit.carrierCompany || '-'}`,
    });

    return this.findOne(id);
  }

  /**
   * Kargo / Taşıyıcı ve Takip Numarası Bilgilerini Güncelle (1 gün sonra geldiğinde)
   */
  async updateShipping(id: string, dto: any, user: AuthenticatedUser) {
    const exit = await this.findOne(id);
    await this.prisma.stockExit.update({
      where: { id },
      data: {
        ...(dto.carrierCompany !== undefined ? { carrierCompany: dto.carrierCompany?.trim() || null } : {}),
        ...(dto.trackingNumber !== undefined ? { trackingNumber: dto.trackingNumber?.trim() || null } : {}),
        ...(dto.waybillNumber !== undefined ? { waybillNumber: dto.waybillNumber?.trim() || null } : {}),
        ...(dto.recipientPerson !== undefined ? { recipientPerson: dto.recipientPerson?.trim() || null } : {}),
        ...(dto.recipientPhone !== undefined ? { recipientPhone: dto.recipientPhone?.trim() || null } : {}),
        ...(dto.deliveryAddress !== undefined ? { deliveryAddress: dto.deliveryAddress?.trim() || null } : {}),
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'STOCK_EXIT',
      entityId: id,
      details: `Kargo takip ve sevk bilgileri güncellendi: Takip No: ${dto.trackingNumber || '-'}, Kargo: ${dto.carrierCompany || '-'}`,
    });

    return this.findOne(id);
  }

  /**
   * Çıkış Fişini İptal Et (Geri Al) — Silme Yok!
   */
  async cancel(id: string, dto: CancelStockExitDto, user: AuthenticatedUser) {
    const exit: any = await this.findOne(id);

    if (exit.status === StockExitStatus.CANCELLED) {
      throw new BadRequestException('Bu çıkış fişi zaten iptal edilmiş.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      // Eğer daha önce SHIPPED olmuşsa, stok seviyelerini geri artır ve ters hareket kaydet
      if (exit.status === StockExitStatus.SHIPPED) {
        for (const item of exit.items) {
          const qty = new Prisma.Decimal(item.quantity);
          const stockLevel = await tx.stockLevel.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: exit.warehouseId,
              },
            },
          });

          const prevStock = stockLevel ? stockLevel.quantity : new Prisma.Decimal(0);
          const newStock = prevStock.add(qty);

          await tx.stockLevel.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: exit.warehouseId,
              },
            },
            update: { quantity: newStock },
            create: {
              productId: item.productId,
              warehouseId: exit.warehouseId,
              quantity: newStock,
            },
          });

          // İptal Ters Hareketi
          await tx.stockMovement.create({
            data: {
              type: StockMovementType.CANCEL_REVERSAL,
              productId: item.productId,
              targetWarehouseId: exit.warehouseId,
              quantity: qty,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'STOCK_EXIT',
              referenceId: exit.id,
              createdById: user.id,
              description: `Sevkiyat İptali (${exit.exitNumber}) - Neden: ${dto.cancelReason}`,
            },
          });
        }
      }

      // Serileri tekrar IN_STOCK yap, rezervasyonu / müşteriyi kaldır
      if (exit.serials && exit.serials.length > 0) {
        const serialIds = exit.serials.map((s: any) => s.id);
        await tx.serialNumber.updateMany({
          where: { id: { in: serialIds } },
          data: {
            status: SerialStatus.IN_STOCK,
            stockExitId: null,
            currentCustomerId: null,
          },
        });
      }

      // Fişi CANCELLED yap
      await tx.stockExit.update({
        where: { id },
        data: {
          status: StockExitStatus.CANCELLED,
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
      entity: 'STOCK_EXIT',
      entityId: exit.id,
      details: `Stok çıkış fişi iptal edildi: Fiş No: ${exit.exitNumber}. Gerekçe: ${dto.cancelReason}`,
    });

    return this.findOne(id);
  }

  /**
   * Çıkış Fişlerini Listele (Filtreleme & Sayfalama)
   */
  async findAll(query: StockExitsQueryParams) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.StockExitWhereInput = {};

    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate || query.endDate) {
      where.exitDate = {};
      if (query.startDate) {
        where.exitDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.exitDate.lte = new Date(query.endDate);
      }
    }
    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { exitNumber: { contains: s, mode: 'insensitive' } },
        { waybillNumber: { contains: s, mode: 'insensitive' } },
        { trackingNumber: { contains: s, mode: 'insensitive' } },
        { carrierCompany: { contains: s, mode: 'insensitive' } },
        { recipientPerson: { contains: s, mode: 'insensitive' } },
        { customer: { companyName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [data, totalRowCount] = await Promise.all([
      this.prisma.stockExit.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          customer: { select: { id: true, companyName: true, phone: true, contactPerson: true } },
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
          serials: {
            select: {
              id: true,
              serial: true,
              macAddress: true,
              status: true,
              productId: true,
              customerWarrantyEnd: true,
              supplierWarrantyEnd: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  brand: true,
                  model: true,
                },
              },
            },
            orderBy: { serial: 'asc' },
          },
          approvals: {
            orderBy: { step: 'asc' },
            include: {
              approver: { select: { id: true, fullName: true, email: true } },
            },
          },
          _count: {
            select: { serials: true },
          },
        },
      }),
      this.prisma.stockExit.count({ where }),
    ]);

    const [roles, settings] = await Promise.all([
      this.prisma.appRole.findMany({ select: { id: true, name: true } }),
      this.prisma.approvalSetting.findMany({ select: { step: true, name: true, roleId: true, userId: true } }),
    ]);
    const roleMap = new Map(roles.map((r: any) => [r.id, r.name]));
    const settingMap = new Map(settings.map((s: any) => [s.step, s]));

    const enrichedData = data.map((exit: any) => ({
      ...exit,
      approvals: (exit.approvals || []).map((ap: any) => {
        const setting = settingMap.get(ap.step);
        const roleName = ap.roleId ? roleMap.get(ap.roleId) : undefined;
        return {
          ...ap,
          name: setting?.name || `Adım ${ap.step}`,
          roleName,
          role: ap.roleId ? { id: ap.roleId, name: roleName } : null,
        };
      }),
    }));

    const totalPages = Math.ceil(totalRowCount / pageSize);

    return {
      data: enrichedData,
      meta: {
        page,
        pageSize,
        totalRowCount,
        totalPages,
      },
    };
  }

  /**
   * Çıkış Fişi Detayını Getir
   */
  async findOne(id: string) {
    const exit = await this.prisma.stockExit.findUnique({
      where: { id },
      include: {
        warehouse: true,
        customer: true,
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
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
                brand: true,
                model: true,
              },
            },
          },
        },
        approvals: {
          orderBy: { step: 'asc' },
          include: {
            approver: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!exit) {
      throw new NotFoundException('Stok çıkış fişi bulunamadı.');
    }

    const [roles, settings] = await Promise.all([
      this.prisma.appRole.findMany({ select: { id: true, name: true } }),
      this.prisma.approvalSetting.findMany({ select: { step: true, name: true, roleId: true, userId: true } }),
    ]);
    const roleMap = new Map(roles.map((r: any) => [r.id, r.name]));
    const settingMap = new Map(settings.map((s: any) => [s.step, s]));

    return {
      ...exit,
      approvals: (exit.approvals || []).map((ap: any) => {
        const setting = settingMap.get(ap.step);
        const roleName = ap.roleId ? roleMap.get(ap.roleId) : undefined;
        return {
          ...ap,
          name: setting?.name || `Adım ${ap.step}`,
          roleName,
          role: ap.roleId ? { id: ap.roleId, name: roleName } : null,
        };
      }),
    };
  }
}
