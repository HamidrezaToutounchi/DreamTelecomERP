import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductDto,
  PaginatedProductResponseDto,
  ProductSalesStatDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/crm.enums';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Yeni ürün veya hizmet tanımla (Mükerrer kontrolü ile)' })
  @ApiResponse({ status: 201, type: ProductDto })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Ürün ve hizmet kataloğunu listele' })
  @ApiResponse({ status: 200, type: PaginatedProductResponseDto })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get('sales-report')
  @ApiOperation({ summary: 'Ürün ve hizmet bazlı satış raporu (Adet, ciro ve işlem sayısı)' })
  @ApiResponse({ status: 200, type: [ProductSalesStatDto] })
  getProductSalesSummary() {
    return this.productsService.getProductSalesSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ürün veya hizmet detayını getir' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Ürün veya hizmet bilgilerini güncelle (Yalnızca Satış Müdürü)' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Ürünü katalogdan kaldır / pasife al (Yalnızca Satış Müdürü)' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
