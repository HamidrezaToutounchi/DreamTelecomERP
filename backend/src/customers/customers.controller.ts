import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
  CustomerDto,
  PaginatedCustomerResponseDto,
} from './dto/customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni Müşteri oluştur veya Leadi Müşteriye dönüştür' })
  @ApiResponse({ status: 201, type: CustomerDto })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.create(createCustomerDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Müşterileri listele (TanStack Table v8 server-side filtreleme ve sayfalama)',
    description: 'SALES_REP sadece kendine ait/atanmış müşterileri görür, SALES_MANAGER tüm müşterileri görür.',
  })
  @ApiResponse({ status: 200, type: PaginatedCustomerResponseDto })
  async findAll(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Müşteri detayını ilişkili teklifler, satışlar ve görüşmelerle getir' })
  @ApiResponse({ status: 200, type: CustomerDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Müşteri bilgilerini güncelle' })
  @ApiResponse({ status: 200, type: CustomerDto })
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }
}
