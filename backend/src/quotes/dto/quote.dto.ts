import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency, QuoteStatus } from '../../common/enums/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';

export class CreateQuoteItemDto {
  @ApiPropertyOptional({ description: 'Katalog Ürün ID (Opsiyonel)' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ example: 'DreamFiber Kurumsal Router 10G' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 'RTR-10G-SFP-01' })
  @IsString()
  @IsNotEmpty()
  productCode: string;

  @ApiPropertyOptional({ example: 'Dream Telecom' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'DF-10G-PRO' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ example: '10 Gbps SFP+ Uplink portlu yüksek performanslı yönlendirici' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/products/router.png', description: 'Ürün fotoğrafı URLi' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 2, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiProperty({ example: '14500.00', description: 'Birim fiyat (string para formatı)' })
  @IsNotEmpty()
  unitPrice: string;

  @ApiPropertyOptional({ example: '10.00', default: '0.00', description: 'İskonto oranı %' })
  @IsOptional()
  discountRate?: string = '0.00';

  @ApiPropertyOptional({ example: 20, default: 20, description: 'KDV oranı %' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  taxRate?: number = 20;
}

export class CreateQuoteDto {
  @ApiPropertyOptional({ description: 'Teklif Veren Şirket ID (Dream veya Tescom)' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: 'Müşteri ID' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Teklif geçerlilik tarihi' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.TRY })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.TRY;

  @ApiPropertyOptional({ example: 'Fiyatlarımıza KDV dahildir/hariçtir, teslimat 3 iş günüdür.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Ödeme vadesi 30 gündür. Kurulum ve devreye alma dahildir.' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiProperty({ type: [CreateQuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];
}

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus, example: QuoteStatus.APPROVED })
  @IsEnum(QuoteStatus)
  @IsNotEmpty()
  status: QuoteStatus;

  @ApiPropertyOptional({ example: 'Müşteri bütçeyi aştığını belirtti.', description: 'Eğer REJECTED ise ret sebebi' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ReviseQuoteDto {
  @ApiPropertyOptional({ description: 'Teklif Veren Şirket ID' })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ type: [CreateQuoteItemDto], description: 'Güncellenen teklif kalemleri' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  @IsOptional()
  items?: CreateQuoteItemDto[];
}

export class QuoteItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  productId?: string | null;

  @ApiProperty()
  productName: string;

  @ApiProperty({ description: 'Monospace kod' })
  productCode: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  model?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ example: '14500.00' })
  unitPrice: string;

  @ApiProperty({ example: '10.00' })
  discountRate: string;

  @ApiProperty({ example: 20 })
  taxRate: number;

  @ApiProperty({ example: '26100.00' })
  lineTotal: string;
}

export class QuoteDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'DT-2026-0001', description: 'Monospace teklif numarası' })
  quoteNumber: string;

  @ApiPropertyOptional()
  companyId?: string | null;

  @ApiPropertyOptional()
  company?: { id: string; code: string; name: string; title: string; logoUrl?: string | null; phone: string; email: string };

  @ApiProperty()
  customerId: string;

  @ApiPropertyOptional()
  customer?: { id: string; companyName: string; contactPerson: string; phone: string; email: string | null };

  @ApiProperty()
  repId: string;

  @ApiPropertyOptional()
  rep?: { id: string; fullName: string; email: string };

  @ApiProperty({ example: 1 })
  version: number;

  @ApiPropertyOptional()
  parentQuoteId?: string | null;

  @ApiProperty({ enum: QuoteStatus })
  status: QuoteStatus;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiProperty()
  validUntil: Date;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ example: '26100.00' })
  subTotal: string;

  @ApiProperty({ example: '5220.00' })
  taxTotal: string;

  @ApiProperty({ example: '31320.00' })
  grandTotal: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  terms?: string | null;

  @ApiProperty({ type: [QuoteItemDto] })
  items: QuoteItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class QuoteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Şirket Filtresi (Dream veya Tescom ID)' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}

export class PaginatedQuoteResponseDto {
  @ApiProperty({ type: [QuoteDto] })
  data: QuoteDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
