import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppModule } from '../common/enums/crm.enums';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission(AppModule.SUPPLIERS, 'view')
  @ApiOperation({ summary: 'Tedarikçileri Listele' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [SupplierDto] })
  async findAll(@Query('onlyActive') onlyActive?: string) {
    return this.suppliersService.findAll(onlyActive === 'true');
  }

  @Get(':id')
  @RequirePermission(AppModule.SUPPLIERS, 'view')
  @ApiOperation({ summary: 'Tedarikçi Detayını Getir' })
  @ApiResponse({ status: 200, type: SupplierDto })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermission(AppModule.SUPPLIERS, 'create')
  @ApiOperation({ summary: 'Yeni Tedarikçi Tanımla' })
  @ApiResponse({ status: 201, type: SupplierDto })
  async create(@Body() dto: CreateSupplierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.create(dto, user);
  }

  @Put(':id')
  @RequirePermission(AppModule.SUPPLIERS, 'edit')
  @ApiOperation({ summary: 'Tedarikçi Bilgilerini Güncelle' })
  @ApiResponse({ status: 200, type: SupplierDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.update(id, dto, user);
  }

  @Patch(':id/toggle-active')
  @RequirePermission(AppModule.SUPPLIERS, 'edit')
  @ApiOperation({ summary: 'Tedarikçiyi Aktif/Pasif Yap' })
  @ApiResponse({ status: 200, type: SupplierDto })
  async toggleActive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.toggleActive(id, user);
  }
}
