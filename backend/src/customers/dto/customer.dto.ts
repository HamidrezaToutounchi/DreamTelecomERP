import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CustomerType } from '../../common/enums/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';
import { IsValidPhone, IsValidEmailStrict } from '../../common/utils/phone-validator.util';
import { CustomerCategoryDto } from '../../categories/dto/category.dto';

export class CreateCustomerDto {
  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.CORPORATE })
  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType = CustomerType.CORPORATE;

  @ApiProperty({ description: 'Müşteri Kategori ID (Zorunlu)' })
  @IsUUID('4', { message: 'Geçerli bir kategori seçilmelidir.' })
  @IsNotEmpty({ message: 'Müşteri kategorisi seçilmesi zorunludur.' })
  categoryId: string;

  @ApiProperty({ example: 'Turkcell İletişim Hizmetleri A.Ş. veya Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({ example: '8790012345' })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'Büyük Mükellefler' })
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiProperty({ example: 'Ayşe Kaya' })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({ example: '0212 313 10 00' })
  @IsString()
  @IsNotEmpty({ message: 'Müşteri telefon numarası kesinlikle boş bırakılamaz.' })
  @IsValidPhone({ message: 'Lütfen geçerli ve gerçek bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).' })
  phone: string;

  @ApiPropertyOptional({ example: 'info@turkcell.com.tr' })
  @IsValidEmailStrict({ message: 'Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@sirket.com).' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Aydınevler Mah. İnönü Cad. No:20 Maltepe/İstanbul', description: 'Müşteri açık adresi (Zorunlu)' })
  @IsString()
  @IsNotEmpty({ message: 'Müşteri açık adresi zorunludur.' })
  address: string;

  @ApiPropertyOptional({ description: 'Eğer bir lead müşteriye dönüştürülüyorsa o leadin IDsi' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Atanacak Temsilci ID (Yalnızca Manager değiştirebilir)' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CustomerType })
  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Turkcell İletişim Hizmetleri A.Ş.' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: '8790012345' })
  @IsString()
  @IsOptional()
  taxNumber?: string;

  @ApiPropertyOptional({ example: 'Büyük Mükellefler' })
  @IsString()
  @IsOptional()
  taxOffice?: string;

  @ApiPropertyOptional({ example: 'Ayşe Kaya' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '0212 313 10 00' })
  @IsString()
  @IsValidPhone({ message: 'Lütfen geçerli ve gerçek bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@turkcell.com.tr' })
  @IsValidEmailStrict({ message: 'Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@sirket.com).' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Aydınevler Mah. İnönü Cad. No:20 Maltepe/İstanbul' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CustomerType, description: 'Müşteri tipi filtresi' })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional({ description: 'Kategori ID filtresi' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}

export class CustomerDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: CustomerType })
  type: CustomerType;

  @ApiPropertyOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: CustomerCategoryDto })
  category?: CustomerCategoryDto | null;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  taxNumber?: string | null;

  @ApiPropertyOptional()
  taxOffice?: string | null;

  @ApiProperty()
  contactPerson: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  leadId?: string | null;

  @ApiProperty()
  assignedToId: string;

  @ApiPropertyOptional()
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional()
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };

  @ApiPropertyOptional({ type: () => [Object] })
  interactions?: any[];

  @ApiPropertyOptional({ type: () => [Object] })
  quotes?: any[];

  @ApiPropertyOptional({ type: () => [Object] })
  sales?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedCustomerResponseDto {
  @ApiProperty({ type: [CustomerDto] })
  data: CustomerDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
