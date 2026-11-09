import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customer.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role, LeadStatus, CustomerType } from '../common/enums/crm.enums';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private checkRepAccess(customer: { createdById: string; assignedToId: string }, user: AuthenticatedUser) {
    if (user.role === Role.SALES_REP) {
      if (customer.createdById !== user.id && customer.assignedToId !== user.id) {
        throw new ForbiddenException('Bu müşteri kaydına erişim yetkiniz bulunmamaktadır.');
      }
    }
  }

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    const assignedToId = user.role === Role.SALES_MANAGER ? (dto.assignedToId || user.id) : user.id;

    // 1. Kategori zorunluluk kontrolü (Kategorisiz müşteri girilemez)
    if (!dto.categoryId || !dto.categoryId.trim()) {
      throw new BadRequestException('Müşteri kategorisi seçilmesi zorunludur.');
    }
    const categoryExists = await this.prisma.customerCategory.findUnique({
      where: { id: dto.categoryId.trim() },
    });
    if (!categoryExists) {
      throw new BadRequestException('Seçilen müşteri kategorisi sistemde bulunamadı.');
    }

    // 2. Telefon zorunluluk kontrolü
    if (!dto.phone || !dto.phone.trim()) {
      throw new BadRequestException('Müşteri telefon numarası zorunludur.');
    }

    // 3. Adres zorunluluk kontrolü
    if (!dto.address || !dto.address.trim()) {
      throw new BadRequestException('Müşteri açık adresi zorunludur.');
    }

    // 4. Kurumsal müşteride E-posta zorunluluk kontrolü
    const customerType = dto.type || CustomerType.CORPORATE;
    if (customerType === CustomerType.CORPORATE) {
      if (!dto.email || !dto.email.trim()) {
        throw new BadRequestException('Kurumsal müşteriler için e-posta adresi girilmesi zorunludur.');
      }
    }

    // 5. Kurumsal ve Bayi müşteriler için Vergi Numarası zorunluluk kontrolü
    if (customerType === CustomerType.CORPORATE || customerType === CustomerType.DEALER) {
      if (!dto.taxNumber || !dto.taxNumber.trim()) {
        throw new BadRequestException('Kurumsal ve Bayi müşteriler için Vergi Numarası girilmesi zorunludur.');
      }
    }

    // 6. Mükerrer Telefon Kontrolü (Sistem genelinde mükerrer kayıt engeli)
    const existingPhone = await this.prisma.customer.findFirst({
      where: { phone: dto.phone.trim() },
    });
    if (existingPhone) {
      throw new ConflictException(
        `Bu telefon numarası (${dto.phone.trim()}) ile kayıtlı müşteri zaten mevcut: "${existingPhone.companyName}".`,
      );
    }

    // 7. Mükerrer Vergi Numarası Kontrolü
    if (dto.taxNumber && dto.taxNumber.trim()) {
      const existingTax = await this.prisma.customer.findFirst({
        where: { taxNumber: dto.taxNumber.trim() },
      });
      if (existingTax) {
        throw new ConflictException(
          `Bu vergi numarası (${dto.taxNumber.trim()}) ile kayıtlı müşteri zaten mevcut: "${existingTax.companyName}".`,
        );
      }
    }

    // LeadId kontrolü
    let existingLead: any = null;
    if (dto.leadId) {
      existingLead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } });
      if (!existingLead) {
        throw new NotFoundException('Belirtilen lead kaydı bulunamadı.');
      }
      if (user.role === Role.SALES_REP && existingLead.createdById !== user.id && existingLead.assignedToId !== user.id) {
        throw new ForbiddenException('Bu lead üzerinde işlem yapma yetkiniz yok.');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        type: customerType,
        companyName: dto.companyName.trim(),
        categoryId: dto.categoryId.trim(),
        taxNumber: dto.taxNumber ? dto.taxNumber.trim() : null,
        taxOffice: dto.taxOffice ? dto.taxOffice.trim() : null,
        contactPerson: dto.contactPerson.trim(),
        phone: dto.phone.trim(),
        email: dto.email ? dto.email.trim() : null,
        address: dto.address.trim(),
        leadId: dto.leadId || null,
        assignedToId,
        createdById: user.id,
      },
      include: {
        category: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    // If converted from lead, update lead status and transfer all timeline interactions
    if (dto.leadId) {
      await this.prisma.lead.update({
        where: { id: dto.leadId },
        data: {
          status: LeadStatus.CONVERTED,
          lastActionAt: new Date(),
        },
      });

      // Lead zamanında kaydedilen tüm etkileşimleri (not, telefon, toplantı) yeni müşteriye aktar
      await this.prisma.interaction.updateMany({
        where: { leadId: dto.leadId },
        data: { customerId: customer.id },
      });

      // Müşteri timeline'ına dönüşüm hareketini not olarak düş
      await this.prisma.interaction.create({
        data: {
          customerId: customer.id,
          leadId: dto.leadId,
          userId: user.id,
          type: 'NOTE' as any,
          contactedPerson: customer.contactPerson,
          summary: `Potansiyel Müşteri (Lead) resmi müşteriye dönüştürüldü.${existingLead?.notes ? `\nLead Aşamasındaki Not: ${existingLead.notes}` : ''}`,
        },
      });

      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'CONVERT',
        entity: 'LEAD',
        entityId: dto.leadId,
        details: `"${customer.companyName}" leadi resmi müşteriye dönüştürüldü. Müşteri ID: ${customer.id}`,
      });
    } else {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'CREATE',
        entity: 'CUSTOMER',
        entityId: customer.id,
        details: `"${customer.companyName}" isimli yeni müşteri kartı açıldı (Kategori: ${categoryExists.name}).`,
      });
    }

    return customer;
  }

  async findAll(query: CustomerQueryDto, user: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.CustomerWhereInput = {};

    if (user.role === Role.SALES_REP) {
      where.OR = [{ createdById: user.id }, { assignedToId: user.id }];
    } else if (query.repId) {
      where.assignedToId = query.repId;
    }

    if (query.customerType) {
      where.type = query.customerType;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const search = query.search.trim();
      const searchConditions: Prisma.CustomerWhereInput[] = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { taxNumber: { contains: search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          assignedTo: { select: { id: true, fullName: true, email: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
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

  async findOne(id: string, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
        lead: true,
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            rep: { select: { id: true, fullName: true } },
            items: true,
          },
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          include: {
            rep: { select: { id: true, fullName: true } },
          },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    this.checkRepAccess(customer, user);
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    this.checkRepAccess(customer, user);

    if (user.role === Role.SALES_REP && dto.assignedToId && dto.assignedToId !== customer.assignedToId) {
      throw new ForbiddenException('Satış temsilcileri müşteri atamasını değiştiremez.');
    }

    if (dto.phone && dto.phone.trim() !== customer.phone) {
      const existingPhone = await this.prisma.customer.findFirst({
        where: { phone: dto.phone.trim(), id: { not: id } },
      });
      if (existingPhone) {
        throw new ConflictException(`Bu telefon numarası (${dto.phone.trim()}) başka bir müşteride kayıtlı.`);
      }
    }

    if (dto.taxNumber && dto.taxNumber.trim() && dto.taxNumber.trim() !== customer.taxNumber) {
      const existingTax = await this.prisma.customer.findFirst({
        where: { taxNumber: dto.taxNumber.trim(), id: { not: id } },
      });
      if (existingTax) {
        throw new ConflictException(`Bu vergi numarası (${dto.taxNumber.trim()}) başka bir müşteride kayıtlı.`);
      }
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: { id },
      data: dto,
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (dto.assignedToId && dto.assignedToId !== customer.assignedToId) {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'REASSIGN',
        entity: 'CUSTOMER',
        entityId: id,
        details: `"${customer.companyName}" müşterisinin temsilcisi "${updatedCustomer.assignedTo?.fullName || dto.assignedToId}" olarak değiştirildi.`,
      });
    } else {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        action: 'UPDATE',
        entity: 'CUSTOMER',
        entityId: id,
        details: `"${customer.companyName}" müşteri bilgileri güncellendi.`,
      });
    }

    return updatedCustomer;
  }
}
