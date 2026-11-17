import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StockCustomerSearchItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  taxNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  taxOffice?: string | null;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  email?: string | null;

  @ApiProperty()
  contactPerson: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  address?: string | null;
}

export class QuickCreateCustomerDto {
  @ApiProperty({ example: 'Örnek Telekom A.Ş.' })
  @IsString()
  @IsNotEmpty({ message: 'Müşteri firma adı zorunludur.' })
  companyName: string;

  @ApiProperty({ example: 'Ahmet Bey' })
  @IsString()
  @IsNotEmpty({ message: 'Yetkili kişi adı zorunludur.' })
  contactPerson: string;

  @ApiProperty({ example: '0555 123 45 67' })
  @IsString()
  @IsNotEmpty({ message: 'Telefon numarası zorunludur.' })
  phone: string;

  @ApiPropertyOptional({ example: 'ornek@telekom.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'Marmara Kurumlar' })
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiPropertyOptional({ example: 'İstanbul' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Atanacak satış temsilcisi (boşsa ekleyen kullanıcıya atanır)' })
  @IsString()
  @IsOptional()
  assignedToId?: string;
}

export class StockLookupResultDto {
  @ApiProperty({ enum: ['BARCODE', 'SERIAL', 'MAC', 'PRODUCT_CODE', 'NONE'] })
  matchedBy: 'BARCODE' | 'SERIAL' | 'MAC' | 'PRODUCT_CODE' | 'NONE';

  @ApiPropertyOptional()
  product?: any;

  @ApiPropertyOptional()
  serial?: any;

  @ApiPropertyOptional()
  customer?: any;

  @ApiPropertyOptional({ type: [Object] })
  stockLevels?: any[];
}
