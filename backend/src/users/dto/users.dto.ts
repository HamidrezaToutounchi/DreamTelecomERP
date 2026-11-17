import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/enums/crm.enums';

export class CreateUserDto {
  @ApiProperty({ example: 'ahmet@dreamtelecom.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: '0555 123 45 67' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Dream123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: Role, default: Role.SALES_REP })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.SALES_REP;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'app-role-uuid', description: 'Atanacak sistem / özel rol ID' })
  @IsString()
  @IsOptional()
  appRoleId?: string | null;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'ahmet@dreamtelecom.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '0555 123 45 67' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'NewSecret123!' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'app-role-uuid', description: 'Atanacak sistem / özel rol ID' })
  @IsString()
  @IsOptional()
  appRoleId?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiPropertyOptional()
  isSuperAdmin?: boolean;

  @ApiPropertyOptional()
  appRoleId?: string | null;

  @ApiPropertyOptional()
  appRole?: { id: string; name: string } | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
