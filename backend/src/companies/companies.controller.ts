import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CompanyDto, UpdateCompanyDto } from './dto/companies.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm şirket profillerini listele (Dream & Tescom)' })
  @ApiResponse({ status: 200, type: [CompanyDto] })
  async findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Şirket detayını getir' })
  @ApiResponse({ status: 200, type: CompanyDto })
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Şirket bilgilerini güncelle (Ünvan, adres, telefon, e-posta, logo vb.)' })
  @ApiResponse({ status: 200, type: CompanyDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }
}
