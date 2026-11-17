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
import { StockExitType, StockExitStatus, ApprovalStatus, Currency } from '@prisma/client';

export class CreateStockExitItemDto {
  @ApiProperty({ example: 'uuid-product-id' })
  @IsUUID('4', { message: 'Geçersiz ürün ID.' })
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(0.01, { message: 'Miktar 0\'dan büyük olmalıdır.' })
  quantity: number;

  @ApiPropertyOptional({ example: 250.0, minimum: 0 })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.TRY })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({
    type: [String],
    description: 'Seri no takipli ürünler için seçilen/okutulan seri numaraları',
    example: ['SN-12345', 'SN-67890'],
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  serials?: string[];
}

export class CreateStockExitDto {
  @ApiPropertyOptional({ enum: StockExitType, default: StockExitType.SALE_SHIPMENT })
  @IsEnum(StockExitType)
  @IsOptional()
  type?: StockExitType;

  @ApiProperty({ example: 'uuid-warehouse-id', description: 'Çıkış yapılacak depo ID' })
  @IsUUID('4', { message: 'Geçersiz depo ID.' })
  warehouseId: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id', description: 'Müşteri ID (Satış çıkışlarında zorunlu)' })
  @IsUUID('4', { message: 'Geçersiz müşteri ID.' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'IRS-2026-9901' })
  @IsString()
  @IsOptional()
  waybillNumber?: string;

  @ApiPropertyOptional({ example: 'Yurtiçi Kargo' })
  @IsString()
  @IsOptional()
  carrierCompany?: string;

  @ApiPropertyOptional({ example: 'YK-123456789' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsOptional()
  recipientPerson?: string;

  @ApiPropertyOptional({ example: '0532 111 22 33' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'Büyükdere Cad. No:123 Şişli / İstanbul' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: '2026-11-17T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  exitDate?: string;

  @ApiPropertyOptional({ example: 'Acil kurumsal sipariş sevkiyatı' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/api/v1/stock/documents/sevk-irsaliyesi.pdf' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ example: 'sevk-irsaliyesi.pdf' })
  @IsString()
  @IsOptional()
  documentName?: string;

  @ApiProperty({ type: [CreateStockExitItemDto], description: 'Çıkış fişi kalemleri' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockExitItemDto)
  items: CreateStockExitItemDto[];
}

export class ApproveStockExitDto {
  @ApiPropertyOptional({ example: 'Stok kontrol edildi, sevkiyata uygundur.' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RejectStockExitDto {
  @ApiProperty({ example: 'Müşteri ödemesi onaylanmadığı için çıkış iptal edildi.' })
  @IsString()
  @IsNotEmpty({ message: 'Reddetme gerekçesi zorunludur.' })
  note: string;
}

export class ShipStockExitDto {
  @ApiPropertyOptional({ example: 'IRS-2026-9901' })
  @IsString()
  @IsOptional()
  waybillNumber?: string;

  @ApiPropertyOptional({ example: 'Yurtiçi Kargo' })
  @IsString()
  @IsOptional()
  carrierCompany?: string;

  @ApiPropertyOptional({ example: 'YK-123456789' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsOptional()
  recipientPerson?: string;

  @ApiPropertyOptional({ example: '0532 111 22 33' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'Büyükdere Cad. No:123 Şişli / İstanbul' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: '/api/v1/stock/documents/teslim-belgesi.pdf' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiPropertyOptional({ example: 'teslim-belgesi.pdf' })
  @IsString()
  @IsOptional()
  documentName?: string;
}

export class UpdateStockExitShippingDto {
  @ApiPropertyOptional({ example: 'Yurtiçi Kargo' })
  @IsString()
  @IsOptional()
  carrierCompany?: string;

  @ApiPropertyOptional({ example: 'YK-123456789' })
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'IRS-2026-9901' })
  @IsString()
  @IsOptional()
  waybillNumber?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsOptional()
  recipientPerson?: string;

  @ApiPropertyOptional({ example: '0532 111 22 33' })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'Büyükdere Cad. No:123 Şişli / İstanbul' })
  @IsString()
  @IsOptional()
  deliveryAddress?: string;
}

export class CancelStockExitDto {
  @ApiProperty({ example: 'Sipariş müşteri tarafından iptal edildi.' })
  @IsString()
  @IsNotEmpty({ message: 'İptal gerekçesi zorunludur.' })
  cancelReason: string;
}

export class StockExitsQueryParams {
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
  customerId?: string;

  @ApiPropertyOptional({ enum: StockExitType })
  @IsOptional()
  type?: StockExitType;

  @ApiPropertyOptional({ enum: StockExitStatus })
  @IsOptional()
  status?: StockExitStatus;

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

export class AvailableSerialsQueryParams {
  @ApiProperty({ description: 'Ürün ID' })
  @IsUUID('4')
  productId: string;

  @ApiProperty({ description: 'Depo ID' })
  @IsUUID('4')
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Arama terimi (seri no veya MAC)' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class AvailableSerialItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serial: string;

  @ApiPropertyOptional()
  macAddress?: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  status: string;
}

export class StockExitResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  exitNumber: string;

  @ApiProperty({ enum: StockExitType })
  type: StockExitType;

  @ApiProperty({ enum: StockExitStatus })
  status: StockExitStatus;

  @ApiProperty()
  warehouseId: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiPropertyOptional()
  waybillNumber?: string;

  @ApiPropertyOptional()
  carrierCompany?: string;

  @ApiPropertyOptional()
  trackingNumber?: string;

  @ApiPropertyOptional()
  recipientPerson?: string;

  @ApiPropertyOptional()
  recipientPhone?: string;

  @ApiPropertyOptional()
  deliveryAddress?: string;

  @ApiProperty()
  exitDate: string;

  @ApiPropertyOptional()
  shippedAt?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  documentUrl?: string;

  @ApiPropertyOptional()
  documentName?: string;

  @ApiPropertyOptional()
  warehouse?: any;

  @ApiPropertyOptional()
  customer?: any;

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
  approvals?: any[];

  @ApiPropertyOptional()
  _count?: any;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class StockExitsPaginatedResponseDto {
  @ApiProperty({ type: [StockExitResponseDto] })
  data: StockExitResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      page: { type: 'number' },
      pageSize: { type: 'number' },
      totalRowCount: { type: 'number' },
      totalPages: { type: 'number' },
    },
  })
  meta: {
    page: number;
    pageSize: number;
    totalRowCount: number;
    totalPages: number;
  };
}
