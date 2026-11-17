import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppModule } from '../../common/enums/crm.enums';

export class RolePermissionItemDto {
  @ApiProperty({ enum: AppModule, example: AppModule.STOCK_VIEW })
  @IsEnum(AppModule)
  module: AppModule;

  @ApiProperty({ example: true })
  @IsBoolean()
  canView: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canCreate: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canEdit: boolean;

  @ApiProperty({ example: false, description: 'Stok modüllerinde her zaman false / kullanılamaz' })
  @IsBoolean()
  canDelete: boolean;

  @ApiProperty({ example: false, description: 'Stok modüllerinde iptal etme yetkisi' })
  @IsBoolean()
  canCancel: boolean;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Depo Sorumlusu', description: 'Rol adı (Tekil)' })
  @IsString()
  @IsNotEmpty({ message: 'Rol adı zorunludur.' })
  name: string;

  @ApiPropertyOptional({ example: 'Stok girişi, çıkışı ve sayım işlemlerini yürütür' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [RolePermissionItemDto], description: 'Modül bazlı CRUD yetki matrisi' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions: RolePermissionItemDto[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Depo Sorumlusu' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Açıklama' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [RolePermissionItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions?: RolePermissionItemDto[];
}

export class RoleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Sistem rolleri (Yönetici, Satış Temsilcisi vb.) silinemez' })
  isSystem: boolean;

  @ApiProperty({ description: 'Bu role atanmış aktif kullanıcı sayısı' })
  userCount: number;

  @ApiProperty({ type: [RolePermissionItemDto] })
  permissions: RolePermissionItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
