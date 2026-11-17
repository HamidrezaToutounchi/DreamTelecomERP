import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardSummaryResponseDto,
  DetailedReportsQueryDto,
  DetailedReportsResponseDto,
} from './dto/analytics.dto';
import { DecimalUtil } from '../common/utils/decimal.util';
import { QuoteStatus, LeadStatus, Role } from '../common/enums/crm.enums';
import { ExchangeRateService } from '../common/services/exchange-rate.service';
import Decimal from 'decimal.js';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  async getDashboardSummary(companyId?: string): Promise<DashboardSummaryResponseDto> {
    // 0. TCMB Güncel USD Kurunu Çek (Önbellekten anında gelir, bekletmez)
    const { usdRate } = this.exchangeRateService.getUsdRate();
    const usdRateDec = new Decimal(usdRate);

    const saleWhere: any = {};
    const quoteWhere: any = {};
    if (companyId) {
      saleWhere.quote = { companyId };
      quoteWhere.companyId = companyId;
    }

    // Tüm DB sorgularını eşzamanlı (paralel) çalıştır - performansı 10 kat hızlandırır
    const [reps, sales, quotes, leads, companies, stockLevels, pendingExitsCount] = await Promise.all([
      // 1. Tüm aktif kullanıcılar (Yöneticiler + Satış Temsilcileri)
      this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, role: true },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      }),
      // 2. Satışlar
      this.prisma.sale.findMany({
        where: saleWhere,
        select: {
          id: true,
          repId: true,
          totalAmount: true,
          currency: true,
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
      }),
      // 3. Teklifler
      this.prisma.quote.findMany({
        where: quoteWhere,
        select: {
          id: true,
          repId: true,
          companyId: true,
          status: true,
          grandTotal: true,
          currency: true,
          version: true,
          parentQuoteId: true,
          revisions: { select: { id: true } },
        },
      }),
      // 4. Tüm leadler
      this.prisma.lead.findMany({
        select: {
          id: true,
          status: true,
        },
      }),
      // 5. Şirketler (Dream Telecom & Tescom Telecom)
      this.prisma.company.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      // 6. Depo Stok Seviyeleri ve Ürün Fiyatları
      this.prisma.stockLevel.findMany({
        include: {
          product: {
            select: {
              id: true,
              unitPrice: true,
              currency: true,
              minStockLevel: true,
            },
          },
        },
      }),
      // 7. Onay Bekleyen Kargo / Sevkiyat Sayısı
      this.prisma.stockExit.count({
        where: { status: 'PENDING_APPROVAL' },
      }),
    ]);

    // Stok Envanter Değeri ve Miktarları Hesaplama
    let totalStockValueTryDec = new Decimal(0);
    let totalStockValueUsdDec = new Decimal(0);
    let totalStockQuantity = 0;
    let criticalStockCount = 0;
    const uniqueProductsSet = new Set<string>();

    for (const sl of (stockLevels as any[]) || []) {
      const qty = Number(sl.quantity || 0);
      if (qty <= 0) continue;

      totalStockQuantity += qty;
      uniqueProductsSet.add(sl.productId);

      const uPrice = new Decimal(sl.product?.unitPrice || 0);
      const lineTotal = uPrice.times(qty);

      if (sl.product?.currency === 'USD') {
        totalStockValueUsdDec = totalStockValueUsdDec.plus(lineTotal);
        totalStockValueTryDec = totalStockValueTryDec.plus(lineTotal.times(usdRateDec));
      } else {
        totalStockValueTryDec = totalStockValueTryDec.plus(lineTotal);
        totalStockValueUsdDec = totalStockValueUsdDec.plus(lineTotal.dividedBy(usdRateDec));
      }

      const minLevel = Number(sl.product?.minStockLevel || 0);
      if (minLevel > 0 && qty <= minLevel) {
        criticalStockCount++;
      }
    }

    // Calculate Sales by Rep and Category
    const salesByRepMap: Record<string, { totalAmount: Decimal; count: number }> = {};
    const salesByCategoryMap: Record<string, { totalAmount: Decimal; count: number; color: string }> = {};

    let totalRevenueDec = new Decimal(0);
    let totalRevenueUsdDec = new Decimal(0);
    let thisMonthRevenueDec = new Decimal(0);
    let thisMonthRevenueUsdDec = new Decimal(0);
    let thisMonthSalesCount = 0;
    let pendingInvoiceSalesAmountDec = new Decimal(0);
    let pendingInvoiceSalesAmountUsdDec = new Decimal(0);
    let pendingInvoiceSalesCount = 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    for (const s of sales) {
      const originalAmount = DecimalUtil.toDecimal(s.totalAmount);
      // Kur dönüşümü: Eğer USD ise TRY karşılığı = tutar * kur, USD karşılığı = tutar
      // Eğer TRY ise TRY karşılığı = tutar, USD karşılığı = tutar / kur
      const amountInTry = s.currency === 'USD' ? originalAmount.times(usdRateDec) : originalAmount;
      const amountInUsd = s.currency === 'USD' ? originalAmount : originalAmount.dividedBy(usdRateDec);

      totalRevenueDec = totalRevenueDec.plus(amountInTry);
      totalRevenueUsdDec = totalRevenueUsdDec.plus(amountInUsd);

      // Bu ay satışı mı?
      const saleDate = new Date(s.createdAt);
      if (saleDate.getFullYear() === currentYear && saleDate.getMonth() === currentMonth) {
        thisMonthRevenueDec = thisMonthRevenueDec.plus(amountInTry);
        thisMonthRevenueUsdDec = thisMonthRevenueUsdDec.plus(amountInUsd);
        thisMonthSalesCount += 1;
      }

      if (!salesByRepMap[s.repId]) {
        salesByRepMap[s.repId] = { totalAmount: new Decimal(0), count: 0 };
      }
      salesByRepMap[s.repId].totalAmount = salesByRepMap[s.repId].totalAmount.plus(amountInTry);
      salesByRepMap[s.repId].count += 1;

      // Kategori bazlı
      const catName = s.customer?.category?.name || 'Kategorisiz';
      const catColor = s.customer?.category?.color || '#004A93';
      if (!salesByCategoryMap[catName]) {
        salesByCategoryMap[catName] = { totalAmount: new Decimal(0), count: 0, color: catColor };
      }
      salesByCategoryMap[catName].totalAmount = salesByCategoryMap[catName].totalAmount.plus(amountInTry);
      salesByCategoryMap[catName].count += 1;

      if (!s.isInvoiced) {
        pendingInvoiceSalesAmountDec = pendingInvoiceSalesAmountDec.plus(amountInTry);
        pendingInvoiceSalesAmountUsdDec = pendingInvoiceSalesAmountUsdDec.plus(amountInUsd);
        pendingInvoiceSalesCount += 1;
      }
    }

    const salesByCategory = Object.entries(salesByCategoryMap).map(([categoryName, val]) => ({
      categoryName,
      color: val.color,
      totalSalesAmount: val.totalAmount.toFixed(2),
      salesCount: val.count,
    }));

    const salesByRep = reps.map((rep) => {
      const salesTry = salesByRepMap[rep.id]?.totalAmount || new Decimal(0);
      const salesUsd = salesTry.dividedBy(usdRateDec);
      return {
        repId: rep.id,
        repName: rep.fullName,
        totalSalesAmount: salesTry.toFixed(2),
        totalSalesAmountUsd: salesUsd.toFixed(2),
        salesCount: salesByRepMap[rep.id]?.count || 0,
      };
    });

    // Calculate Quotes by Company (Dream vs Tescom)
    const dreamCompany = companies.find((c) => c.code === 'DREAM') || companies[0];
    const companyQuotesMap: Record<
      string,
      {
        totalCount: number;
        amountTry: Decimal;
        amountUsd: Decimal;
        approved: number;
        rejected: number;
        revised: number;
        draftOrSent: number;
      }
    > = {};

    for (const c of companies) {
      companyQuotesMap[c.id] = {
        totalCount: 0,
        amountTry: new Decimal(0),
        amountUsd: new Decimal(0),
        approved: 0,
        rejected: 0,
        revised: 0,
        draftOrSent: 0,
      };
    }

    // Calculate Quotes by Rep
    const quotesByRepMap: Record<
      string,
      {
        total: number;
        totalAmountTry: Decimal;
        totalAmountUsd: Decimal;
        approved: number;
        approvedAmountTry: Decimal;
        approvedAmountUsd: Decimal;
        rejected: number;
        revised: number;
        draftOrSent: number;
        openAmountTry: Decimal;
        openAmountUsd: Decimal;
      }
    > = {};

    let openQuotesAmountDec = new Decimal(0);
    let openQuotesAmountUsdDec = new Decimal(0);
    let totalQuotesCount = 0;
    let approvedQuotesCount = 0;

    for (const q of quotes) {
      // Bir teklif; status'ü REVISED ise VEYA alt revizyonu (revisions) mevcutsa üst/tarihsel revizyondur (superseded).
      const isSuperseded = q.status === QuoteStatus.REVISED || Boolean((q as any).revisions && (q as any).revisions.length > 0);

      const qTotal = DecimalUtil.toDecimal(q.grandTotal);
      const qInTry = q.currency === 'USD' ? qTotal.times(usdRateDec) : qTotal;
      const qInUsd = q.currency === 'USD' ? qTotal : qTotal.dividedBy(usdRateDec);

      const targetCompanyId = q.companyId || dreamCompany?.id;

      if (!quotesByRepMap[q.repId]) {
        quotesByRepMap[q.repId] = {
          total: 0,
          totalAmountTry: new Decimal(0),
          totalAmountUsd: new Decimal(0),
          approved: 0,
          approvedAmountTry: new Decimal(0),
          approvedAmountUsd: new Decimal(0),
          rejected: 0,
          revised: 0,
          draftOrSent: 0,
          openAmountTry: new Decimal(0),
          openAmountUsd: new Decimal(0),
        };
      }

      if (isSuperseded) {
        // Tarihsel revizyon: mükerrer aktif hacim yaratmaması için Açık Teklif tutarına veya aktif hacme ASLA eklenmez
        quotesByRepMap[q.repId].revised += 1;
        if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
          companyQuotesMap[targetCompanyId].revised += 1;
        }
      } else {
        // Yalnızca aktif / güncel teklifler hacim ve oranlara dahil edilir
        totalQuotesCount += 1;
        quotesByRepMap[q.repId].total += 1;
        quotesByRepMap[q.repId].totalAmountTry = quotesByRepMap[q.repId].totalAmountTry.plus(qInTry);
        quotesByRepMap[q.repId].totalAmountUsd = quotesByRepMap[q.repId].totalAmountUsd.plus(qInUsd);

        if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
          companyQuotesMap[targetCompanyId].totalCount += 1;
          companyQuotesMap[targetCompanyId].amountTry = companyQuotesMap[targetCompanyId].amountTry.plus(qInTry);
          companyQuotesMap[targetCompanyId].amountUsd = companyQuotesMap[targetCompanyId].amountUsd.plus(qInUsd);
        }

        if (q.status === QuoteStatus.APPROVED) {
          quotesByRepMap[q.repId].approved += 1;
          quotesByRepMap[q.repId].approvedAmountTry = quotesByRepMap[q.repId].approvedAmountTry.plus(qInTry);
          quotesByRepMap[q.repId].approvedAmountUsd = quotesByRepMap[q.repId].approvedAmountUsd.plus(qInUsd);
          approvedQuotesCount += 1;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
            companyQuotesMap[targetCompanyId].approved += 1;
          }
        } else if (q.status === QuoteStatus.REJECTED) {
          quotesByRepMap[q.repId].rejected += 1;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
            companyQuotesMap[targetCompanyId].rejected += 1;
          }
        } else {
          // DRAFT or SENT (Karar Aşamasındaki Gerçek Açık Teklifler)
          quotesByRepMap[q.repId].draftOrSent += 1;
          quotesByRepMap[q.repId].openAmountTry = quotesByRepMap[q.repId].openAmountTry.plus(qInTry);
          quotesByRepMap[q.repId].openAmountUsd = quotesByRepMap[q.repId].openAmountUsd.plus(qInUsd);
          openQuotesAmountDec = openQuotesAmountDec.plus(qInTry);
          openQuotesAmountUsdDec = openQuotesAmountUsdDec.plus(qInUsd);
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
            companyQuotesMap[targetCompanyId].draftOrSent += 1;
          }
        }
      }
    }

    const quotesByCompany = companies.map((comp) => {
      const stats = companyQuotesMap[comp.id] || {
        totalCount: 0,
        amountTry: new Decimal(0),
        amountUsd: new Decimal(0),
        approved: 0,
        rejected: 0,
        revised: 0,
        draftOrSent: 0,
      };
      return {
        companyId: comp.id,
        companyCode: comp.code,
        companyName: comp.name,
        totalQuotesCount: stats.totalCount,
        totalAmountTry: stats.amountTry.toFixed(2),
        totalAmountUsd: stats.amountUsd.toFixed(2),
        approvedCount: stats.approved,
        rejectedCount: stats.rejected,
        revisedCount: stats.revised,
        draftOrSentCount: stats.draftOrSent,
      };
    });

    const quotesByRep = reps.map((rep) => {
      const q = quotesByRepMap[rep.id] || {
        total: 0,
        totalAmountTry: new Decimal(0),
        totalAmountUsd: new Decimal(0),
        approved: 0,
        approvedAmountTry: new Decimal(0),
        approvedAmountUsd: new Decimal(0),
        rejected: 0,
        revised: 0,
        draftOrSent: 0,
        openAmountTry: new Decimal(0),
        openAmountUsd: new Decimal(0),
      };
      return {
        repId: rep.id,
        repName: rep.fullName,
        totalQuotesCount: q.total,
        totalQuoteAmountTry: q.totalAmountTry.toFixed(2),
        totalQuoteAmountUsd: q.totalAmountUsd.toFixed(2),
        approvedCount: q.approved,
        approvedAmountTry: q.approvedAmountTry.toFixed(2),
        approvedAmountUsd: q.approvedAmountUsd.toFixed(2),
        rejectedCount: q.rejected,
        revisedCount: q.revised,
        draftOrSentCount: q.draftOrSent,
        openAmountTry: q.openAmountTry.toFixed(2),
        openAmountUsd: q.openAmountUsd.toFixed(2),
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
        totalRevenueUsd: totalRevenueUsdDec.toFixed(2),
        thisMonthSalesAmount: thisMonthRevenueDec.toFixed(2),
        thisMonthSalesAmountUsd: thisMonthRevenueUsdDec.toFixed(2),
        thisMonthSalesCount,
        openQuotesAmount: openQuotesAmountDec.toFixed(2),
        openQuotesAmountUsd: openQuotesAmountUsdDec.toFixed(2),
        usdRate: usdRateDec.toFixed(4),
        quoteApprovalRate,
        pendingInvoiceSalesAmount: pendingInvoiceSalesAmountDec.toFixed(2),
        pendingInvoiceSalesAmountUsd: pendingInvoiceSalesAmountUsdDec.toFixed(2),
        pendingInvoiceSalesCount,
        leadConversionRate,
        totalStockValueTry: totalStockValueTryDec.toFixed(2),
        totalStockValueUsd: totalStockValueUsdDec.toFixed(2),
        totalStockQuantity,
        totalStockProductsCount: uniqueProductsSet.size,
        pendingExitsCount,
        criticalStockCount,
      },
      salesByRep,
      salesByCategory,
      quotesByRep,
      quotesByCompany,
    };
  }

  async getDetailedReports(query: DetailedReportsQueryDto): Promise<DetailedReportsResponseDto> {
    const { usdRate } = this.exchangeRateService.getUsdRate();
    const usdRateDec = new Decimal(usdRate);

    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
    const hasDate = query.dateFrom || query.dateTo;

    // 1. Sales filters
    const saleWhere: any = {};
    if (query.repId) saleWhere.repId = query.repId;
    if (query.isInvoiced !== undefined) saleWhere.isInvoiced = String(query.isInvoiced) === 'true';
    if (hasDate) saleWhere.createdAt = dateFilter;
    if (query.companyId) {
      saleWhere.quote = { companyId: query.companyId };
    }

    // 2. Quote filters
    const quoteWhere: any = {};
    if (query.repId) quoteWhere.repId = query.repId;
    if (query.quoteStatus) quoteWhere.status = query.quoteStatus;
    if (hasDate) quoteWhere.createdAt = dateFilter;
    if (query.companyId) {
      quoteWhere.companyId = query.companyId;
    }

    // 3. Lead filters
    const leadWhere: any = {};
    if (query.repId) leadWhere.assignedToId = query.repId;
    if (query.leadSource) leadWhere.source = query.leadSource;
    if (hasDate) leadWhere.createdAt = dateFilter;

    // Paralel sorgulama - bekleme süresini sıfıra indirir
    const [sales, quotes, leads, companies] = await Promise.all([
      this.prisma.sale.findMany({ where: saleWhere }),
      this.prisma.quote.findMany({
        where: quoteWhere,
        select: {
          id: true,
          companyId: true,
          status: true,
          grandTotal: true,
          currency: true,
          version: true,
          parentQuoteId: true,
          revisions: { select: { id: true } },
        },
      }),
      this.prisma.lead.findMany({ where: leadWhere }),
      this.prisma.company.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    // 1. Sales metrics
    let totalSalesVolumeDec = new Decimal(0);
    let totalSalesVolumeUsdDec = new Decimal(0);
    let invoicedCount = 0;
    let pendingInvoiceCount = 0;

    for (const s of sales) {
      const originalAmount = DecimalUtil.toDecimal(s.totalAmount);
      const amountInTry = s.currency === 'USD' ? originalAmount.times(usdRateDec) : originalAmount;
      const amountInUsd = s.currency === 'USD' ? originalAmount : originalAmount.dividedBy(usdRateDec);

      totalSalesVolumeDec = totalSalesVolumeDec.plus(amountInTry);
      totalSalesVolumeUsdDec = totalSalesVolumeUsdDec.plus(amountInUsd);
      if (s.isInvoiced) invoicedCount++;
      else pendingInvoiceCount++;
    }

    // 2. Quote metrics & Company Breakdown
    let totalQuoteAmountDec = new Decimal(0);
    let approvedQuotes = 0;
    let rejectedQuotes = 0;
    let revisedQuotes = 0;
    let draftQuotes = 0;
    let sentQuotes = 0;

    const dreamCompany = companies.find((c) => c.code === 'DREAM') || companies[0];
    const companyQuotesMap: Record<
      string,
      {
        totalCount: number;
        amountTry: Decimal;
        amountUsd: Decimal;
        approved: number;
        rejected: number;
        revised: number;
        draftOrSent: number;
      }
    > = {};

    for (const c of companies) {
      companyQuotesMap[c.id] = {
        totalCount: 0,
        amountTry: new Decimal(0),
        amountUsd: new Decimal(0),
        approved: 0,
        rejected: 0,
        revised: 0,
        draftOrSent: 0,
      };
    }

    let activeQuotesCount = 0;

    for (const q of quotes) {
      const isSuperseded = q.status === QuoteStatus.REVISED || Boolean((q as any).revisions && (q as any).revisions.length > 0);
      const qTotal = DecimalUtil.toDecimal(q.grandTotal);
      const qInTry = q.currency === 'USD' ? qTotal.times(usdRateDec) : qTotal;
      const qInUsd = q.currency === 'USD' ? qTotal : qTotal.dividedBy(usdRateDec);

      const targetCompanyId = q.companyId || dreamCompany?.id;

      if (isSuperseded) {
        revisedQuotes++;
        if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
          companyQuotesMap[targetCompanyId].revised += 1;
        }
      } else {
        activeQuotesCount++;
        totalQuoteAmountDec = totalQuoteAmountDec.plus(qInTry);

        if (targetCompanyId && companyQuotesMap[targetCompanyId]) {
          companyQuotesMap[targetCompanyId].totalCount += 1;
          companyQuotesMap[targetCompanyId].amountTry = companyQuotesMap[targetCompanyId].amountTry.plus(qInTry);
          companyQuotesMap[targetCompanyId].amountUsd = companyQuotesMap[targetCompanyId].amountUsd.plus(qInUsd);
        }

        if (q.status === QuoteStatus.APPROVED) {
          approvedQuotes++;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) companyQuotesMap[targetCompanyId].approved += 1;
        } else if (q.status === QuoteStatus.REJECTED) {
          rejectedQuotes++;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) companyQuotesMap[targetCompanyId].rejected += 1;
        } else if (q.status === QuoteStatus.DRAFT) {
          draftQuotes++;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) companyQuotesMap[targetCompanyId].draftOrSent += 1;
        } else if (q.status === QuoteStatus.SENT) {
          sentQuotes++;
          if (targetCompanyId && companyQuotesMap[targetCompanyId]) companyQuotesMap[targetCompanyId].draftOrSent += 1;
        }
      }
    }

    const quotesByCompany = companies.map((comp) => {
      const stats = companyQuotesMap[comp.id] || {
        totalCount: 0,
        amountTry: new Decimal(0),
        amountUsd: new Decimal(0),
        approved: 0,
        rejected: 0,
        revised: 0,
        draftOrSent: 0,
      };
      return {
        companyId: comp.id,
        companyCode: comp.code,
        companyName: comp.name,
        totalQuotesCount: stats.totalCount,
        totalAmountTry: stats.amountTry.toFixed(2),
        totalAmountUsd: stats.amountUsd.toFixed(2),
        approvedCount: stats.approved,
        rejectedCount: stats.rejected,
        revisedCount: stats.revised,
        draftOrSentCount: stats.draftOrSent,
      };
    });

    const averageQuoteAmount = activeQuotesCount > 0
      ? totalQuoteAmountDec.dividedBy(activeQuotesCount).toFixed(2)
      : '0.00';

    // 3. Lead metrics
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
        totalSalesVolumeUsd: totalSalesVolumeUsdDec.toFixed(2),
        thisMonthSalesVolume: totalSalesVolumeDec.toFixed(2),
        thisMonthSalesVolumeUsd: totalSalesVolumeUsdDec.toFixed(2),
        usdRate: usdRateDec.toFixed(4),
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
      quotesByCompany,
    };
  }

  getExchangeRate() {
    return this.exchangeRateService.getUsdRate();
  }
}
