import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { InteractionType } from '../../common/enums/crm.enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';

export class CreateInteractionDto {
  @ApiPropertyOptional({ description: 'İlişkili Müşteri ID (veya leadId verilmelidir)' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'İlişkili Lead ID (veya customerId verilmelidir)' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiProperty({ enum: InteractionType, example: InteractionType.PHONE_CALL })
  @IsEnum(InteractionType)
  @IsNotEmpty()
  type: InteractionType;

  @ApiProperty({ example: 'Ayşe Kaya (Satınalma Müdürü)' })
  @IsString()
  @IsNotEmpty()
  contactedPerson: string;

  @ApiProperty({ example: 'Fiber altyapı ve Metro Ethernet fiyat teklifi istediler. 500 Mbps hız seçeneği sunuldu.' })
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiPropertyOptional({ example: '2026-11-15T10:00:00.000Z', description: 'Bir sonraki takip/arama tarihi' })
  @IsDateString()
  @IsOptional()
  nextFollowUpDate?: string;
}

export class UpdateInteractionDto {
  @ApiPropertyOptional({ enum: InteractionType })
  @IsEnum(InteractionType)
  @IsOptional()
  type?: InteractionType;

  @ApiPropertyOptional({ example: 'Ayşe Kaya' })
  @IsString()
  @IsOptional()
  contactedPerson?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ example: '2026-11-15T10:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  nextFollowUpDate?: string;
}

export class InteractionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Müşteri ID filtresi' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Lead ID filtresi' })
  @IsUUID()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ enum: InteractionType, description: 'Etkileşim türü filtresi' })
  @IsEnum(InteractionType)
  @IsOptional()
  interactionType?: InteractionType;
}

export class InteractionDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  customerId?: string | null;

  @ApiPropertyOptional()
  customer?: { id: string; companyName: string } | null;

  @ApiPropertyOptional()
  leadId?: string | null;

  @ApiPropertyOptional()
  lead?: { id: string; companyName: string } | null;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  user?: { id: string; fullName: string; email: string };

  @ApiProperty({ enum: InteractionType })
  type: InteractionType;

  @ApiProperty()
  contactedPerson: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional()
  nextFollowUpDate?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedInteractionResponseDto {
  @ApiProperty({ type: [InteractionDto] })
  data: InteractionDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
