import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { FaultStatus, FaultPriority } from '@prisma/client';

export class CreateFaultRecordDto {
  @ApiProperty({
    description: 'Arızalı ürünün Seri Numarası kaydının ID değeri',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Geçersiz seri numarası ID formatı.' })
  @IsNotEmpty({ message: 'Seri numarası seçilmelidir.' })
  serialId: string;

  @ApiPropertyOptional({
    description: 'Müşteri ID (Boş bırakılırsa seriye atanmış mevcut müşteri kullanılır)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID('4', { message: 'Geçersiz müşteri ID formatı.' })
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Ahmet Yılmaz', description: 'Cihazı teslim eden veya irtibat kurulacak kişi' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '0532 111 22 33', description: 'İrtibat telefon numarası' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({
    example: 'Cihaz güç almıyor, adaptör takıldığında LED yanıp sönüyor.',
    description: 'Müşteri tarafından bildirilen arıza veya şikayet',
  })
  @IsString()
  @IsNotEmpty({ message: 'Arıza açıklaması zorunludur.' })
  reportedProblem: string;

  @ApiPropertyOptional({ enum: FaultPriority, default: FaultPriority.MEDIUM })
  @IsEnum(FaultPriority, { message: 'Geçersiz öncelik seviyesi.' })
  @IsOptional()
  priority?: FaultPriority;
}

export class UpdateFaultStatusDto {
  @ApiProperty({ enum: FaultStatus, description: 'Yeni arıza statüsü' })
  @IsEnum(FaultStatus, { message: 'Geçersiz arıza durumu.' })
  @IsNotEmpty({ message: 'Arıza durumu zorunludur.' })
  status: FaultStatus;

  @ApiPropertyOptional({
    example: 'Güç katındaki kondansatör arızalı tespit edildi, değiştirildi.',
    description: 'Teknisyen inceleme ve operasyon notları',
  })
  @IsString()
  @IsOptional()
  technicianNotes?: string;

  @ApiPropertyOptional({
    example: 'Cihaz onarıldı, 24 saat yük testinden başarıyla geçti.',
    description: 'Sonuç ve çözüm özeti',
  })
  @IsString()
  @IsOptional()
  resolutionSummary?: string;
}

export class FaultsQueryParams {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: FaultStatus })
  @IsEnum(FaultStatus)
  @IsOptional()
  status?: FaultStatus;

  @ApiPropertyOptional({ enum: FaultPriority })
  @IsEnum(FaultPriority)
  @IsOptional()
  priority?: FaultPriority;

  @ApiPropertyOptional({ description: 'Arıza No, Seri No, Ürün Adı veya Müşteri Ara' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class FaultSerialProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  model?: string;
}

export class FaultSerialDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  serial: string;

  @ApiPropertyOptional()
  serialNumber?: string;

  @ApiPropertyOptional()
  macAddress?: string;

  @ApiPropertyOptional()
  customerWarrantyEnd?: string;

  @ApiPropertyOptional()
  supplierWarrantyEnd?: string;

  @ApiProperty({ type: () => FaultSerialProductDto })
  product: FaultSerialProductDto;
}

export class FaultCustomerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  email?: string;
}

export class FaultUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;
}

export class FaultRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  faultNumber: string;

  @ApiProperty()
  serialId: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiPropertyOptional()
  contactPerson?: string;

  @ApiPropertyOptional()
  contactPhone?: string;

  @ApiProperty()
  reportedProblem: string;

  @ApiProperty({ enum: FaultStatus })
  status: FaultStatus;

  @ApiProperty({ enum: FaultPriority })
  priority: FaultPriority;

  @ApiProperty()
  underCustomerWarranty: boolean;

  @ApiProperty()
  underSupplierWarranty: boolean;

  @ApiPropertyOptional()
  technicianNotes?: string;

  @ApiPropertyOptional()
  resolutionSummary?: string;

  @ApiProperty()
  receivedDate: string;

  @ApiPropertyOptional()
  resolvedDate?: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: () => FaultSerialDto })
  serial?: FaultSerialDto;

  @ApiPropertyOptional({ type: () => FaultCustomerDto })
  customer?: FaultCustomerDto;

  @ApiPropertyOptional({ type: () => FaultUserDto })
  createdBy?: FaultUserDto;

  @ApiPropertyOptional()
  auditLogs?: any[];

  @ApiPropertyOptional()
  previousFaults?: any[];

  @ApiPropertyOptional()
  movements?: any[];
}

export class FaultsPaginatedResponseDto {
  @ApiProperty({ type: [FaultRecordResponseDto] })
  items: FaultRecordResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
