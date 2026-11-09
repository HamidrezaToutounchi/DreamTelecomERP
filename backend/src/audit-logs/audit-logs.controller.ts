import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto, PaginatedAuditLogResponseDto } from './dto/audit-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({
    summary: 'Kullanıcı işlem ve aktivite loglarını getir (Yalnızca Satış Müdürü)',
    description: 'Sistemdeki tüm ekleme, güncelleme, atama, satış, giriş ve silme hareketlerini filtreleyerek listeler.',
  })
  @ApiResponse({ status: 200, type: PaginatedAuditLogResponseDto })
  async findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
