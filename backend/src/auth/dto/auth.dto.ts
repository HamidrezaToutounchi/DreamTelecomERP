import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'manager@dreamtelecom.com', description: 'Kullanıcı e-posta adresi' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsNotEmpty({ message: 'E-posta alanı zorunludur.' })
  email: string;

  @ApiProperty({ example: 'Dream123!', description: 'Kullanıcı parolası' })
  @IsString()
  @IsNotEmpty({ message: 'Parola alanı zorunludur.' })
  @MinLength(6, { message: 'Parola en az 6 karakter olmalıdır.' })
  password: string;
}

export class UserProfileDto {
  @ApiProperty({ example: 'f87a8b65-684d-4e94-8255-7d515a5fbc40' })
  id: string;

  @ApiProperty({ example: 'manager@dreamtelecom.com' })
  email: string;

  @ApiProperty({ example: 'Ahmet Yılmaz' })
  fullName: string;

  @ApiPropertyOptional({ example: '05551234567' })
  phone?: string | null;

  @ApiProperty({ enum: ['SALES_REP', 'SALES_MANAGER'], example: 'SALES_MANAGER' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '05551234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'ahmet@dreamtelecom.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'OldPass123!', description: 'Parola değiştirilmek isteniyorsa mevcut parola zorunludur' })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'NewPass123!', description: 'Yeni parola (en az 6 karakter)' })
  @IsString()
  @MinLength(6, { message: 'Yeni parola en az 6 karakter olmalıdır.' })
  @IsOptional()
  newPassword?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Erişim Belirteci' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto, description: 'Giriş yapan kullanıcı bilgileri' })
  user: UserProfileDto;
}
