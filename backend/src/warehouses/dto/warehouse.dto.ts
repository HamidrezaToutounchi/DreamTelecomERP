import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'WH-MAIN', description: 'Benzersiz Depo Kodu' })
  @IsString()
  @IsNotEmpty({ message: 'Depo kodu zorunludur.' })
  code: string;

  @ApiProperty({ example: 'Ana Depo', description: 'Depo Adı' })
  @IsString()
  @IsNotEmpty({ message: 'Depo adı zorunludur.' })
  name: string;

  @ApiPropertyOptional({ example: 'İstanbul Lojistik Merkezi' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yetkili' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '0555 123 45 67' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ default: false, description: 'Varsayılan Depo mu?' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'WH-MAIN' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Ana Depo' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class WarehouseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactPerson?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  contactPhone?: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
