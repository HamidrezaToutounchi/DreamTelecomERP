import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SerialTimelineQueryParams {
  @ApiProperty({ description: 'Sorgulanacak Seri Numarası veya MAC Adresi', example: 'SN-2026-0001' })
  @IsString()
  query: string;
}

export class StockMovementReportQueryParams {
  @ApiPropertyOptional()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  type?: string;
}

export class WarehouseStockReportItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productCode: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiProperty()
  warehouseId: string;

  @ApiProperty()
  warehouseName: string;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional({ description: 'Ürün Birim Satış / Liste Fiyatı' })
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Para Birimi (TRY / USD / EUR)' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Mevcut Stok Miktarının Toplam Envanter Değeri (Miktar x Birim Fiyat)' })
  totalValue?: number;

  @ApiPropertyOptional()
  minStockLevel?: number;

  @ApiProperty()
  isCritical: boolean;

  @ApiProperty()
  unit: string;
}

export class SerialTimelineEventDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  type: string; // ENTRY, EXIT, TRANSFER, FAULT_RECORD, STATUS_CHANGE

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  referenceNumber?: string;

  @ApiPropertyOptional()
  performedBy?: string;

  @ApiPropertyOptional()
  party?: string; // Müşteri veya Tedarikçi adı
}

export class SerialTimelineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serial: string;

  @ApiPropertyOptional()
  macAddress?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productCode: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiPropertyOptional()
  customerWarrantyEnd?: string;

  @ApiPropertyOptional()
  supplierWarrantyEnd?: string;

  @ApiPropertyOptional()
  currentCustomer?: string;

  @ApiPropertyOptional()
  currentWarehouse?: string;

  @ApiProperty({ type: [SerialTimelineEventDto] })
  timeline: SerialTimelineEventDto[];
}

export class WarrantyReportItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serial: string;

  @ApiPropertyOptional()
  macAddress?: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productCode: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  model?: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  daysLeft: number;

  @ApiProperty()
  statusText: string;

  @ApiProperty()
  partyName: string;
}

export class StockMovementReportItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productCode: string;

  @ApiProperty()
  warehouseName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  referenceNumber: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  userName: string;
}

export class SupplierEntriesReportItemDto {
  @ApiProperty()
  supplierId: string;

  @ApiProperty()
  supplierCode: string;

  @ApiProperty()
  supplierName: string;

  @ApiProperty()
  contactPerson: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  entryCount: number;

  @ApiProperty()
  totalItemsReceived: number;

  @ApiPropertyOptional()
  lastEntryDate?: string;
}

export class CustomerExitsReportItemDto {
  @ApiProperty()
  customerId: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  taxNumber: string;

  @ApiProperty()
  shipmentCount: number;

  @ApiProperty()
  totalItemsShipped: number;

  @ApiPropertyOptional()
  lastShipmentDate?: string;
}

export class FaultStatisticsReportDto {
  @ApiProperty()
  totalFaults: number;

  @ApiProperty()
  underCustomerWarrantyCount: number;

  @ApiProperty()
  outOfWarrantyCount: number;

  @ApiProperty()
  resolvedCount: number;

  @ApiProperty()
  replacedCount: number;

  @ApiProperty()
  scrappedCount: number;

  @ApiProperty()
  inProgressCount: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byPriority: Record<string, number>;
}
