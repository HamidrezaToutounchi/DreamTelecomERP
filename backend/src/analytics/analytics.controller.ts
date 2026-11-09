import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  DashboardSummaryResponseDto,
  DetailedReportsQueryDto,
  DetailedReportsResponseDto,
} from './dto/analytics.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SALES_MANAGER)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard-summary')
  @ApiOperation({
    summary: 'Satış Müdürü Dashboard Özeti (KPI Kartları & Pasta Grafikler)',
    description: 'Temsilci bazlı satış tutarları, teklif dağılımları, toplam ciro, onay oranı ve dönüşüm metrikleri.',
  })
  @ApiResponse({ status: 200, type: DashboardSummaryResponseDto })
  async getDashboardSummary(): Promise<DashboardSummaryResponseDto> {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('detailed-reports')
  @ApiOperation({
    summary: 'Filtrelenebilir Detaylı Performans Raporları',
    description: 'Tarih aralığı, temsilci, teklif durumu, fatura durumu ve lead kaynağına göre filtrelenebilir metrikler.',
  })
  @ApiResponse({ status: 200, type: DetailedReportsResponseDto })
  async getDetailedReports(
    @Query() query: DetailedReportsQueryDto,
  ): Promise<DetailedReportsResponseDto> {
    return this.analyticsService.getDetailedReports(query);
  }
}
