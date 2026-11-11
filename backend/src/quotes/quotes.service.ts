import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { PdfService } from './pdf.service';
import {
  CreateQuoteDto,
  UpdateQuoteStatusDto,
  ReviseQuoteDto,
  QuoteQueryDto,
} from './dto/quote.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role, QuoteStatus, Currency } from '../common/enums/crm.enums';
import { DecimalUtil } from '../common/utils/decimal.util';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    private pdfService: PdfService,
    private auditLogsService: AuditLogsService,
  ) {}

  private checkRepAccess(quote: { repId: string }, user: AuthenticatedUser) {
    if (user.role === Role.SALES_REP && quote.repId !== user.id) {
      throw new ForbiddenException('Bu teklife erişim yetkiniz bulunmamaktadır.');
    }
  }

  private async generateNextQuoteNumber(companyCode?: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = companyCode === 'TESCOM' ? `TS-${year}-` : `DT-${year}-`;

    const count = await this.prisma.quote.count({
      where: {
        quoteNumber: {
          startsWith: prefix,
        },
      },
    });

    const nextSeq = (count + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  async create(dto: CreateQuoteDto, user: AuthenticatedUser) {
    // Verify customer exists and user has access
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (user.role === Role.SALES_REP && customer.assignedToId !== user.id) {
      throw new ForbiddenException('Bu müşteri sizin portföyünüzde bulunmamaktadır.');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Teklifte en az bir ürün kalemi bulunmalıdır.');
    }

    // Şirket çözümlemesi (Dream veya Tescom)
    let companyId = dto.companyId;
    let company = null;
    if (companyId) {
      company = await this.prisma.company.findUnique({ where: { id: companyId } });
    }
    if (!company) {
      company = await this.prisma.company.findUnique({ where: { code: 'DREAM' } });
      companyId = company?.id;
    }

    const { subTotal, taxTotal, grandTotal, calculatedItems } = DecimalUtil.calculateQuoteTotals(dto.items);

    const quoteNumber = await this.generateNextQuoteNumber(company?.code);
    const validUntilDate = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        companyId,
        customerId: dto.customerId,
        repId: user.id,
        version: 1,
        status: QuoteStatus.DRAFT,
        validUntil: validUntilDate,
        currency: dto.currency || Currency.TRY,
        subTotal,
        taxTotal,
        grandTotal,
        notes: dto.notes,
        terms: dto.terms,
        items: {
          create: dto.items.map((item, index) => ({
            productId: item.productId || null,
            productName: item.productName,
            productCode: item.productCode,
            brand: item.brand,
            model: item.model,
            description: item.description,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPrice: DecimalUtil.formatMoney(item.unitPrice),
            discountRate: DecimalUtil.formatMoney(item.discountRate || 0),
            taxRate: item.taxRate ?? 20,
            lineTotal: calculatedItems[index].lineTotal,
          })),
        },
      },
      include: {
        company: true,
        customer: { select: { id: true, companyName: true, contactPerson: true, phone: true, email: true } },
        rep: { select: { id: true, fullName: true, email: true, phone: true } },
        items: true,
      },
    });

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      entity: 'QUOTE',
      entityId: quote.id,
      details: `"${quote.quoteNumber}" numaralı yeni teklif hazırlandı (Müşteri: ${quote.customer?.companyName || dto.customerId}, Tutar: ${quote.grandTotal} ${quote.currency}).`,
    });

    return quote;
  }

  async findAll(query: QuoteQueryDto, user: AuthenticatedUser) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.QuoteWhereInput = {};

    if (user.role === Role.SALES_REP) {
      where.repId = user.id;
    } else if (query.repId) {
      where.repId = query.repId;
    }

    if (query.status) {
      where.status = query.status as QuoteStatus;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
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
            { quoteNumber: { contains: search, mode: 'insensitive' } },
            { customer: { companyName: { contains: search, mode: 'insensitive' } } },
            { notes: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [totalRowCount, data] = await Promise.all([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: true,
          customer: { select: { id: true, companyName: true, contactPerson: true, phone: true, email: true } },
          rep: { select: { id: true, fullName: true, email: true, phone: true } },
          items: true,
          sales: { select: { id: true, createdAt: true, invoiceNumber: true } },
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
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        rep: { select: { id: true, fullName: true, email: true, phone: true } },
        items: true,
        sales: { select: { id: true, createdAt: true, invoiceNumber: true } },
        parentQuote: { select: { id: true, quoteNumber: true, version: true } },
        revisions: { select: { id: true, quoteNumber: true, version: true, status: true, grandTotal: true, createdAt: true } },
      },
    });

    if (!quote) {
      throw new NotFoundException('Teklif bulunamadı.');
    }

    this.checkRepAccess(quote, user);
    return quote;
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto, user: AuthenticatedUser) {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      throw new NotFoundException('Teklif bulunamadı.');
    }

    this.checkRepAccess(quote, user);

    if (quote.status === QuoteStatus.REVISED) {
      throw new BadRequestException('Revize edilmiş eski bir teklifin durumu değiştirilemez.');
    }

    if (dto.status === QuoteStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Teklif reddedilirken ret sebebi girilmesi zorunludur.');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === QuoteStatus.REJECTED ? dto.rejectionReason : null,
      },
      include: {
        company: true,
        customer: { select: { id: true, companyName: true, contactPerson: true, phone: true, email: true } },
        rep: { select: { id: true, fullName: true, email: true, phone: true } },
        items: true,
      },
    });

    // Notify sales rep via socket if status is approved or rejected
    this.eventsGateway.notifyQuoteStatusChanged(quote.repId, quote.quoteNumber, dto.status, dto.rejectionReason);

    await this.auditLogsService.log({
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
      action: 'STATUS_CHANGE',
      entity: 'QUOTE',
      entityId: id,
      details: `"${quote.quoteNumber}" teklif durumu "${dto.status}" olarak güncellendi.${dto.rejectionReason ? ` Ret Sebebi: ${dto.rejectionReason}` : ''}`,
    });

    return updated;
  }

  async revise(id: string, dto: ReviseQuoteDto, user: AuthenticatedUser) {
    const existingQuote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingQuote) {
      throw new NotFoundException('Revize edilecek teklif bulunamadı.');
    }

    this.checkRepAccess(existingQuote, user);

    // Siparişe dönüştürülmüş teklifin tekrar revize edilmesini engelle
    const existingSale = await this.prisma.sale.findUnique({
      where: { quoteId: id },
    });
    if (existingSale) {
      throw new BadRequestException('Siparişe dönüştürülmüş bir teklif tekrar revize edilemez.');
    }

    // 1. Mark existing quote as REVISED
    await this.prisma.quote.update({
      where: { id },
      data: { status: QuoteStatus.REVISED },
    });

    // 2. Prepare items for new revision
    const itemsSource = dto.items && dto.items.length > 0 ? dto.items : existingQuote.items.map((i) => ({
      productName: i.productName,
      productCode: i.productCode,
      description: i.description || undefined,
      imageUrl: i.imageUrl || undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
      discountRate: i.discountRate.toString(),
      taxRate: i.taxRate,
    }));

    const { subTotal, taxTotal, grandTotal, calculatedItems } = DecimalUtil.calculateQuoteTotals(itemsSource);

    const nextVersion = existingQuote.version + 1;
    // Derive base quote number without existing revision suffix
    const baseNumber = existingQuote.quoteNumber.split('-R')[0];
    const newQuoteNumber = `${baseNumber}-R${nextVersion - 1}`;

    const newQuote = await this.prisma.quote.create({
      data: {
        quoteNumber: newQuoteNumber,
        companyId: dto.companyId || existingQuote.companyId,
        customerId: existingQuote.customerId,
        repId: existingQuote.repId,
        version: nextVersion,
        parentQuoteId: existingQuote.id,
        status: QuoteStatus.DRAFT,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : existingQuote.validUntil,
        currency: dto.currency || (existingQuote.currency as Currency),
        subTotal,
        taxTotal,
        grandTotal,
        notes: dto.notes !== undefined ? dto.notes : existingQuote.notes,
        terms: dto.terms !== undefined ? dto.terms : existingQuote.terms,
        items: {
          create: itemsSource.map((item, index) => ({
            productId: (item as any).productId || null,
            productName: item.productName,
            productCode: item.productCode,
            brand: (item as any).brand,
            model: (item as any).model,
            description: item.description,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPrice: DecimalUtil.formatMoney(item.unitPrice),
            discountRate: DecimalUtil.formatMoney(item.discountRate || 0),
            taxRate: item.taxRate ?? 20,
            lineTotal: calculatedItems[index].lineTotal,
          })),
        },
      },
      include: {
        company: true,
        customer: { select: { id: true, companyName: true, contactPerson: true, phone: true, email: true } },
        rep: { select: { id: true, fullName: true, email: true, phone: true } },
        items: true,
      },
    });

    return newQuote;
  }

  async getPdfBuffer(id: string, user?: AuthenticatedUser): Promise<{ buffer: Buffer; quoteNumber: string }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        rep: { select: { id: true, fullName: true, email: true, phone: true } },
        items: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Teklif bulunamadı.');
    }

    if (user) {
      this.checkRepAccess(quote, user);
    }

    const buffer = await this.pdfService.generateQuotePdf(quote);
    return { buffer, quoteNumber: quote.quoteNumber };
  }
}
