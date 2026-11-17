import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { FaultPdfService } from './fault-pdf.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import {
  CreateFaultRecordDto,
  UpdateFaultStatusDto,
  FaultsQueryParams,
} from './dto/fault.dto';
import { FaultStatus, SerialStatus, Prisma } from '@prisma/client';

@Injectable()
export class FaultsService {
  private readonly logger = new Logger(FaultsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly faultPdfService: FaultPdfService,
  ) {}

  /**
   * Benzersiz Arıza Takip Numarası Üret: ARZ-YYYY-NNNN
   */
  private async generateFaultNumber(year: number): Promise<string> {
    const prefix = `ARZ-${year}-`;
    const count = await this.prisma.faultRecord.count({
      where: {
        faultNumber: { startsWith: prefix },
      },
    });

    let nextNum = count + 1;
    let candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
    let exists = await this.prisma.faultRecord.findUnique({
      where: { faultNumber: candidate },
    });

    while (exists) {
      nextNum++;
      candidate = `${prefix}${String(nextNum).padStart(4, '0')}`;
      exists = await this.prisma.faultRecord.findUnique({
        where: { faultNumber: candidate },
      });
    }

    return candidate;
  }

  /**
   * Yeni Arıza / Servis Kaydı Aç
   */
  async create(dto: CreateFaultRecordDto, user: AuthenticatedUser) {
    // 1. Seri kontrolü
    const serial = await this.prisma.serialNumber.findUnique({
      where: { id: dto.serialId },
      include: {
        product: true,
      },
    });

    if (!serial) {
      throw new NotFoundException(`Seri numarası kaydı bulunamadı (ID: ${dto.serialId}).`);
    }

    // 2. Garanti hesaplama
    const now = new Date();
    const underCustomerWarranty = serial.customerWarrantyEnd
      ? new Date(serial.customerWarrantyEnd) >= now
      : false;
    const underSupplierWarranty = serial.supplierWarrantyEnd
      ? new Date(serial.supplierWarrantyEnd) >= now
      : false;

    // 3. Müşteri belirleme
    const targetCustomerId = dto.customerId || serial.currentCustomerId || null;
    if (targetCustomerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: targetCustomerId },
      });
      if (!customer) {
        throw new NotFoundException(`Müşteri bulunamadı (ID: ${targetCustomerId}).`);
      }
    }

    const year = now.getFullYear();

    // 4. Atomik Transaction
    const record = await this.prisma.$transaction(async (tx) => {
      const faultNumber = await this.generateFaultNumber(year);

      // Seriyi IN_FAULT yap
      await tx.serialNumber.update({
        where: { id: serial.id },
        data: {
          status: SerialStatus.IN_FAULT,
        },
      });

      // Arıza kaydı oluştur
      const created = await tx.faultRecord.create({
        data: {
          faultNumber,
          serialId: serial.id,
          customerId: targetCustomerId,
          contactPerson: dto.contactPerson?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          reportedProblem: dto.reportedProblem.trim(),
          priority: dto.priority || 'MEDIUM',
          status: FaultStatus.RECEIVED,
          underCustomerWarranty,
          underSupplierWarranty,
          createdById: user.id,
        },
        include: {
          serial: {
            include: { product: true },
          },
          customer: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return created;
    });

    // 5. Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'FAULT',
      entityId: record.id,
      details: `Arıza kaydı açıldı: ${record.faultNumber}, Seri: ${serial.serial}, Ürün: ${serial.product.name}`,
    });

    return record;
  }

  /**
   * Arıza Listesi (Filtreleme & Sayfalama)
   */
  async findAll(query: FaultsQueryParams) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FaultRecordWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { faultNumber: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search, mode: 'insensitive' } },
        {
          serial: {
            OR: [
              { serial: { contains: search, mode: 'insensitive' } },
              { macAddress: { contains: search, mode: 'insensitive' } },
              { product: { name: { contains: search, mode: 'insensitive' } } },
              { product: { code: { contains: search, mode: 'insensitive' } } },
            ],
          },
        },
        {
          customer: {
            companyName: { contains: search, mode: 'insensitive' } },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.faultRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          serial: {
            include: { product: true },
          },
          customer: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
      this.prisma.faultRecord.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Tekil Arıza Kaydı Detayı (İşlem Geçmişi, Cihaz Yaşam Döngüsü ve Audit Loglar Dahil)
   */
  async findOne(id: string) {
    const record = await this.prisma.faultRecord.findFirst({
      where: {
        OR: [{ id }, { faultNumber: id }],
      },
      include: {
        serial: {
          include: {
            product: true,
            supplier: {
              select: { id: true, name: true, contactPerson: true, phone: true },
            },
            stockEntry: {
              select: {
                id: true,
                entryNumber: true,
                entryDate: true,
                type: true,
                supplier: { select: { name: true } },
              },
            },
            stockExit: {
              select: {
                id: true,
                exitNumber: true,
                exitDate: true,
                type: true,
                carrierCompany: true,
                trackingNumber: true,
                customer: { select: { companyName: true } },
              },
            },
          },
        },
        customer: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Arıza kaydı bulunamadı (ID/No: ${id}).`);
    }

    // Arıza işlem geçmişi (Audit Logs)
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'FAULT',
        entityId: record.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Bu cihaz için geçmiş diğer arıza kayıtları (Servis Tarihçesi)
    const previousFaults = await this.prisma.faultRecord.findMany({
      where: {
        serialId: record.serialId,
        id: { not: record.id },
      },
      select: {
        id: true,
        faultNumber: true,
        status: true,
        priority: true,
        reportedProblem: true,
        resolutionSummary: true,
        receivedDate: true,
        resolvedDate: true,
        createdAt: true,
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cihazın depo hareketleri (Stock Movements)
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        serialId: record.serialId,
      },
      include: {
        sourceWarehouse: { select: { name: true } },
        targetWarehouse: { select: { name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ...record,
      auditLogs,
      previousFaults,
      movements,
    };
  }

  /**
   * Arıza Statüsü & Teknisyen Notu Güncelleme
   */
  async updateStatus(id: string, dto: UpdateFaultStatusDto, user: AuthenticatedUser) {
    const record = await this.prisma.faultRecord.findUnique({
      where: { id },
      include: {
        serial: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Arıza kaydı bulunamadı (ID: ${id}).`);
    }

    const previousStatus = record.status;
    const isClosing =
      dto.status === FaultStatus.RESOLVED ||
      dto.status === FaultStatus.RETURNED_TO_CUSTOMER;

    const updated = await this.prisma.$transaction(async (tx) => {
      // Seri durum güncellemesi
      if (dto.status === FaultStatus.RETURNED_TO_CUSTOMER) {
        // Cihaz müşteriye geri verildi
        await tx.serialNumber.update({
          where: { id: record.serialId },
          data: {
            status: record.serial.currentCustomerId
              ? SerialStatus.SHIPPED
              : SerialStatus.IN_STOCK,
          },
        });
      } else if (dto.status === FaultStatus.SCRAPPED) {
        // Cihaz pert/hurdaya ayrıldı
        await tx.serialNumber.update({
          where: { id: record.serialId },
          data: {
            status: SerialStatus.SCRAPPED,
          },
        });
      } else if (dto.status === FaultStatus.REPLACED) {
        // Birebir değişim yapıldı, eski cihaz hurda/iade statüsüne çekilir
        await tx.serialNumber.update({
          where: { id: record.serialId },
          data: {
            status: SerialStatus.SCRAPPED,
          },
        });
      } else if (
        dto.status === FaultStatus.RECEIVED ||
        dto.status === FaultStatus.IN_INSPECTION ||
        dto.status === FaultStatus.WAITING_PARTS ||
        dto.status === FaultStatus.SENT_TO_SUPPLIER
      ) {
        // Serviste veya tedarikçide işlem görüyor
        await tx.serialNumber.update({
          where: { id: record.serialId },
          data: {
            status: SerialStatus.IN_FAULT,
          },
        });
      }

      // Arıza kaydı güncelleme
      const dataToUpdate: Prisma.FaultRecordUpdateInput = {
        status: dto.status,
      };

      if (dto.technicianNotes !== undefined) {
        dataToUpdate.technicianNotes = dto.technicianNotes?.trim() || null;
      }

      if (dto.resolutionSummary !== undefined) {
        dataToUpdate.resolutionSummary = dto.resolutionSummary?.trim() || null;
      }

      if (isClosing && !record.resolvedDate) {
        dataToUpdate.resolvedDate = new Date();
      }

      const res = await tx.faultRecord.update({
        where: { id },
        data: dataToUpdate,
        include: {
          serial: {
            include: { product: true },
          },
          customer: true,
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      return res;
    });

    // Audit Log
    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      entity: 'FAULT',
      entityId: id,
      details: `Arıza durumu güncellendi: ${previousStatus} -> ${dto.status}. Teknisyen notu: ${dto.technicianNotes || '-'}`,
    });

    return updated;
  }

  /**
   * PDF Servis Kabul / Arıza Fişi Üretimi
   */
  async getPdfBuffer(id: string): Promise<{ buffer: Buffer; faultNumber: string }> {
    const fault = await this.findOne(id);
    const buffer = await this.faultPdfService.generateFaultSlip(fault);
    return {
      buffer,
      faultNumber: fault.faultNumber,
    };
  }
}
