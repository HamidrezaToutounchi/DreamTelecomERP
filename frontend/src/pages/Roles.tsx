import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useRolesControllerFindAll,
  useRolesControllerCreate,
  useRolesControllerUpdate,
  useRolesControllerRemove,
} from '@/api/generated';
import {
  RolePermissionItemDtoModule as AppModule,
  RoleResponseDto,
  RolePermissionItemDto,
} from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// Modül Başlıkları ve Açıklamaları
interface ModuleConfig {
  key: AppModule;
  name: string;
  category: 'CRM' | 'STOCK' | 'ADMIN';
  description: string;
}

const MODULE_DEFINITIONS: ModuleConfig[] = [
  // 1. CRM
  { key: AppModule.LEADS, name: 'Potansiyel Müşteriler (Leads)', category: 'CRM', description: 'Lead havuzu, temas geçmişi ve dağıtım' },
  { key: AppModule.CUSTOMERS, name: 'Müşteriler', category: 'CRM', description: 'Müşteri kartları ve firma rehberi' },
  { key: AppModule.QUOTES, name: 'Teklif Yönetimi', category: 'CRM', description: 'Kurumsal teklifler, revizyonlar ve PDF belgeleri' },
  { key: AppModule.SALES, name: 'Satış & Faturalar', category: 'CRM', description: 'Sipariş kayıtları ve faturalandırma takibi' },
  { key: AppModule.PRODUCTS, name: 'Ürün & Hizmetler', category: 'CRM', description: 'Ürün kataloğu, fiyat listeleri ve barkodlar' },
  { key: AppModule.REPORTS, name: 'Yönetici Satış Raporları', category: 'CRM', description: 'Satış ve teklif performans analizleri' },

  // 2. STOK & SEVKİYAT
  { key: AppModule.STOCK_VIEW, name: 'Stok Durumu & Seri Sorgu', category: 'STOCK', description: 'Depo stok seviyeleri ve seri yaşam döngüsü' },
  { key: AppModule.STOCK_ENTRY, name: 'Stok Mal Kabul / Giriş', category: 'STOCK', description: 'Tedarikçiden gelen ürünlerin barkod/seri girişi' },
  { key: AppModule.STOCK_EXIT, name: 'Stok Çıkış & Sevkiyat', category: 'STOCK', description: 'Müşteri çıkış talepleri ve kargo takibi' },
  { key: AppModule.STOCK_ADJUSTMENT, name: 'Stok Sayım Düzeltmesi', category: 'STOCK', description: 'Depo sayım farkı ve envanter düzeltmeleri' },
  { key: AppModule.WAREHOUSES, name: 'Depolar', category: 'STOCK', description: 'Fiziksel depo ve şube tanımlamaları' },
  { key: AppModule.SUPPLIERS, name: 'Tedarikçiler', category: 'STOCK', description: 'Cihaz ve parça tedarikçi firmaları' },
  { key: AppModule.FAULTS, name: 'Arıza & RMA Yönetimi', category: 'STOCK', description: 'Müşteri arıza kayıtları ve cihaz değişimi' },
  { key: AppModule.STOCK_REPORTS, name: 'Stok & Arıza Raporları', category: 'STOCK', description: 'Depo değeri, ekstre ve garanti raporları' },

  // 3. YÖNETİM
  { key: AppModule.USERS, name: 'Kullanıcı Yönetimi', category: 'ADMIN', description: 'Sistem kullanıcıları ve temsilci tanımları' },
  { key: AppModule.ROLES, name: 'Roller & Yetkiler', category: 'ADMIN', description: 'Rol tanımları ve modül izin matrisi' },
  { key: AppModule.COMPANIES, name: 'Şirket Profilleri', category: 'ADMIN', description: 'Dream Telecom & Tescom Telecom antetleri' },
  { key: AppModule.CATEGORIES, name: 'Müşteri Kategorileri', category: 'ADMIN', description: 'Operatör, Kamu, KOBİ sınıflandırması' },
  { key: AppModule.AUDIT_LOGS, name: 'İşlem Logları (Audit)', category: 'ADMIN', description: 'Kullanıcı aktiviteleri ve sistem hareketleri' },
];

export const RolesPage: React.FC = () => {
  const { can, isSuperAdmin } = useAuth();

  const { data: roles = [], isLoading, refetch } = useRolesControllerFindAll();
  const createMutation = useRolesControllerCreate();
  const updateMutation = useRolesControllerUpdate();
  const removeMutation = useRolesControllerRemove();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponseDto | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissionsState, setPermissionsState] = useState<Record<AppModule, RolePermissionItemDto>>(() =>
    getInitialPermissionsState(),
  );

  // Silme Onay Modalı
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleResponseDto | null>(null);

  function getInitialPermissionsState(): Record<AppModule, RolePermissionItemDto> {
    const map: any = {};
    for (const def of MODULE_DEFINITIONS) {
      map[def.key] = {
        module: def.key,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canCancel: false,
      };
    }
    return map;
  }

  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setPermissionsState(getInitialPermissionsState());
    setModalOpen(true);
  };

  const handleOpenEdit = (role: RoleResponseDto) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');

    const map = getInitialPermissionsState();
    for (const p of role.permissions || []) {
      if (map[p.module]) {
        map[p.module] = { ...p };
      }
    }
    setPermissionsState(map);
    setModalOpen(true);
  };

  const handleTogglePerm = (module: AppModule, action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canCancel') => {
    setPermissionsState((prev) => {
      const current = prev[module];
      const nextVal = !current[action];
      return {
        ...prev,
        [module]: {
          ...current,
          [action]: nextVal,
          // Eğer create/edit/delete/cancel seçiliyorsa view otomatik true olmalı
          ...(nextVal && action !== 'canView' ? { canView: true } : {}),
        },
      };
    });
  };

  const handleToggleRow = (module: AppModule) => {
    setPermissionsState((prev) => {
      const current = prev[module];
      const isStock = MODULE_DEFINITIONS.find((m) => m.key === module)?.category === 'STOCK';
      const allActive =
        current.canView &&
        current.canCreate &&
        current.canEdit &&
        (isStock ? current.canCancel : current.canDelete);

      return {
        ...prev,
        [module]: {
          ...current,
          canView: !allActive,
          canCreate: !allActive,
          canEdit: !allActive,
          canDelete: isStock ? false : !allActive,
          canCancel: isStock ? !allActive : false,
        },
      };
    });
  };

  const handleToggleColumn = (action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canCancel') => {
    setPermissionsState((prev) => {
      const next: any = { ...prev };
      // Kolondaki uygun modüllerin hepsi açık mı kontrolü
      const applicableModules = MODULE_DEFINITIONS.filter((m) => {
        if (action === 'canDelete') return m.category !== 'STOCK';
        if (action === 'canCancel') return m.category === 'STOCK';
        return true;
      });

      const allActive = applicableModules.every((m) => next[m.key][action]);

      for (const m of applicableModules) {
        next[m.key] = {
          ...next[m.key],
          [action]: !allActive,
          ...(!allActive && action !== 'canView' ? { canView: true } : {}),
        };
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.error('Lütfen rol adı giriniz.');
      return;
    }

    const permissions = Object.values(permissionsState);

    try {
      if (editingRole) {
        await updateMutation.mutateAsync({
          id: editingRole.id,
          data: {
            name: roleName.trim(),
            description: roleDescription.trim() || undefined,
            permissions,
          },
        });
        toast.success(`"${roleName}" rolü başarıyla güncellendi.`);
      } else {
        await createMutation.mutateAsync({
          data: {
            name: roleName.trim(),
            description: roleDescription.trim() || undefined,
            permissions,
          },
        });
        toast.success(`"${roleName}" rolü başarıyla oluşturuldu.`);
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rol kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await removeMutation.mutateAsync({ id: deletingRole.id });
      toast.success(`"${deletingRole.name}" rolü başarıyla silindi.`);
      setDeleteConfirmOpen(false);
      setDeletingRole(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rol silinemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Üst Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Roller & Modül Yetkileri</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kullanıcıların erişebileceği CRM, Stok, Sevkiyat ve Yönetim modüllerini granüler CRUD izinleriyle yönetin.
          </p>
        </div>

        {can('ROLES', 'create') && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Yeni Rol Tanımla
          </button>
        )}
      </div>

      {/* Bilgilendirme Banner'ı */}
      <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-navy-950/40 border border-blue-200/60 dark:border-navy-900/60 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-navy-700 dark:text-navy-300 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-foreground">
            Güvenlik & Yetkilendirme Standartları:
          </p>
          <p>
            • <strong>Stok ve Sevkiyat Modüllerinde Silme İşlemi Yoktur:</strong> Veri bütünlüğünün ve denetim izlerinin korunması amacıyla stok hareketleri silinemez; sadece yetkili kullanıcılar tarafından zorunlu açıklamayla <em>İptal</em> edilebilir.
          </p>
          <p>
            • <strong>Sistem Rolleri:</strong> &quot;Yönetici&quot;, &quot;Satış Temsilcisi&quot;, &quot;Depo Sorumlusu&quot; ve &quot;Muhasebe&quot; sistemin omurga rolleridir ve silinemezler; ancak izin matrisleri şirketinize göre özelleştirilebilir.
          </p>
          <p>
            • <strong>Çıkış Onay Akışı Ayarları:</strong> Yalnızca sistem <em>Super Admin</em> kullanıcısı tarafından yönetilebilir.
          </p>
        </div>
      </div>

      {/* Rol Kartları Grid'i */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">Roller yükleniyor...</div>
      ) : roles.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground">Sistemde tanımlı rol bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const activePermsCount = (role.permissions || []).filter((p) => p.canView).length;
            return (
              <div
                key={role.id}
                className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-navy-100 dark:bg-navy-950 text-navy-800 dark:text-navy-300 flex items-center justify-center font-bold text-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-foreground">{role.name}</h2>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" />
                          {role.userCount} Kullanıcı Atanmış
                        </span>
                      </div>
                    </div>

                    {role.isSystem ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-2.5 h-2.5" />
                        Sistem Rolü
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-navy-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        <Sparkles className="w-2.5 h-2.5" />
                        Özel Rol
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {role.description || 'Bu rol için özel bir açıklama girilmemiş.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Erişilebilen Modüller:</span>
                    <span className="font-extrabold text-navy-700 dark:text-navy-300">
                      {activePermsCount} / {MODULE_DEFINITIONS.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {can('ROLES', 'edit') && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(role)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-950 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-900 border border-navy-200/50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        İzin Matrisini Düzenle
                      </button>
                    )}

                    {can('ROLES', 'delete') && (
                      <button
                        type="button"
                        disabled={role.isSystem || role.userCount > 0}
                        onClick={() => {
                          setDeletingRole(role);
                          setDeleteConfirmOpen(true);
                        }}
                        title={
                          role.isSystem
                            ? 'Sistem rolleri silinemez'
                            : role.userCount > 0
                            ? 'Bu role atanmış kullanıcılar olduğu için silinemez'
                            : 'Rolü sil'
                        }
                        className={cn(
                          'p-1.5 text-xs rounded-lg transition-colors inline-flex items-center',
                          role.isSystem || role.userCount > 0
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer',
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== ROL OLUŞTURMA & DÜZENLEME MODALI ===================== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-5xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Başlık */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy-600 text-white flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {editingRole ? `"${editingRole.name}" Rolünü Düzenle` : 'Yeni Rol Tanımla'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modül bazlı Görüntüleme, Ekleme, Düzenleme, Silme ve İptal izin matrisi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Gövde Formu */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Rol Temel Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Rol Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Örn: Kıdemli Depo Sorumlusu"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-background border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Açıklama (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Örn: Tüm depolarda mal kabul ve sevkiyat yetkisi vardır"
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-background border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              {/* İzin Matrisi Tablosu */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                    Modül Bazlı İzin Matrisi
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Sütun veya satır başlıklarına tıklayarak toplu seçim yapabilirsiniz.
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-muted-foreground font-semibold">
                          <th className="py-3 px-4">MODÜL & YETKİ ALANI</th>
                          <th className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleColumn('canView')}
                              className="hover:text-foreground font-bold hover:underline cursor-pointer"
                              title="Tüm modüllerde görüntüleme yetkisini aç / kapat"
                            >
                              GÖRÜNTÜLE
                            </button>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleColumn('canCreate')}
                              className="hover:text-foreground font-bold hover:underline cursor-pointer"
                              title="Tüm modüllerde ekleme yetkisini aç / kapat"
                            >
                              EKLE
                            </button>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleColumn('canEdit')}
                              className="hover:text-foreground font-bold hover:underline cursor-pointer"
                              title="Tüm modüllerde düzenleme yetkisini aç / kapat"
                            >
                              DÜZENLE
                            </button>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleColumn('canDelete')}
                              className="hover:text-foreground font-bold hover:underline cursor-pointer"
                              title="CRM ve Yönetim modüllerinde silme yetkisini aç / kapat"
                            >
                              SİL (CRM)
                            </button>
                          </th>
                          <th className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleColumn('canCancel')}
                              className="hover:text-foreground font-bold hover:underline cursor-pointer"
                              title="Stok modüllerinde iptal etme yetkisini aç / kapat"
                            >
                              İPTAL (STOK)
                            </button>
                          </th>
                          <th className="py-3 px-3 text-right">SATIR SEÇİMİ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {['CRM', 'STOCK', 'ADMIN'].map((category) => {
                          const catModules = MODULE_DEFINITIONS.filter((m) => m.category === category);
                          const catTitle =
                            category === 'CRM'
                              ? '🏢 CRM & Satış Modülleri'
                              : category === 'STOCK'
                              ? '📦 Stok, Depo & Arıza Modülleri'
                              : '⚙️ Sistem & Yönetim Modülleri';

                          return (
                            <React.Fragment key={category}>
                              <tr className="bg-slate-100/50 dark:bg-slate-900/30">
                                <td colSpan={7} className="py-2 px-4 font-black text-[11px] text-navy-800 dark:text-navy-200 uppercase tracking-wider">
                                  {catTitle}
                                </td>
                              </tr>
                              {catModules.map((m) => {
                                const p = permissionsState[m.key] || {
                                  canView: false,
                                  canCreate: false,
                                  canEdit: false,
                                  canDelete: false,
                                  canCancel: false,
                                };
                                const isStock = m.category === 'STOCK';

                                return (
                                  <tr key={m.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                    <td className="py-2.5 px-4">
                                      <div className="font-bold text-foreground">{m.name}</div>
                                      <div className="text-[10px] text-muted-foreground">{m.description}</div>
                                    </td>

                                    {/* GÖRÜNTÜLE */}
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={p.canView}
                                        onChange={() => handleTogglePerm(m.key, 'canView')}
                                        className="w-4 h-4 rounded text-navy-600 focus:ring-navy-500 cursor-pointer"
                                      />
                                    </td>

                                    {/* EKLE */}
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={p.canCreate}
                                        onChange={() => handleTogglePerm(m.key, 'canCreate')}
                                        className="w-4 h-4 rounded text-navy-600 focus:ring-navy-500 cursor-pointer"
                                      />
                                    </td>

                                    {/* DÜZENLE */}
                                    <td className="py-2.5 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={p.canEdit}
                                        onChange={() => handleTogglePerm(m.key, 'canEdit')}
                                        className="w-4 h-4 rounded text-navy-600 focus:ring-navy-500 cursor-pointer"
                                      />
                                    </td>

                                    {/* SİL (Sadece CRM & Yönetim, Stokta ASLA yok) */}
                                    <td className="py-2.5 px-3 text-center">
                                      {isStock ? (
                                        <span
                                          className="text-slate-300 dark:text-slate-700 text-xs font-bold"
                                          title="Stok modüllerinde silme işlemi güvenlik ve denetim gereği kapalıdır"
                                        >
                                          —
                                        </span>
                                      ) : (
                                        <input
                                          type="checkbox"
                                          checked={p.canDelete}
                                          onChange={() => handleTogglePerm(m.key, 'canDelete')}
                                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                                        />
                                      )}
                                    </td>

                                    {/* İPTAL (Sadece Stok Modüllerinde) */}
                                    <td className="py-2.5 px-3 text-center">
                                      {isStock ? (
                                        <input
                                          type="checkbox"
                                          checked={p.canCancel}
                                          onChange={() => handleTogglePerm(m.key, 'canCancel')}
                                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                        />
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-700 text-xs font-bold">—</span>
                                      )}
                                    </td>

                                    {/* Satır Seç / Temizle Butonu */}
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleRow(m.key)}
                                        className="text-[11px] font-bold text-navy-700 dark:text-navy-300 hover:underline cursor-pointer"
                                      >
                                        Tümü
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Alt Butonları */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-navy-700 hover:bg-navy-800 text-white transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingRole ? 'Rolü Güncelle' : 'Rolü Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {deleteConfirmOpen && deletingRole && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-foreground">Rolü Silmek İstediğinize Emin misiniz?</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>&quot;{deletingRole.name}&quot;</strong> isimli özel rol kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={removeMutation.isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
