import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { QuoteStatus, PaymentStatus } from '../../common/enums/crm.enums';

export class SalesByRepItemDto {
  @ApiProperty()
  repId: string;

  @ApiProperty()
  repName: string;

  @ApiProperty({ example: '145200.00' })
  totalSalesAmount: string;

  @ApiPropertyOptional({ example: '2890.75' })
  totalSalesAmountUsd?: string;

  @ApiProperty({ example: 8 })
  salesCount: number;
}

export class SalesByCategoryItemDto {
  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  color: string;

  @ApiProperty({ example: '78500.00' })
  totalSalesAmount: string;

  @ApiProperty({ example: 5 })
  salesCount: number;
}

export class QuotesByRepItemDto {
  @ApiProperty()
  repId: string;

  @ApiProperty()
  repName: string;

  @ApiProperty({ example: 12 })
  totalQuotesCount: number;

  @ApiPropertyOptional({ example: '250000.00' })
  totalQuoteAmountTry?: string;

  @ApiPropertyOptional({ example: '4980.00' })
  totalQuoteAmountUsd?: string;

  @ApiProperty({ example: 7 })
  approvedCount: number;

  @ApiPropertyOptional({ example: '180000.00' })
  approvedAmountTry?: string;

  @ApiPropertyOptional({ example: '3585.00' })
  approvedAmountUsd?: string;

  @ApiProperty({ example: 2 })
  rejectedCount: number;

  @ApiProperty({ example: 2 })
  revisedCount: number;

  @ApiProperty({ example: 1 })
  draftOrSentCount: number;

  @ApiPropertyOptional({ example: '70000.00' })
  openAmountTry?: string;

  @ApiPropertyOptional({ example: '1395.00' })
  openAmountUsd?: string;
}

export class QuotesByCompanyItemDto {
  @ApiProperty()
  companyId: string;

  @ApiProperty({ example: 'DREAM' })
  companyCode: string;

  @ApiProperty({ example: 'Dream Telecom' })
  companyName: string;

  @ApiProperty({ example: 15 })
  totalQuotesCount: number;

  @ApiProperty({ example: '250000.00' })
  totalAmountTry: string;

  @ApiProperty({ example: '4982.06' })
  totalAmountUsd: string;

  @ApiProperty({ example: 8 })
  approvedCount: number;

  @ApiProperty({ example: 2 })
  rejectedCount: number;

  @ApiProperty({ example: 3 })
  revisedCount: number;

  @ApiProperty({ example: 2 })
  draftOrSentCount: number;
}

export class DashboardKpiDto {
  @ApiProperty({ example: '450000.00', description: 'Toplam Onaylanmış / Gerçekleşen Ciro (TRY)' })
  totalRevenue: string;

  @ApiProperty({ example: '13081.40', description: 'Toplam Onaylanmış / Gerçekleşen Ciro (USD)' })
  totalRevenueUsd: string;

  @ApiProperty({ example: '85000.00', description: 'Bu Ay Gerçekleşen Satış Cirosu (TRY)' })
  thisMonthSalesAmount: string;

  @ApiProperty({ example: '2470.93', description: 'Bu Ay Gerçekleşen Satış Cirosu (USD)' })
  thisMonthSalesAmountUsd: string;

  @ApiProperty({ example: 4, description: 'Bu Ay Yapılan Satış Adedi' })
  thisMonthSalesCount: number;

  @ApiProperty({ example: '125000.00', description: 'Açık Teklif Tutarı (SENT & DRAFT)' })
  openQuotesAmount: string;

  @ApiProperty({ example: '3633.72', description: 'Açık Teklif Tutarı (USD)' })
  openQuotesAmountUsd: string;

  @ApiProperty({ example: '34.40', description: 'TCMB USD/TRY Güncel Kuru' })
  usdRate: string;

  @ApiProperty({ example: '62.50%', description: 'Teklif Onay Oranı' })
  quoteApprovalRate: string;

  @ApiProperty({ example: '85000.00', description: 'Faturası Bekleyen Satışların Tutarı' })
  pendingInvoiceSalesAmount: string;

  @ApiProperty({ example: '2470.93', description: 'Faturası Bekleyen Satışların Tutarı (USD)' })
  pendingInvoiceSalesAmountUsd: string;

  @ApiProperty({ example: 4, description: 'Faturası Bekleyen Satış Adedi' })
  pendingInvoiceSalesCount: number;

  @ApiProperty({ example: '31.25%', description: 'Lead Müşteriye Dönüşüm Oranı' })
  leadConversionRate: string;

  @ApiPropertyOptional({ example: '1500000.00', description: 'Depodaki Toplam Stok Envanter Değeri (TRY)' })
  totalStockValueTry?: string;

  @ApiPropertyOptional({ example: '29890.00', description: 'Depodaki Toplam Stok Envanter Değeri (USD)' })
  totalStockValueUsd?: string;

  @ApiPropertyOptional({ example: 450, description: 'Depolardaki Toplam Fiziksel Ürün / Kalem Adedi' })
  totalStockQuantity?: number;

  @ApiPropertyOptional({ example: 15, description: 'Stokta Bulunan Çeşit Ürün Sayısı' })
  totalStockProductsCount?: number;

  @ApiPropertyOptional({ example: 2, description: 'Yönetici Onayı Bekleyen Sevkiyat / Kargo Fişi Sayısı' })
  pendingExitsCount?: number;

  @ApiPropertyOptional({ example: 3, description: 'Kritik Seviyenin Altındaki Ürün Sayısı' })
  criticalStockCount?: number;
}

export class DashboardSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Şirket ID filtresi (Dream veya Tescom)' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardKpiDto })
  kpis: DashboardKpiDto;

  @ApiProperty({ type: [SalesByRepItemDto], description: 'Pasta Grafik 1: Temsilci Bazlı Satış Tutarları' })
  salesByRep: SalesByRepItemDto[];

  @ApiProperty({ type: [SalesByCategoryItemDto], description: 'Pasta Grafik: Kategori Bazlı Satış Dağılımı' })
  salesByCategory: SalesByCategoryItemDto[];

  @ApiProperty({ type: [QuotesByRepItemDto], description: 'Grafik: Temsilci Bazlı Teklif Sayıları ve Durum Dağılımı' })
  quotesByRep: QuotesByRepItemDto[];

  @ApiProperty({ type: [QuotesByCompanyItemDto], description: 'Şirket Bazlı Teklif Dağılımı (Dream vs Tescom)' })
  quotesByCompany: QuotesByCompanyItemDto[];
}

export class DetailedReportsQueryDto {
  @ApiPropertyOptional({ description: 'Şirket ID filtresi (Dream veya Tescom)' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
  @ApiPropertyOptional({ description: 'Başlangıç tarihi (ISO string)' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Bitiş tarihi (ISO string)' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Satış temsilcisi ID filtresi' })
  @IsUUID()
  @IsOptional()
  repId?: string;

  @ApiPropertyOptional({ enum: QuoteStatus, description: 'Teklif durumu' })
  @IsEnum(QuoteStatus)
  @IsOptional()
  quoteStatus?: QuoteStatus;

  @ApiPropertyOptional({ description: 'Fatura durumu (true/false)' })
  @IsOptional()
  isInvoiced?: boolean;

  @ApiPropertyOptional({ description: 'Lead kaynağı (Web, Excel, Referans vb.)' })
  @IsString()
  @IsOptional()
  leadSource?: string;
}

export class DetailedReportsResponseDto {
  @ApiProperty()
  period: { dateFrom: string | null; dateTo: string | null };

  @ApiProperty()
  salesMetrics: {
    totalSalesCount: number;
    totalSalesVolume: string;
    totalSalesVolumeUsd: string;
    thisMonthSalesVolume: string;
    thisMonthSalesVolumeUsd: string;
    usdRate: string;
    invoicedCount: number;
    pendingInvoiceCount: number;
  };

  @ApiProperty()
  quoteMetrics: {
    totalQuotes: number;
    approvedQuotes: number;
    rejectedQuotes: number;
    revisedQuotes: number;
    draftQuotes: number;
    sentQuotes: number;
    averageQuoteAmount: string;
  };

  @ApiProperty()
  leadMetrics: {
    totalLeads: number;
    convertedLeads: number;
    lostLeads: number;
    conversionRate: string;
    leadsBySource: Record<string, number>;
  };

  @ApiProperty({ type: [QuotesByCompanyItemDto], description: 'Şirket Dağılımı (Dream Telecom vs Tescom Telecom)' })
  quotesByCompany: QuotesByCompanyItemDto[];
}
