import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Currency, PaymentStatus } from '../../common/enums/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Onaylı teklif ID (varsa)' })
  @IsUUID()
  @IsOptional()
  quoteId?: string;

  @ApiProperty({ description: 'Müşteri ID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: '2x DreamFiber Kurumsal Router, 500m Fiber Optik Kablo' })
  @IsString()
  @IsNotEmpty()
  soldItemsSummary: string;

  @ApiPropertyOptional({ example: [], description: 'Cihaz seri/MAC numaraları (isteğe bağlı)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serialOrMacNumbers?: string[];

  @ApiProperty({ example: '31320.00', description: 'Toplam satış tutarı string' })
  @IsNotEmpty()
  totalAmount: string;

  @ApiPropertyOptional({ example: '0.00', description: 'Kısmi tahsilat durumunda alınan tutar' })
  @IsOptional()
  paidAmount?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.TRY })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.TRY;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isInvoiced?: boolean = false;

  @ApiPropertyOptional({ example: 'GIB2026000000123' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-08T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus = PaymentStatus.PENDING;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateSaleDto {
  @ApiPropertyOptional({ example: '2x DreamFiber Router' })
  @IsString()
  @IsOptional()
  soldItemsSummary?: string;

  @ApiPropertyOptional({ example: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  serialOrMacNumbers?: string[];

  @ApiPropertyOptional({ example: '31320.00' })
  @IsOptional()
  totalAmount?: string;

  @ApiPropertyOptional({ example: '15000.00', description: 'Tahsil edilen peşinat / kısmi ödeme' })
  @IsOptional()
  paidAmount?: string;

  @ApiPropertyOptional({ enum: Currency, example: Currency.TRY })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isInvoiced?: boolean;

  @ApiPropertyOptional({ example: 'GIB2026000000123' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-08T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class SaleQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Fatura kesildi mi filtresi' })
  @IsOptional()
  isInvoiced?: boolean;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Ödeme durumu' })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Şirket ID filtresi (Dream veya Tescom)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

export class SaleDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  quoteId?: string | null;

  @ApiPropertyOptional()
  quote?: { id: string; quoteNumber: string; grandTotal: string } | null;

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional()
  customer?: { id: string; companyName: string; taxNumber: string | null; type: string };

  @ApiProperty()
  repId: string;

  @ApiPropertyOptional()
  rep?: { id: string; fullName: string; email: string };

  @ApiProperty()
  soldItemsSummary: string;

  @ApiPropertyOptional({ type: [String] })
  serialOrMacNumbers: string[];

  @ApiProperty({ example: '31320.00' })
  totalAmount: string;

  @ApiProperty({ example: '15000.00', description: 'Tahsil edilen tutar' })
  paidAmount: string;

  @ApiProperty({ example: '16320.00', description: 'Kalan tahsilat bakiyesi' })
  remainingAmount: string;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  isInvoiced: boolean;

  @ApiPropertyOptional()
  invoiceNumber?: string | null;

  @ApiPropertyOptional()
  invoiceDate?: Date | null;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedSaleResponseDto {
  @ApiProperty({ type: [SaleDto] })
  data: SaleDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
