import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeadStatus, InteractionType } from '../../common/enums/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';
import { IsValidPhone, IsValidEmailStrict } from '../../common/utils/phone-validator.util';

export class CreateLeadDto {
  @ApiProperty({ example: 'Arçelik A.Ş.' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'Mehmet Demir' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '0532 111 22 33' })
  @IsString()
  @IsNotEmpty({ message: 'Telefon numarası kesinlikle boş bırakılamaz.' })
  @IsValidPhone({ message: 'Lütfen geçerli ve gerçek bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).' })
  phone: string;

  @ApiPropertyOptional({ example: 'mehmet@arcelik.com' })
  @IsValidEmailStrict({ message: 'Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@sirket.com).' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Web Form', default: 'Web' })
  @IsString()
  @IsOptional()
  source?: string = 'Web';

  @ApiPropertyOptional({ enum: LeadStatus, default: LeadStatus.NEW })
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus = LeadStatus.NEW;

  @ApiPropertyOptional({ description: 'Atanacak Temsilci ID (Yalnızca Manager atayabilir veya otomatik atanır)' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'İnternet altyapısı ve fiber hat talebi var.' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Arçelik A.Ş.' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'Mehmet Demir' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: '0532 111 22 33' })
  @IsString()
  @IsValidPhone({ message: 'Lütfen geçerli ve gerçek bir telefon numarası giriniz (Örn: 0532 111 22 33 veya 0212 345 67 89).' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'mehmet@arcelik.com' })
  @IsValidEmailStrict({ message: 'Lütfen geçerli bir e-posta adresi giriniz (Örn: ad.soyad@sirket.com).' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Web Form' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class QuickActionLeadDto {
  @ApiProperty({ enum: LeadStatus, example: LeadStatus.CALLED_REACHED })
  @IsEnum(LeadStatus)
  @IsNotEmpty()
  status: LeadStatus;

  @ApiProperty({ example: 'Müşteriyle telefonla görüşüldü, fiber hat için teklif istendi.' })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ enum: InteractionType, default: InteractionType.PHONE_CALL })
  @IsEnum(InteractionType)
  @IsOptional()
  type?: InteractionType = InteractionType.PHONE_CALL;

  @ApiPropertyOptional({ example: '2026-11-20T15:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  nextFollowUpDate?: string;
}

export class LeadQueryDto extends PaginationQueryDto {}

export class LeadDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  contactName: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiProperty()
  source: string;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  @ApiPropertyOptional()
  assignedToId?: string | null;

  @ApiPropertyOptional({ description: 'Atanan satış temsilcisi bilgileri' })
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional({ description: 'Oluşturan kullanıcı bilgileri' })
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiPropertyOptional()
  lastActionAt?: Date | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({ type: () => [Object], description: 'Görüşme ve işlem geçmişi zaman tüneli' })
  interactions?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedLeadResponseDto {
  @ApiProperty({ type: [LeadDto] })
  data: LeadDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export enum DistributionStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  MANUAL_SPLIT = 'MANUAL_SPLIT',
}

export class ManualSplitItemDto {
  @ApiProperty({ description: 'Temsilci ID' })
  @IsUUID()
  repId: string;

  @ApiProperty({ description: 'Bu temsilciye atanacak adet', example: 5 })
  count: number;
}

export class ImportExcelResultDto {
  @ApiProperty({ example: 50 })
  totalImported: number;

  @ApiProperty({ example: { 'rep-uuid-1': 25, 'rep-uuid-2': 25 } })
  distributionSummary: Record<string, number>;
}
