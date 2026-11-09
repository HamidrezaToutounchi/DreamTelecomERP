import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  DashboardSummaryQueryDto,
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
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('exchange-rate')
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'TCMB Güncel USD/TRY Döviz Kuru' })
  async getExchangeRate() {
    return this.analyticsService.getExchangeRate();
  }

  @Get('dashboard-summary')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({
    summary: 'Satış Müdürü Dashboard Özeti (KPI Kartları & Pasta Grafikler)',
    description: 'Temsilci bazlı satış tutarları, teklif dağılımları, toplam ciro, onay oranı ve dönüşüm metrikleri.',
  })
  @ApiResponse({ status: 200, type: DashboardSummaryResponseDto })
  async getDashboardSummary(
    @Query() query: DashboardSummaryQueryDto,
  ): Promise<DashboardSummaryResponseDto> {
    return this.analyticsService.getDashboardSummary(query?.companyId);
  }

  @Get('detailed-reports')
  @Roles(Role.SALES_MANAGER)
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
