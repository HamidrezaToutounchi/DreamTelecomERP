import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

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

  @ApiProperty({ enum: ['SALES_REP', 'SALES_MANAGER'], example: 'SALES_MANAGER' })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT Erişim Belirteci' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto, description: 'Giriş yapan kullanıcı bilgileri' })
  user: UserProfileDto;
}
