import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCustomerCategoryDto, CustomerCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customer-categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Yeni Müşteri Kategorisi Ekle (Yalnızca Satış Müdürü)' })
  @ApiResponse({ status: 201, type: CustomerCategoryDto })
  async create(@Body() dto: CreateCustomerCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tüm Müşteri Kategorilerini Listele' })
  @ApiResponse({ status: 200, type: [CustomerCategoryDto] })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Delete(':id')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Müşteri Kategorisini Sil (Yalnızca Satış Müdürü)' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
