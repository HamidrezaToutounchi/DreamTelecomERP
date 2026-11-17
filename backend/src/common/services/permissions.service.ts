import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppModule, PermissionAction, Role } from '../enums/crm.enums';
import { UserPermissionMap } from '../decorators/current-user.decorator';

interface CachedUserPermissions {
  permissions: UserPermissionMap;
  isSuperAdmin: boolean;
  appRoleId?: string | null;
  appRoleName?: string | null;
  expiresAt: number;
}

@Injectable()
export class PermissionsService {
  private cache = new Map<string, CachedUserPermissions>();
  private readonly TTL_MS = 60 * 1000; // 60 saniye cache

  constructor(private prisma: PrismaService) {}

  /**
   * Kullanıcının etkin izin haritasını döner (Cache destekli)
   */
  async getUserPermissions(userId: string): Promise<{
    permissions: UserPermissionMap;
    isSuperAdmin: boolean;
    appRoleId?: string | null;
    appRoleName?: string | null;
  }> {
    const cached = this.cache.get(userId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return {
        permissions: cached.permissions,
        isSuperAdmin: cached.isSuperAdmin,
        appRoleId: cached.appRoleId,
        appRoleName: cached.appRoleName,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isSuperAdmin: true,
        appRoleId: true,
        appRole: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return {
        permissions: this.getEmptyPermissions(),
        isSuperAdmin: false,
      };
    }

    const permissions = this.resolvePermissions(user);
    const result = {
      permissions,
      isSuperAdmin: user.isSuperAdmin,
      appRoleId: user.appRoleId,
      appRoleName: user.appRole?.name,
    };

    this.cache.set(userId, {
      ...result,
      expiresAt: now + this.TTL_MS,
    });

    return result;
  }

  /**
   * Rol veya kullanıcı izinleri değiştiğinde cache'i temizler
   */
  invalidateUserCache(userId?: string) {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Kullanıcının belirtilen modül ve eylem için yetkisi var mı?
   */
  checkPermission(
    permissions: UserPermissionMap,
    isSuperAdmin: boolean,
    module: AppModule,
    action: PermissionAction,
  ): boolean {
    if (isSuperAdmin) {
      // Super admin her şeye yetkilidir (stokta delete hariç)
      if (this.isStockModule(module) && action === 'delete') {
        return false;
      }
      return true;
    }

    // Onay akışı ayarları sadece Super Admin'e özeldir
    if (module === AppModule.APPROVAL_SETTINGS) {
      return isSuperAdmin;
    }

    // Stok modüllerinde SİLME yetkisi hiçbir kullanıcıya verilemez
    if (this.isStockModule(module) && action === 'delete') {
      return false;
    }

    const modPerm = permissions[module];
    if (!modPerm) return false;

    switch (action) {
      case 'view':
        return Boolean(modPerm.canView);
      case 'create':
        return Boolean(modPerm.canCreate);
      case 'edit':
        return Boolean(modPerm.canEdit);
      case 'delete':
        return Boolean(modPerm.canDelete);
      case 'cancel':
        return Boolean(modPerm.canCancel);
      default:
        return false;
    }
  }

  /**
   * Stok modülü mü kontrolü (Stok modüllerinde delete ASLA yoktur)
   */
  isStockModule(module: AppModule): boolean {
    return [
      AppModule.STOCK_VIEW,
      AppModule.STOCK_ENTRY,
      AppModule.STOCK_EXIT,
      AppModule.STOCK_ADJUSTMENT,
      AppModule.WAREHOUSES,
      AppModule.SUPPLIERS,
      AppModule.FAULTS,
      AppModule.STOCK_REPORTS,
    ].includes(module);
  }

  /**
   * Kullanıcı için izin matrisini hesaplar (Geriye dönük uyum dahil)
   */
  resolvePermissions(user: {
    role: Role | string;
    isSuperAdmin: boolean;
    appRoleId?: string | null;
    appRole?: { permissions: any[] } | null;
  }): UserPermissionMap {
    const modules = Object.values(AppModule);
    const result: UserPermissionMap = {};

    // 1. Durum: Super Admin
    if (user.isSuperAdmin) {
      for (const m of modules) {
        result[m] = {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: !this.isStockModule(m),
          canCancel: true,
        };
      }
      return result;
    }

    // 2. Durum: Kullanıcıya atanmış bir AppRole varsa
    if (user.appRole && user.appRole.permissions) {
      // Önce tüm modülleri false ile başlat
      for (const m of modules) {
        result[m] = {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canCancel: false,
        };
      }

      for (const p of user.appRole.permissions) {
        const mod = p.module as AppModule;
        const isStock = this.isStockModule(mod);
        result[mod] = {
          canView: Boolean(p.canView),
          canCreate: Boolean(p.canCreate),
          canEdit: Boolean(p.canEdit),
          canDelete: isStock ? false : Boolean(p.canDelete),
          canCancel: isStock ? Boolean(p.canCancel) : false,
        };
      }

      // APPROVAL_SETTINGS rol matrisinden gelse bile sadece Super Admin yapabilir
      result[AppModule.APPROVAL_SETTINGS] = {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canCancel: false,
      };

      return result;
    }

    // 3. Durum (Geriye Dönük Uyum): appRoleId boş ise role enum'undan türet
    if (user.role === Role.SALES_MANAGER || user.role === 'SALES_MANAGER') {
      for (const m of modules) {
        if (m === AppModule.APPROVAL_SETTINGS) {
          result[m] = {
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canCancel: false,
          };
        } else {
          const isStock = this.isStockModule(m);
          result[m] = {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: !isStock,
            canCancel: isStock,
          };
        }
      }
      return result;
    }

    // SALES_REP: Bugünkü CRM erişimiyle birebir aynı; stok ve yönetim modülleri kapalı
    for (const m of modules) {
      const isCrm = [
        AppModule.LEADS,
        AppModule.CUSTOMERS,
        AppModule.QUOTES,
        AppModule.SALES,
        AppModule.PRODUCTS,
      ].includes(m);

      result[m] = {
        canView: isCrm,
        canCreate: isCrm,
        canEdit: isCrm,
        canDelete: false,
        canCancel: false,
      };
    }

    return result;
  }

  private getEmptyPermissions(): UserPermissionMap {
    const result: UserPermissionMap = {};
    for (const m of Object.values(AppModule)) {
      result[m] = {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canCancel: false,
      };
    }
    return result;
  }
}
