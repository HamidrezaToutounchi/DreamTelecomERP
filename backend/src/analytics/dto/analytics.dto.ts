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

  @ApiProperty({ example: 7 })
  approvedCount: number;

  @ApiProperty({ example: 2 })
  rejectedCount: number;

  @ApiProperty({ example: 2 })
  revisedCount: number;

  @ApiProperty({ example: 1 })
  draftOrSentCount: number;
}

export class DashboardKpiDto {
  @ApiProperty({ example: '450000.00', description: 'Toplam Onaylanmış / Gerçekleşen Ciro' })
  totalRevenue: string;

  @ApiProperty({ example: '85000.00', description: 'Bu Ay Gerçekleşen Satış Cirosu' })
  thisMonthSalesAmount: string;

  @ApiProperty({ example: 4, description: 'Bu Ay Yapılan Satış Adedi' })
  thisMonthSalesCount: number;

  @ApiProperty({ example: '125000.00', description: 'Açık Teklif Tutarı (SENT & DRAFT)' })
  openQuotesAmount: string;

  @ApiProperty({ example: '62.50%', description: 'Teklif Onay Oranı' })
  quoteApprovalRate: string;

  @ApiProperty({ example: '85000.00', description: 'Faturası Bekleyen Satışların Tutarı' })
  pendingInvoiceSalesAmount: string;

  @ApiProperty({ example: 4, description: 'Faturası Bekleyen Satış Adedi' })
  pendingInvoiceSalesCount: number;

  @ApiProperty({ example: '31.25%', description: 'Lead Müşteriye Dönüşüm Oranı' })
  leadConversionRate: string;
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
}

export class DetailedReportsQueryDto {
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
    thisMonthSalesVolume: string;
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
}
