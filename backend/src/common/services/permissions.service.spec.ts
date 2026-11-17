import { PermissionsService } from './permissions.service';
import { AppModule, Role } from '../enums/crm.enums';

describe('PermissionsService (Unit Tests)', () => {
  let service: PermissionsService;
  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    service = new PermissionsService(mockPrisma);
  });

  describe('Super Admin Yetkileri', () => {
    it('Super admin her modülde tüm yetkilere sahip olmalıdır (stokta delete hariç)', () => {
      const perms = service.resolvePermissions({
        role: Role.SALES_MANAGER,
        isSuperAdmin: true,
      });

      // CRM modülünde tam yetki
      expect(perms[AppModule.CUSTOMERS].canView).toBe(true);
      expect(perms[AppModule.CUSTOMERS].canCreate).toBe(true);
      expect(perms[AppModule.CUSTOMERS].canDelete).toBe(true);

      // Onay ayarları sadece super adminde açık
      expect(perms[AppModule.APPROVAL_SETTINGS].canView).toBe(true);

      // Stok modüllerinde SİLME yetkisi super adminde dahi ASLA true olamaz
      expect(perms[AppModule.STOCK_ENTRY].canDelete).toBe(false);
      expect(perms[AppModule.STOCK_EXIT].canDelete).toBe(false);
      expect(perms[AppModule.STOCK_ENTRY].canCancel).toBe(true);
    });
  });

  describe('Geriye Dönük Uyumluluk (appRoleId boş olan kullanıcılar)', () => {
    it('SALES_MANAGER: CRM ve Yönetim açık, Stok açık, APPROVAL_SETTINGS kapalı, Stokta canDelete false', () => {
      const perms = service.resolvePermissions({
        role: Role.SALES_MANAGER,
        isSuperAdmin: false,
        appRoleId: null,
      });

      expect(perms[AppModule.QUOTES].canView).toBe(true);
      expect(perms[AppModule.QUOTES].canDelete).toBe(true);
      expect(perms[AppModule.STOCK_VIEW].canView).toBe(true);
      expect(perms[AppModule.STOCK_ENTRY].canCreate).toBe(true);
      expect(perms[AppModule.STOCK_ENTRY].canDelete).toBe(false);
      expect(perms[AppModule.STOCK_ENTRY].canCancel).toBe(true);
      expect(perms[AppModule.APPROVAL_SETTINGS].canView).toBe(false);
    });

    it('SALES_REP: Sadece CRM modülleri açık (view, create, edit; delete false), Stok ve Yönetim kapalı', () => {
      const perms = service.resolvePermissions({
        role: Role.SALES_REP,
        isSuperAdmin: false,
        appRoleId: null,
      });

      // CRM
      expect(perms[AppModule.LEADS].canView).toBe(true);
      expect(perms[AppModule.LEADS].canCreate).toBe(true);
      expect(perms[AppModule.LEADS].canDelete).toBe(false);
      expect(perms[AppModule.QUOTES].canView).toBe(true);
      expect(perms[AppModule.QUOTES].canDelete).toBe(false);

      // Stok ve Yönetim kapalı olmalı
      expect(perms[AppModule.STOCK_VIEW].canView).toBe(false);
      expect(perms[AppModule.STOCK_ENTRY].canView).toBe(false);
      expect(perms[AppModule.USERS].canView).toBe(false);
      expect(perms[AppModule.ROLES].canView).toBe(false);
      expect(perms[AppModule.APPROVAL_SETTINGS].canView).toBe(false);
    });
  });

  describe('Özel AppRole İzinleri ve Stokta Delete Koruması', () => {
    it('Stok modülünde rol matrisinde canDelete: true gelse dahi güvenlik gereği false dönmelidir', () => {
      const perms = service.resolvePermissions({
        role: Role.SALES_REP,
        isSuperAdmin: false,
        appRoleId: 'role-123',
        appRole: {
          permissions: [
            {
              module: AppModule.STOCK_ENTRY,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true, // Kötü niyetli veya hatalı veri
              canCancel: true,
            },
            {
              module: AppModule.CUSTOMERS,
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canCancel: false,
            },
          ],
        },
      });

      expect(perms[AppModule.STOCK_ENTRY].canView).toBe(true);
      expect(perms[AppModule.STOCK_ENTRY].canCreate).toBe(true);
      expect(perms[AppModule.STOCK_ENTRY].canCancel).toBe(true);
      // Stok modülünde delete KESİNLİKLE false olmalıdır
      expect(perms[AppModule.STOCK_ENTRY].canDelete).toBe(false);
      expect(perms[AppModule.CUSTOMERS].canView).toBe(true);
      expect(perms[AppModule.CUSTOMERS].canCreate).toBe(false);
    });
  });

  describe('checkPermission Fonksiyonu', () => {
    it('İzin haritasındaki yetkiye göre doğru boolean dönmelidir', () => {
      const permissions = {
        [AppModule.CUSTOMERS]: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canCancel: false,
        },
        [AppModule.STOCK_ENTRY]: {
          canView: true,
          canCreate: true,
          canEdit: false,
          canDelete: false,
          canCancel: true,
        },
      } as any;

      expect(service.checkPermission(permissions, false, AppModule.CUSTOMERS, 'view')).toBe(true);
      expect(service.checkPermission(permissions, false, AppModule.CUSTOMERS, 'create')).toBe(false);
      expect(service.checkPermission(permissions, false, AppModule.STOCK_ENTRY, 'cancel')).toBe(true);
      expect(service.checkPermission(permissions, false, AppModule.STOCK_ENTRY, 'delete')).toBe(false);
    });
  });
});
