import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginationMetaDto } from '../../common/dto/paginated-response.dto';
import { Role } from '../../common/enums/crm.enums';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Kullanıcı ID filtresi' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'İşlem türü filtresi (CREATE, UPDATE, DELETE, REASSIGN, CONVERT, LOGIN vb.)' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: 'Varlık filtresi (LEAD, CUSTOMER, QUOTE, SALE, PRODUCT, USER, AUTH)' })
  @IsString()
  @IsOptional()
  entity?: string;
}

export class AuditLogDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiPropertyOptional()
  userName?: string | null;

  @ApiPropertyOptional()
  userEmail?: string | null;

  @ApiPropertyOptional({ enum: Role })
  userRole?: Role | null;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entity: string;

  @ApiPropertyOptional()
  entityId?: string | null;

  @ApiPropertyOptional()
  details?: string | null;

  @ApiPropertyOptional()
  ipAddress?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogDto] })
  data: AuditLogDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
