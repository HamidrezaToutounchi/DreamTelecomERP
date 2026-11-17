import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateApprovalSettingDto {
  @ApiProperty({ example: 1, description: 'Onay adım sırası (1, 2, 3...)' })
  @IsInt({ message: 'Adım sırası tam sayı olmalıdır.' })
  @Min(1, { message: 'Adım sırası en az 1 olmalıdır.' })
  step: number;

  @ApiProperty({
    example: '1. Adım: Depo Sorumlusu Onayı',
    description: 'Onay adımının adı veya başlığı',
  })
  @IsString()
  @IsNotEmpty({ message: 'Onay adımı adı zorunludur.' })
  name: string;

  @ApiPropertyOptional({
    example: 'uuid-role-id',
    description: 'Bu adımı onaylamaya yetkili rol (Boş bırakılırsa tüm yöneticiler onaylayabilir)',
  })
  @IsUUID('4', { message: 'Geçersiz rol ID formatı.' })
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    example: 'uuid-user-id',
    description: 'Bu adımı onaylamaya yetkili belirli kullanıcı',
  })
  @IsUUID('4', { message: 'Geçersiz kullanıcı ID formatı.' })
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateApprovalSettingDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  step?: number;

  @ApiPropertyOptional({ example: '1. Adım: Depo Müdürü Onayı' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'uuid-role-id' })
  @IsUUID('4')
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @IsUUID('4')
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ApprovalSettingRoleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;
}

export class ApprovalSettingUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class ApprovalSettingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  step: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  roleId?: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: () => ApprovalSettingRoleDto })
  role?: ApprovalSettingRoleDto;

  @ApiPropertyOptional({ type: () => ApprovalSettingUserDto })
  user?: ApprovalSettingUserDto;
}
