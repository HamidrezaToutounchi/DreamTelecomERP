import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from './dto/roles.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppModule } from '../common/enums/crm.enums';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission(AppModule.ROLES, 'view')
  @ApiOperation({ summary: 'Tüm sistem ve özel rolleri listele' })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  findAll(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission(AppModule.ROLES, 'view')
  @ApiOperation({ summary: 'Rol detayını ve izin matrisini getir' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  findOne(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermission(AppModule.ROLES, 'create')
  @ApiOperation({ summary: 'Yeni rol ve yetki matrisi oluştur' })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.rolesService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermission(AppModule.ROLES, 'edit')
  @ApiOperation({ summary: 'Rol bilgilerini ve yetki matrisini güncelle' })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoleResponseDto> {
    return this.rolesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission(AppModule.ROLES, 'delete')
  @ApiOperation({ summary: 'Rolü sil (Sistem rolleri ve atanmış kullanıcısı olanlar silinemez)' })
  @ApiResponse({ status: 200, description: 'Silme sonucu' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.rolesService.remove(id, user);
  }
}
