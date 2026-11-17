import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/crm.enums';

export interface UserPermissionMap {
  [module: string]: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCancel: boolean;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role | 'SALES_REP' | 'SALES_MANAGER';
  isSuperAdmin?: boolean;
  appRoleId?: string | null;
  appRoleName?: string | null;
  permissions?: UserPermissionMap;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  },
);
