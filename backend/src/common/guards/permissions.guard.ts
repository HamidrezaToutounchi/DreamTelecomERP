import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_CHECK_KEY, RequiredPermission } from '../decorators/require-permission.decorator';
import { PermissionsService } from '../services/permissions.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Endpoint üzerinde @RequirePermission dekoratörü yoksa geçişe izin ver
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user || !user.id) {
      throw new UnauthorizedException('Kullanıcı oturumu bulunamadı.');
    }

    const { permissions, isSuperAdmin, appRoleId, appRoleName } =
      await this.permissionsService.getUserPermissions(user.id);

    // Request objesindeki user'a izinleri iliştir
    user.permissions = permissions;
    user.isSuperAdmin = isSuperAdmin;
    user.appRoleId = appRoleId;
    user.appRoleName = appRoleName;

    const hasAccess = this.permissionsService.checkPermission(
      permissions,
      isSuperAdmin,
      requiredPermission.module,
      requiredPermission.action,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Bu işlem için yetkiniz bulunmamaktadır (${requiredPermission.module} - ${requiredPermission.action.toUpperCase()}).`,
      );
    }

    return true;
  }
}
