import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, UpdateSaleDto, SaleQueryDto } from './dto/sale.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role, PaymentStatus, Currency } from '../common/enums/crm.enums';
import { DecimalUtil } from '../common/utils/decimal.util';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
  ) {}

  private checkRepAccess(sale: { repId: string }, user: AuthenticatedUser) {
    if (user.role === Role.SALES_REP && sale.repId !== user.id) {
      throw new ForbiddenException('Bu satış kaydına erişim yetkiniz bulunmamaktadır.');
    }
  }

  async create(dto: CreateSaleDto, user: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (user.role === Role.SALES_REP && customer.createdById !== user.id && customer.assignedToId !== user.id) {
      throw new ForbiddenException('Bu müşteri için satış kaydı oluşturma yetkiniz yok.');
    }

    // If quoteId is provided, verify it and prevent duplicate conversion
    if (dto.quoteId) {
      const quote = await this.prisma.quote.findUnique({ where: { id: dto.quoteId } });
      if (!quote) throw new NotFoundException('İlişkili teklif bulunamadı.');

      const existingSale = await this.prisma.sale.findUnique({ where: { quoteId: dto.quoteId } });
      if (existingSale) {
        throw new ConflictException(
          'Bu teklif zaten daha önce bir satışa dönüştürülmüştür! Bir teklif yalnızca bir defa satışa çevrilebilir.',
        );
      }
    }

    const totalAmount = DecimalUtil.formatMoney(dto.totalAmount);
    const totalDec = DecimalUtil.toDecimal(totalAmount);
    let paidDec = DecimalUtil.toDecimal(dto.paidAmount || 0);

    const paymentStatus = dto.paymentStatus || PaymentStatus.PENDING;
    if (paymentStatus === PaymentStatus.PAID) {
      paidDec = totalDec;
    } else if (paymentStatus === PaymentStatus.PENDING && !dto.paidAmount) {
      paidDec = DecimalUtil.toDecimal(0);
    }
    const remainingDec = totalDec.minus(paidDec);

    const sale = await this.prisma.sale.create({
      data: {
        quoteId: dto.quoteId,
        customerId: dto.customerId,
        repId: user.id,
        soldItemsSummary: dto.soldItemsSummary,
        serialOrMacNumbers: dto.serialOrMacNumbers || [],
        totalAmount,
        paidAmount: paidDec.toFixed(2),
        remainingAmount: remainingDec.isNegative() ? '0.00' : remainingDec.toFixed(2),
        currency: dto.currency || Currency.TRY,
        isInvoiced: dto.isInvoiced || false,
        invoiceNumber: dto.invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
        paymentStatus,
        notes: dto.notes,
      },
      include: {
        customer: { select: { id: true, companyName: true, taxNumber: true } },
        rep: { select: { id: true, fullName: true, email: true } },
        quote: { select: { id: true, quoteNumber: true, grandTotal: true } },
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CONVERT',
      entity: 'SALE',
      entityId: sale.id,
      details: `"${sale.customer?.companyName || dto.customerId}" için satış kaydı oluşturuldu (Teklif No: ${sale.quote?.quoteNumber || '-'}, Tutar: ${sale.totalAmount} ${sale.currency}).`,
    });

    return sale;
  }

  async findAll(query: SaleQueryDto, user: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.SaleWhereInput = {};

    if (user.role === Role.SALES_REP) {
      where.repId = user.id;
    } else if (query.repId) {
      where.repId = query.repId;
    }

    if (query.isInvoiced !== undefined) {
      where.isInvoiced = String(query.isInvoiced) === 'true';
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    if (query.search) {
      const search = query.search.trim();
      where.AND = [
        {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { soldItemsSummary: { contains: search, mode: 'insensitive' } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          customer: { select: { id: true, companyName: true, taxNumber: true } },
          rep: { select: { id: true, fullName: true, email: true } },
          quote: { select: { id: true, quoteNumber: true, grandTotal: true } },
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
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        rep: { select: { id: true, fullName: true, email: true } },
        quote: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Satış kaydı bulunamadı.');
    }

    this.checkRepAccess(sale, user);
    return sale;
  }

  async update(id: string, dto: UpdateSaleDto, user: AuthenticatedUser) {
    const sale = await this.prisma.sale.findUnique({ where: { id } });
    if (!sale) {
      throw new NotFoundException('Satış kaydı bulunamadı.');
    }

    this.checkRepAccess(sale, user);

    const data: any = { ...dto };
    const currentTotal = dto.totalAmount !== undefined ? DecimalUtil.toDecimal(dto.totalAmount) : DecimalUtil.toDecimal(sale.totalAmount);

    let currentPaid = dto.paidAmount !== undefined ? DecimalUtil.toDecimal(dto.paidAmount) : DecimalUtil.toDecimal(sale.paidAmount);
    const newStatus = dto.paymentStatus !== undefined ? dto.paymentStatus : sale.paymentStatus;

    if (newStatus === PaymentStatus.PAID) {
      currentPaid = currentTotal;
    } else if (newStatus === PaymentStatus.PENDING && dto.paidAmount === undefined) {
      currentPaid = DecimalUtil.toDecimal(0);
    }

    const currentRemaining = currentTotal.minus(currentPaid);

    data.totalAmount = currentTotal.toFixed(2);
    data.paidAmount = currentPaid.toFixed(2);
    data.remainingAmount = currentRemaining.isNegative() ? '0.00' : currentRemaining.toFixed(2);

    if (dto.invoiceDate !== undefined) {
      data.invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : null;
    }

    return this.prisma.sale.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, companyName: true, taxNumber: true } },
        rep: { select: { id: true, fullName: true, email: true } },
        quote: { select: { id: true, quoteNumber: true, grandTotal: true } },
      },
    });
  }
}
