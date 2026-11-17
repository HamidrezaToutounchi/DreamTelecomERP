import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStockControllerGetApprovalSettings,
  useStockControllerCreateApprovalSetting,
  useStockControllerUpdateApprovalSetting,
  useStockControllerRemoveApprovalSetting,
  useRolesControllerFindAll,
  useUsersControllerFindAll,
} from '@/api/generated';
import { ApprovalSettingResponseDto } from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function ApprovalSettings() {
  const queryClient = useQueryClient();
  const { user, isManager } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<ApprovalSettingResponseDto | null>(null);

  // Form State
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState('');
  const [assigneeType, setAssigneeType] = useState<'ROLE' | 'USER' | 'ANY'>('ANY');
  const [roleId, setRoleId] = useState('');
  const [userId, setUserId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // API Queries & Mutations
  const { data: settingsData, isLoading, refetch } = useStockControllerGetApprovalSettings();
  const settings = (settingsData as ApprovalSettingResponseDto[]) || [];

  const { data: rolesData } = useRolesControllerFindAll();
  const roles = rolesData || [];

  const { data: usersData } = useUsersControllerFindAll();
  const users = (usersData as any[]) || [];

  const createMutation = useStockControllerCreateApprovalSetting({
    mutation: {
      onSuccess: () => {
        toast.success('Yeni onay adımı başarıyla eklendi.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/approval-settings'] });
        handleCloseModal();
      },
      onError: (err: any) => {
        toast.error(`Onay adımı eklenemedi: ${err?.response?.data?.message || err?.message}`);
      },
    },
  });

  const updateMutation = useStockControllerUpdateApprovalSetting({
    mutation: {
      onSuccess: () => {
        toast.success('Onay adımı güncellendi.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/approval-settings'] });
        handleCloseModal();
      },
      onError: (err: any) => {
        toast.error(`Güncellenemedi: ${err?.response?.data?.message || err?.message}`);
      },
    },
  });

  const removeMutation = useStockControllerRemoveApprovalSetting({
    mutation: {
      onSuccess: () => {
        toast.success('Onay adımı silindi.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/approval-settings'] });
      },
      onError: (err: any) => {
        toast.error(`Silinemedi: ${err?.response?.data?.message || err?.message}`);
      },
    },
  });

  const handleOpenCreateModal = () => {
    setEditingSetting(null);
    const nextStep = settings.length > 0 ? Math.max(...settings.map((s) => s.step)) + 1 : 1;
    setStep(nextStep);
    setName(`${nextStep}. Adım Onayı`);
    setAssigneeType('ANY');
    setRoleId('');
    setUserId('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ApprovalSettingResponseDto) => {
    setEditingSetting(item);
    setStep(item.step);
    setName(item.name);
    if (item.userId) {
      setAssigneeType('USER');
      setUserId(item.userId);
      setRoleId('');
    } else if (item.roleId) {
      setAssigneeType('ROLE');
      setRoleId(item.roleId);
      setUserId('');
    } else {
      setAssigneeType('ANY');
      setRoleId('');
      setUserId('');
    }
    setIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSetting(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Lütfen bir onay adımı başlığı girin.');
      return;
    }

    const payload = {
      step,
      name: name.trim(),
      roleId: assigneeType === 'ROLE' ? (roleId || undefined) : undefined,
      userId: assigneeType === 'USER' ? (userId || undefined) : undefined,
      isActive,
    };

    if (editingSetting) {
      updateMutation.mutate({
        id: editingSetting.id,
        data: payload,
      });
    } else {
      createMutation.mutate({
        data: payload,
      });
    }
  };

  const handleToggleActive = (item: ApprovalSettingResponseDto) => {
    updateMutation.mutate({
      id: item.id,
      data: {
        isActive: !item.isActive,
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}" onay adımını silmek istediğinize emin misiniz?`)) {
      removeMutation.mutate({ id });
    }
  };

  const activeStepsCount = settings.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Sevkiyat Sıralı Onay Akışı Ayarları
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Müşteriye stok çıkışı ve sevkiyat yapılmadan önce geçmesi gereken hiyerarşik onay adımları.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Onay Adımı Ekle
        </button>
      </div>

      {/* Bilgilendirme Kartı */}
      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-800 dark:text-blue-200">
          <Info className="w-4 h-4" />
          Onay Akışı Nasıl İşler?
        </div>
        <p className="leading-relaxed">
          Stok çıkış talebi oluşturulduğunda sistem burada tanımlı adımları sırasıyla başlatır. İlgili adıma yetkili kullanıcı veya Süper Admin onay verdikçe fiş bir sonraki adıma ilerler. Tüm adımlar tamamlandığında fiş <strong>Onaylandı (APPROVED)</strong> durumuna geçer ve sevk edilebilir hale gelir.
        </p>
        <p className="leading-relaxed text-slate-600 dark:text-slate-400">
          ⚡ <strong>Onaysız Doğrudan Sevkiyat:</strong> Eğer hiç onay adımı tanımlanmazsa veya tüm adımlar pasife alınırsa, oluşturulan çıkış talepleri beklemeden doğrudan sevk edilir.
        </p>
      </div>

      {/* Onay Zinciri Görseli */}
      {settings.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Onay Hiyerarşisi (Sıralı Akış)
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400">
              {activeStepsCount} Aktif Adım / Toplam {settings.length} Adım
            </span>
          </div>

          <div className="space-y-4">
            {settings.map((item, index) => {
              const isLast = index === settings.length - 1;

              return (
                <div key={item.id} className="space-y-3">
                  <div
                    className={cn(
                      'flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all gap-4',
                      item.isActive
                        ? 'border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 shadow-xs'
                        : 'border-dashed border-slate-300 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-850 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs',
                          item.isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        )}
                      >
                        {item.step}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </h3>
                          {!item.isActive && (
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              Pasif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                          Onaylamaya Yetkili:
                          <strong className="text-slate-700 dark:text-slate-200">
                            {item.user ? `👤 Kullanıcı: ${item.user.fullName}` : item.role ? `🛡️ Rol: ${item.role.name}` : '🌐 Tüm Yöneticiler & Süper Admin'}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Aktif/Pasif Butonu */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
                          item.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {item.isActive ? 'Aktif' : 'Pasife Alındı'}
                      </button>

                      {/* Düzenle */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Düzenle"
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      </button>

                      {/* Sil */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="flex justify-center">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-750 flex items-center justify-center text-slate-400">
                        ↓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {settings.length === 0 && !isLoading && (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Tanımlı Onay Adımı Yok (Doğrudan Sevkiyat)
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Şu anda herhangi bir sıralı onay adımı tanımlı olmadığı için tüm stok çıkışları doğrudan onaylı sayılır ve beklemeden sevk edilebilir.
          </p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            İlk Onay Adımını Ekle
          </button>
        </div>
      )}

      {/* ================= MODAL: YENİ / DÜZENLE ONAY ADIMI ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                {editingSetting ? 'Onay Adımını Düzenle' : 'Yeni Onay Adımı Ekle'}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Adım Sırası <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Onay Adımı Başlığı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: 1. Adım: Depo Amiri Onayı"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Onay Yetkisi Belirleme */}
              <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-750">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Onaylamaya Yetkili Kriter <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssigneeType('ROLE')}
                    className={cn(
                      'px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center',
                      assigneeType === 'ROLE'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    )}
                  >
                    🛡️ Rol Bazlı
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigneeType('USER')}
                    className={cn(
                      'px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center',
                      assigneeType === 'USER'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    )}
                  >
                    👤 Kişi (Kullanıcı) Bazlı
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigneeType('ANY')}
                    className={cn(
                      'px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center',
                      assigneeType === 'ANY'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    )}
                  >
                    🌐 Tüm Yöneticiler
                  </button>
                </div>

                {assigneeType === 'ROLE' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Onaylayacak Rol Seçimi
                    </label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    >
                      <option value="">-- Bir Rol Seçiniz --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Örn: Sadece &quot;Depo Sorumlusu&quot; veya &quot;Sevkiyat Müdürü&quot; rolündeki kullanıcılar onaylayabilir.
                    </p>
                  </div>
                )}

                {assigneeType === 'USER' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Onaylayacak Belirli Kullanıcı (Kişi) Seçimi
                    </label>
                    <select
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      required
                    >
                      <option value="">-- Bir Kullanıcı Seçiniz --</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.email}) {u.appRole?.name ? `[${u.appRole.name}]` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Örn: Rolünden bağımsız olarak doğrudan bu kişiye onay düşer (Yönetici veya Genel Müdür gibi).
                    </p>
                  </div>
                )}

                {assigneeType === 'ANY' && (
                  <p className="text-[11px] text-slate-500 pt-1">
                    Bu adım için herhangi bir rol veya kişi kısıtlaması yoktur. Sistemdeki tüm Yöneticiler ve Süper Adminler onaylayabilir.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bu onay adımı aktif olsun
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
