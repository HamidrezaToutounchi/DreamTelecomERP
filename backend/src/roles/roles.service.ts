import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto, RolePermissionItemDto } from './dto/roles.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PermissionsService } from '../common/services/permissions.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppModule } from '../common/enums/crm.enums';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
    private permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.appRole.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles.map((r) => this.mapRoleResponse(r));
  }

  async findOne(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol bulunamadı.');
    }

    return this.mapRoleResponse(role);
  }

  async create(dto: CreateRoleDto, user?: AuthenticatedUser): Promise<RoleResponseDto> {
    const name = dto.name.trim();
    const existing = await this.prisma.appRole.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`"${name}" isimli bir rol zaten mevcut.`);
    }

    // Stok modüllerinde canDelete'i kesinlikle engelle
    const permissionsData = (dto.permissions || []).map((p) => {
      const isStock = this.permissionsService.isStockModule(p.module);
      return {
        module: p.module,
        canView: Boolean(p.canView),
        canCreate: Boolean(p.canCreate),
        canEdit: Boolean(p.canEdit),
        canDelete: isStock ? false : Boolean(p.canDelete),
        canCancel: isStock ? Boolean(p.canCancel) : false,
      };
    });

    const newRole = await this.prisma.$transaction(async (tx) => {
      const createdRole = await tx.appRole.create({
        data: {
          name,
          description: dto.description?.trim() || null,
          isSystem: false,
          permissions: {
            create: permissionsData,
          },
        },
        include: {
          permissions: true,
          _count: { select: { users: true } },
        },
      });

      return createdRole;
    });

    if (user) {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role as any,
        action: 'CREATE',
        entity: 'ROLE',
        entityId: newRole.id,
        details: `"${newRole.name}" isimli yeni rol ve yetki matrisi tanımlandı.`,
      });
    }

    this.permissionsService.invalidateUserCache();
    return this.mapRoleResponse(newRole);
  }

  async update(id: string, dto: UpdateRoleDto, user?: AuthenticatedUser): Promise<RoleResponseDto> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException('Rol bulunamadı.');
    }

    if (dto.name && dto.name.trim() !== role.name) {
      const nameTaken = await this.prisma.appRole.findUnique({
        where: { name: dto.name.trim() },
      });
      if (nameTaken) {
        throw new ConflictException(`"${dto.name.trim()}" isimli başka bir rol zaten mevcut.`);
      }
    }

    const updatedRole = await this.prisma.$transaction(async (tx) => {
      if (dto.permissions) {
        // Mevcut izinleri sil ve yenilerini ekle
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        const permissionsData = dto.permissions.map((p) => {
          const isStock = this.permissionsService.isStockModule(p.module);
          return {
            roleId: id,
            module: p.module,
            canView: Boolean(p.canView),
            canCreate: Boolean(p.canCreate),
            canEdit: Boolean(p.canEdit),
            canDelete: isStock ? false : Boolean(p.canDelete),
            canCancel: isStock ? Boolean(p.canCancel) : false,
          };
        });

        await tx.rolePermission.createMany({
          data: permissionsData,
        });
      }

      return tx.appRole.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        },
        include: {
          permissions: true,
          _count: { select: { users: true } },
        },
      });
    });

    if (user) {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role as any,
        action: 'UPDATE',
        entity: 'ROLE',
        entityId: updatedRole.id,
        details: `"${updatedRole.name}" rolü ve yetki matrisi güncellendi.`,
      });
    }

    this.permissionsService.invalidateUserCache();
    return this.mapRoleResponse(updatedRole);
  }

  async remove(id: string, user?: AuthenticatedUser): Promise<{ success: boolean; message: string }> {
    const role = await this.prisma.appRole.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol bulunamadı.');
    }

    if (role.isSystem) {
      throw new BadRequestException('Sistem tarafından tanımlanmış roller silinemez.');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Bu role atanmış ${role._count.users} kullanıcı bulunmaktadır. Önce kullanıcıların rolünü değiştiriniz.`,
      );
    }

    await this.prisma.appRole.delete({ where: { id } });

    if (user) {
      await this.auditLogsService.log({
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role as any,
        action: 'DELETE',
        entity: 'ROLE',
        entityId: id,
        details: `"${role.name}" rolü silindi.`,
      });
    }

    this.permissionsService.invalidateUserCache();
    return { success: true, message: `"${role.name}" rolü başarıyla silindi.` };
  }

  private mapRoleResponse(role: any): RoleResponseDto {
    const allModules = Object.values(AppModule);
    const permMap = new Map<AppModule, RolePermissionItemDto>();

    for (const p of role.permissions || []) {
      permMap.set(p.module as AppModule, {
        module: p.module as AppModule,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canCancel: p.canCancel,
      });
    }

    // Tüm modüllerin matriste eksiksiz listelenmesini sağla
    const permissions: RolePermissionItemDto[] = allModules.map((m) => {
      return (
        permMap.get(m) || {
          module: m,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canCancel: false,
        }
      );
    });

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count?.users || 0,
      permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
