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
  AddBarcodeDto,
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
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Ürün veya hizmet bilgilerini güncelle' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Post(':id/barcodes')
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Ürüne Barkod Ekle' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  addBarcode(
    @Param('id') id: string,
    @Body() dto: AddBarcodeDto,
  ) {
    return this.productsService.addBarcode(id, dto.barcode, !!dto.isDefault);
  }

  @Delete(':id/barcodes/:barcodeId')
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Üründen Barkod Sil' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  @ApiParam({ name: 'barcodeId', description: 'Barkod ID' })
  removeBarcode(@Param('id') id: string, @Param('barcodeId') barcodeId: string) {
    return this.productsService.removeBarcode(id, barcodeId);
  }

  @Patch(':id/barcodes/:barcodeId/set-default')
  @Roles(Role.SALES_MANAGER, Role.SALES_REP)
  @ApiOperation({ summary: 'Barkodu Varsayılan Yap' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  @ApiParam({ name: 'barcodeId', description: 'Barkod ID' })
  setDefaultBarcode(@Param('id') id: string, @Param('barcodeId') barcodeId: string) {
    return this.productsService.setDefaultBarcode(id, barcodeId);
  }

  @Delete(':id')
  @Roles(Role.SALES_MANAGER)
  @ApiOperation({ summary: 'Ürünü katalogdan kaldır / pasife al (Yalnızca Satış Müdürü)' })
  @ApiParam({ name: 'id', description: 'Ürün ID' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
