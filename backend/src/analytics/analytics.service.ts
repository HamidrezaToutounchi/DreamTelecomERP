import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardSummaryResponseDto,
  DetailedReportsQueryDto,
  DetailedReportsResponseDto,
} from './dto/analytics.dto';
import { DecimalUtil } from '../common/utils/decimal.util';
import { QuoteStatus, LeadStatus, Role } from '../common/enums/crm.enums';
import Decimal from 'decimal.js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(): Promise<DashboardSummaryResponseDto> {
    // 1. Fetch active sales reps
    const reps = await this.prisma.user.findMany({
      where: { role: Role.SALES_REP, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });

    // 2. Fetch all sales with customer category
    const sales = await this.prisma.sale.findMany({
      select: {
        id: true,
        repId: true,
        totalAmount: true,
        isInvoiced: true,
        createdAt: true,
        customer: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // 3. Fetch all quotes
    const quotes = await this.prisma.quote.findMany({
      select: {
        id: true,
        repId: true,
        status: true,
        grandTotal: true,
      },
    });

    // 4. Fetch all leads
    const leads = await this.prisma.lead.findMany({
      select: {
        id: true,
        status: true,
      },
    });

    // Calculate Sales by Rep and Category
    const salesByRepMap: Record<string, { totalAmount: Decimal; count: number }> = {};
    const salesByCategoryMap: Record<string, { totalAmount: Decimal; count: number; color: string }> = {};

    let totalRevenueDec = new Decimal(0);
    let thisMonthRevenueDec = new Decimal(0);
    let thisMonthSalesCount = 0;
    let pendingInvoiceSalesAmountDec = new Decimal(0);
    let pendingInvoiceSalesCount = 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    for (const s of sales) {
      const amount = DecimalUtil.toDecimal(s.totalAmount);
      totalRevenueDec = totalRevenueDec.plus(amount);

      // Bu ay satışı mı?
      const saleDate = new Date(s.createdAt);
      if (saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth) {
        thisMonthRevenueDec = thisMonthRevenueDec.plus(amount);
        thisMonthSalesCount += 1;
      }

      if (!salesByRepMap[s.repId]) {
        salesByRepMap[s.repId] = { totalAmount: new Decimal(0), count: 0 };
      }
      salesByRepMap[s.repId].totalAmount = salesByRepMap[s.repId].totalAmount.plus(amount);
      salesByRepMap[s.repId].count += 1;

      // Kategori bazlı
      const catName = s.customer?.category?.name || 'Kategorisiz';
      const catColor = s.customer?.category?.color || '#004A93';
      if (!salesByCategoryMap[catName]) {
        salesByCategoryMap[catName] = { totalAmount: new Decimal(0), count: 0, color: catColor };
      }
      salesByCategoryMap[catName].totalAmount = salesByCategoryMap[catName].totalAmount.plus(amount);
      salesByCategoryMap[catName].count += 1;

      if (!s.isInvoiced) {
        pendingInvoiceSalesAmountDec = pendingInvoiceSalesAmountDec.plus(amount);
        pendingInvoiceSalesCount += 1;
      }
    }

    const salesByCategory = Object.entries(salesByCategoryMap).map(([categoryName, val]) => ({
      categoryName,
      color: val.color,
      totalSalesAmount: val.totalAmount.toFixed(2),
      salesCount: val.count,
    }));

    const salesByRep = reps.map((rep) => ({
      repId: rep.id,
      repName: rep.fullName,
      totalSalesAmount: (salesByRepMap[rep.id]?.totalAmount || new Decimal(0)).toFixed(2),
      salesCount: salesByRepMap[rep.id]?.count || 0,
    }));

    // Calculate Quotes by Rep
    const quotesByRepMap: Record<
      string,
      { total: number; approved: number; rejected: number; revised: number; draftOrSent: number }
    > = {};

    let openQuotesAmountDec = new Decimal(0);
    let totalQuotesCount = quotes.length;
    let approvedQuotesCount = 0;

    for (const q of quotes) {
      if (!quotesByRepMap[q.repId]) {
        quotesByRepMap[q.repId] = {
          total: 0,
          approved: 0,
          rejected: 0,
          revised: 0,
          draftOrSent: 0,
        };
      }
      quotesByRepMap[q.repId].total += 1;

      if (q.status === QuoteStatus.APPROVED) {
        quotesByRepMap[q.repId].approved += 1;
        approvedQuotesCount += 1;
      } else if (q.status === QuoteStatus.REJECTED) {
        quotesByRepMap[q.repId].rejected += 1;
      } else if (q.status === QuoteStatus.REVISED) {
        quotesByRepMap[q.repId].revised += 1;
      } else {
        // DRAFT or SENT
        quotesByRepMap[q.repId].draftOrSent += 1;
        openQuotesAmountDec = openQuotesAmountDec.plus(DecimalUtil.toDecimal(q.grandTotal));
      }
    }

    const quotesByRep = reps.map((rep) => {
      const q = quotesByRepMap[rep.id] || { total: 0, approved: 0, rejected: 0, revised: 0, draftOrSent: 0 };
      return {
        repId: rep.id,
        repName: rep.fullName,
        totalQuotesCount: q.total,
        approvedCount: q.approved,
        rejectedCount: q.rejected,
        revisedCount: q.revised,
        draftOrSentCount: q.draftOrSent,
      };
    });

    // Approval rate
    const quoteApprovalRate = totalQuotesCount > 0
      ? `${new Decimal(approvedQuotesCount).dividedBy(totalQuotesCount).times(100).toFixed(2)}%`
      : '0.00%';

    // Lead conversion rate
    const totalLeadsCount = leads.length;
    const convertedLeadsCount = leads.filter((l) => l.status === LeadStatus.CONVERTED).length;
    const leadConversionRate = totalLeadsCount > 0
      ? `${new Decimal(convertedLeadsCount).dividedBy(totalLeadsCount).times(100).toFixed(2)}%`
      : '0.00%';

    return {
      kpis: {
        totalRevenue: totalRevenueDec.toFixed(2),
        thisMonthSalesAmount: thisMonthRevenueDec.toFixed(2),
        thisMonthSalesCount,
        openQuotesAmount: openQuotesAmountDec.toFixed(2),
        quoteApprovalRate,
        pendingInvoiceSalesAmount: pendingInvoiceSalesAmountDec.toFixed(2),
        pendingInvoiceSalesCount,
        leadConversionRate,
      },
      salesByRep,
      salesByCategory,
      quotesByRep,
    };
  }

  async getDetailedReports(query: DetailedReportsQueryDto): Promise<DetailedReportsResponseDto> {
    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
    const hasDate = query.dateFrom || query.dateTo;

    // 1. Sales metrics
    const saleWhere: any = {};
    if (query.repId) saleWhere.repId = query.repId;
    if (query.isInvoiced !== undefined) saleWhere.isInvoiced = String(query.isInvoiced) === 'true';
    if (hasDate) saleWhere.createdAt = dateFilter;

    const sales = await this.prisma.sale.findMany({ where: saleWhere });
    let totalSalesVolumeDec = new Decimal(0);
    let invoicedCount = 0;
    let pendingInvoiceCount = 0;

    for (const s of sales) {
      totalSalesVolumeDec = totalSalesVolumeDec.plus(DecimalUtil.toDecimal(s.totalAmount));
      if (s.isInvoiced) invoicedCount++;
      else pendingInvoiceCount++;
    }

    // 2. Quote metrics
    const quoteWhere: any = {};
    if (query.repId) quoteWhere.repId = query.repId;
    if (query.quoteStatus) quoteWhere.status = query.quoteStatus;
    if (hasDate) quoteWhere.createdAt = dateFilter;

    const quotes = await this.prisma.quote.findMany({ where: quoteWhere });
    let totalQuoteAmountDec = new Decimal(0);
    let approvedQuotes = 0;
    let rejectedQuotes = 0;
    let revisedQuotes = 0;
    let draftQuotes = 0;
    let sentQuotes = 0;

    for (const q of quotes) {
      totalQuoteAmountDec = totalQuoteAmountDec.plus(DecimalUtil.toDecimal(q.grandTotal));
      if (q.status === QuoteStatus.APPROVED) approvedQuotes++;
      else if (q.status === QuoteStatus.REJECTED) rejectedQuotes++;
      else if (q.status === QuoteStatus.REVISED) revisedQuotes++;
      else if (q.status === QuoteStatus.DRAFT) draftQuotes++;
      else if (q.status === QuoteStatus.SENT) sentQuotes++;
    }

    const averageQuoteAmount = quotes.length > 0
      ? totalQuoteAmountDec.dividedBy(quotes.length).toFixed(2)
      : '0.00';

    // 3. Lead metrics
    const leadWhere: any = {};
    if (query.repId) leadWhere.assignedToId = query.repId;
    if (query.leadSource) leadWhere.source = query.leadSource;
    if (hasDate) leadWhere.createdAt = dateFilter;

    const leads = await this.prisma.lead.findMany({ where: leadWhere });
    let convertedLeads = 0;
    let lostLeads = 0;
    const leadsBySource: Record<string, number> = {};

    for (const l of leads) {
      if (l.status === LeadStatus.CONVERTED) convertedLeads++;
      if (l.status === LeadStatus.LOST) lostLeads++;
      leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1;
    }

    const conversionRate = leads.length > 0
      ? `${new Decimal(convertedLeads).dividedBy(leads.length).times(100).toFixed(2)}%`
      : '0.00%';

    return {
      period: {
        dateFrom: query.dateFrom || null,
        dateTo: query.dateTo || null,
      },
      salesMetrics: {
        totalSalesCount: sales.length,
        totalSalesVolume: totalSalesVolumeDec.toFixed(2),
        thisMonthSalesVolume: totalSalesVolumeDec.toFixed(2),
        invoicedCount,
        pendingInvoiceCount,
      },
      quoteMetrics: {
        totalQuotes: quotes.length,
        approvedQuotes,
        rejectedQuotes,
        revisedQuotes,
        draftQuotes,
        sentQuotes,
        averageQuoteAmount,
      },
      leadMetrics: {
        totalLeads: leads.length,
        convertedLeads,
        lostLeads,
        conversionRate,
        leadsBySource,
      },
    };
  }
}
