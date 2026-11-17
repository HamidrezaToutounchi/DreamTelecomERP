import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockEntryType, StockEntryStatus, Currency } from '@prisma/client';

export class SerialItemDto {
  @ApiProperty({ example: 'SN-ABC-12345' })
  @IsString()
  @IsNotEmpty({ message: 'Seri numarası boş olamaz.' })
  serial: string;

  @ApiPropertyOptional({ example: 'AA:BB:CC:11:22:33' })
  @IsString()
  @IsOptional()
  macAddress?: string;
}

export class CreateStockEntryItemDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsUUID('4', { message: 'Geçersiz ürün ID.' })
  productId: string;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsNumber()
  @Min(0.01, { message: 'Miktar 0\'dan büyük olmalıdır.' })
  quantity: number;

  @ApiProperty({ example: 150.0, minimum: 0 })
  @IsNumber()
  @Min(0, { message: 'Birim fiyat negatif olamaz.' })
  unitPrice: number;

  @ApiProperty({ enum: Currency, default: Currency.TRY })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ type: [SerialItemDto], description: 'Seri no takipli ürünler için seri listesi' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SerialItemDto)
  serials?: SerialItemDto[];
}

export class CreateStockEntryDto {
  @ApiPropertyOptional({ enum: StockEntryType, default: StockEntryType.PURCHASE })
  @IsEnum(StockEntryType)
  @IsOptional()
  type?: StockEntryType;

  @ApiProperty({ example: 'uuid-warehouse-id', description: 'Giriş yapılacak depo ID' })
  @IsUUID('4', { message: 'Geçersiz depo ID.' })
  warehouseId: string;

  @ApiPropertyOptional({ example: 'uuid-supplier-id', description: 'Tedarikçi ID' })
  @IsUUID('4', { message: 'Geçersiz tedarikçi ID.' })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'FTR-2026-00123' })
  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 'IRS-2026-00987' })
  @IsString()
  @IsOptional()
  waybillNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-17T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  entryDate?: string;

  @ApiPropertyOptional({ example: 'Kasım ayı donanım alımı irsaliyesi' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/api/v1/stock/documents/abc.pdf' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ example: 'irsaliye-kasim.pdf' })
  @IsString()
  @IsOptional()
  documentName?: string;

  @ApiProperty({ type: [CreateStockEntryItemDto], description: 'Giriş fişi kalemleri' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockEntryItemDto)
  items: CreateStockEntryItemDto[];
}

export class CancelStockEntryDto {
  @ApiProperty({ example: 'Fatura ve irsaliyede hatalı ürün girildiği için iptal edildi.' })
  @IsString()
  @IsNotEmpty({ message: 'İptal gerekçesi zorunludur.' })
  cancelReason: string;
}

export class StockEntriesQueryParams {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ enum: StockEntryStatus })
  @IsOptional()
  status?: StockEntryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: string;
}

export class StockEntryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  entryNumber: string;

  @ApiProperty({ enum: StockEntryType })
  type: StockEntryType;

  @ApiProperty({ enum: StockEntryStatus })
  status: StockEntryStatus;

  @ApiProperty()
  warehouseId: string;

  @ApiPropertyOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  waybillNumber?: string;

  @ApiProperty()
  entryDate: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiPropertyOptional()
  documentName?: string;

  @ApiPropertyOptional()
  warehouse?: any;

  @ApiPropertyOptional()
  supplier?: any;

  @ApiPropertyOptional()
  createdBy?: any;

  @ApiPropertyOptional()
  cancelledBy?: any;

  @ApiPropertyOptional()
  cancelledAt?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiPropertyOptional()
  items?: any[];

  @ApiPropertyOptional()
  serials?: any[];

  @ApiPropertyOptional()
  _count?: any;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class PaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalRowCount: number;

  @ApiProperty()
  totalPages: number;
}

export class StockEntriesPaginatedResponseDto {
  @ApiProperty({ type: [StockEntryResponseDto] })
  data: StockEntryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
