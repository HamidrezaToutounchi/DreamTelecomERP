import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ProductType, Currency } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'DreamFiber Kurumsal Router 10G', description: 'Ürün veya Hizmet Adı' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Dream Telecom', description: 'Marka' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'DF-10G-PRO', description: 'Model' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ enum: ProductType, default: ProductType.PHYSICAL, description: 'Ürün Türü: PHYSICAL, SOFTWARE, SERVICE' })
  @IsEnum(ProductType)
  @IsNotEmpty()
  type: ProductType;

  @ApiPropertyOptional({ example: 'DF-RTR-10G', description: 'Monospace Ürün Kodu' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: '10 Gbps SFP+ Uplink portlu yüksek hızlı kurumsal yönlendirici' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '14500.00', description: 'Birim Liste Fiyatı (string formatında para)' })
  @IsNotEmpty()
  unitPrice: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.TRY })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.TRY;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'KDV Oranı %' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  taxRate?: number = 20;

  @ApiPropertyOptional({ example: '/uploads/product-12345.png', description: 'Ürün Fotoğrafı URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'DreamFiber Kurumsal Router 10G' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Dream Telecom' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: 'DF-10G-PRO' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @ApiPropertyOptional({ example: 'DF-RTR-10G' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '14500.00' })
  @IsOptional()
  unitPrice?: string;

  @ApiPropertyOptional({ enum: Currency })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ProductType, description: 'Ürün Türüne Göre Filtrele' })
  @IsEnum(ProductType)
  @IsOptional()
  type?: ProductType;

  @ApiPropertyOptional({ description: 'Marka Filtresi' })
  @IsString()
  @IsOptional()
  brand?: string;
}

export class ProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  model?: string | null;

  @ApiProperty({ enum: ProductType })
  type: ProductType;

  @ApiPropertyOptional()
  code?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ example: '14500.00' })
  unitPrice: string;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty({ example: 20 })
  taxRate: number;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedProductResponseDto {
  @ApiProperty({ type: [ProductDto] })
  data: ProductDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ProductSalesStatDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiPropertyOptional()
  model?: string | null;

  @ApiProperty({ enum: ProductType })
  type: ProductType;

  @ApiProperty({ example: 12, description: 'Toplam Satılan Adet' })
  totalSoldQuantity: number;

  @ApiProperty({ example: '174000.00', description: 'Toplam Ciro (TRY)' })
  totalRevenue: string;

  @ApiProperty({ example: 5, description: 'Satış Yapılan İşlem Sayısı' })
  salesCount: number;
}
