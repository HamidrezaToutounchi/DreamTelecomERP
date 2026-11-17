import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiPropertyOptional({ example: 'SUP-0001', description: 'Tedarikçi Kodu (Boşsa otomatik üretilir)' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Cisco Türkiye Dağıtım A.Ş.', description: 'Tedarikçi Ünvanı / Adı' })
  @IsString()
  @IsNotEmpty({ message: 'Tedarikçi adı zorunludur.' })
  name: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'Büyük Mükellefler' })
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiPropertyOptional({ example: 'Mehmet Tedarik' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '0212 555 00 00' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'siparis@tedarikci.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Maslak Mah. No:1 Sarıyer / İstanbul' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'SUP-001' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Cisco Türkiye' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SupplierDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  taxNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  taxOffice?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactPerson?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  address?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
