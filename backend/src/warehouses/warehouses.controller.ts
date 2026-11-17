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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto, WarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppModule } from '../common/enums/crm.enums';

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @RequirePermission(AppModule.WAREHOUSES, 'view')
  @ApiOperation({ summary: 'Depoları Listele' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [WarehouseDto] })
  async findAll(@Query('onlyActive') onlyActive?: string) {
    return this.warehousesService.findAll(onlyActive === 'true');
  }

  @Get(':id')
  @RequirePermission(AppModule.WAREHOUSES, 'view')
  @ApiOperation({ summary: 'Depo Detayını Getir' })
  @ApiResponse({ status: 200, type: WarehouseDto })
  async findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @RequirePermission(AppModule.WAREHOUSES, 'create')
  @ApiOperation({ summary: 'Yeni Depo Tanımla' })
  @ApiResponse({ status: 201, type: WarehouseDto })
  async create(@Body() dto: CreateWarehouseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.warehousesService.create(dto, user);
  }

  @Put(':id')
  @RequirePermission(AppModule.WAREHOUSES, 'edit')
  @ApiOperation({ summary: 'Depo Bilgilerini Güncelle' })
  @ApiResponse({ status: 200, type: WarehouseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehousesService.update(id, dto, user);
  }

  @Patch(':id/toggle-active')
  @RequirePermission(AppModule.WAREHOUSES, 'edit')
  @ApiOperation({ summary: 'Depoyu Aktif/Pasif Yap' })
  @ApiResponse({ status: 200, type: WarehouseDto })
  async toggleActive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.warehousesService.toggleActive(id, user);
  }
}
