import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import {
  CreateSaleDto,
  UpdateSaleDto,
  SaleQueryDto,
  SaleDto,
  PaginatedSaleResponseDto,
} from './dto/sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni Satış / Sipariş Kaydı Oluştur' })
  @ApiResponse({ status: 201, type: SaleDto })
  async create(
    @Body() createSaleDto: CreateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.create(createSaleDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Satışları listele (TanStack Table v8 server-side filtreleme ve sayfalama)',
    description: 'SALES_REP sadece kendi satışlarını görür, SALES_MANAGER tüm satışları görür.',
  })
  @ApiResponse({ status: 200, type: PaginatedSaleResponseDto })
  async findAll(
    @Query() query: SaleQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Satış detayını getir' })
  @ApiResponse({ status: 200, type: SaleDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Satış veya Fatura bilgilerini güncelle' })
  @ApiResponse({ status: 200, type: SaleDto })
  async update(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.update(id, updateSaleDto, user);
  }
}
