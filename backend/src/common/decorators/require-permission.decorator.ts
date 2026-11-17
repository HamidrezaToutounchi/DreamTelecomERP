import { SetMetadata } from '@nestjs/common';
import { AppModule, PermissionAction } from '../enums/crm.enums';

export const PERMISSION_CHECK_KEY = 'permission_check';

export interface RequiredPermission {
  module: AppModule;
  action: PermissionAction;
}

export const RequirePermission = (module: AppModule, action: PermissionAction) =>
  SetMetadata(PERMISSION_CHECK_KEY, { module, action });
