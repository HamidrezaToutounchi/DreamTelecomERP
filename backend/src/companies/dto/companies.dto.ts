import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompanyDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'DREAM' })
  code: string;

  @ApiProperty({ example: 'Dream Telecom' })
  name: string;

  @ApiProperty({ example: 'DREAM TELEKOMÜNİKASYON VE İLETİŞİM HİZMETLERİ SANAYİ TİC. LTD. ŞTİ.' })
  title: string;

  @ApiProperty({ example: 'Barbaros Hayrettin Başa Mah. 1993 Sokak . No : 35 Papatya 2 Residence A Blok Daire :70 Kat 4 Beylikdüzü / İSTANBUL' })
  address: string;

  @ApiProperty({ example: '0 212 929 99 00' })
  phone: string;

  @ApiPropertyOptional({ example: '0 212 908 0 445' })
  fax?: string;

  @ApiProperty({ example: 'info@dreamtelecom.com.tr' })
  email: string;

  @ApiPropertyOptional({ example: 'www.dreamtelecom.com.tr' })
  website?: string;

  @ApiPropertyOptional()
  taxOffice?: string;

  @ApiPropertyOptional()
  taxNumber?: string;

  @ApiPropertyOptional()
  bankInfo?: string;

  @ApiPropertyOptional({ example: '/logo.png' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#004A93' })
  primaryColor?: string;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fax?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankInfo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  primaryColor?: string;
}
