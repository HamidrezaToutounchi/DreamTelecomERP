import React, { useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Star,
  Building,
  Phone,
  User,
  MapPin,
} from 'lucide-react';
import {
  useWarehousesControllerFindAll,
  useWarehousesControllerCreate,
  useWarehousesControllerUpdate,
  useWarehousesControllerToggleActive,
} from '@/api/generated';
import { WarehouseDto } from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

export const WarehousesPage: React.FC = () => {
  const { can } = useAuth();
  const canCreate = can('WAREHOUSES', 'create');
  const canEdit = can('WAREHOUSES', 'edit');

  const { data: warehouses, isLoading, refetch } = useWarehousesControllerFindAll();
  const createMutation = useWarehousesControllerCreate();
  const updateMutation = useWarehousesControllerUpdate();
  const toggleActiveMutation = useWarehousesControllerToggleActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseDto | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setCode('');
    setName('');
    setAddress('');
    setContactPerson('');
    setContactPhone('');
    setIsDefault(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (wh: WarehouseDto) => {
    setEditingWarehouse(wh);
    setCode(wh.code);
    setName(wh.name);
    setAddress(wh.address || '');
    setContactPerson(wh.contactPerson || '');
    setContactPhone(wh.contactPhone || '');
    setIsDefault(wh.isDefault);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Depo kodu ve depo adı zorunludur.');
      return;
    }

    try {
      if (editingWarehouse) {
        await updateMutation.mutateAsync({
          id: editingWarehouse.id,
          data: {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            address: address.trim() || undefined,
            contactPerson: contactPerson.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            isDefault,
          },
        });
        toast.success('Depo bilgileri güncellendi.');
      } else {
        await createMutation.mutateAsync({
          data: {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            address: address.trim() || undefined,
            contactPerson: contactPerson.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            isDefault,
          },
        });
        toast.success('Yeni depo tanımlandı.');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız oldu.');
    }
  };

  const handleToggleActive = async (wh: WarehouseDto) => {
    if (wh.isDefault && wh.isActive) {
      toast.error('Varsayılan ana depo pasife alınamaz.');
      return;
    }

    try {
      await toggleActiveMutation.mutateAsync({ id: wh.id });
      toast.success(`Depo durumu güncellendi: ${wh.name}`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Durum değiştirilemedi.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Üst Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            Depo Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fiziksel stok lokasyonları, ana depo ve sevkiyat merkezlerinin yönetimi.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Depo Ekle
          </button>
        )}
      </div>

      {/* Depolar Tablosu */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Depolar yükleniyor...</div>
        ) : !warehouses?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Kayıtlı depo bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-muted-foreground uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Depo Kodu</th>
                  <th className="px-4 py-3">Depo Adı</th>
                  <th className="px-4 py-3">Yetkili & İletişim</th>
                  <th className="px-4 py-3">Adres</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {warehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-navy-700 dark:text-navy-400">
                      {wh.code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        {wh.name}
                        {wh.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Ana Depo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <div>{wh.contactPerson || '-'}</div>
                      {wh.contactPhone && <div className="font-mono text-slate-400">{wh.contactPhone}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate">
                      {wh.address || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold',
                          wh.isActive ? 'text-green-700 dark:text-green-400' : 'text-slate-400',
                        )}
                      >
                        {wh.isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {wh.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {formatDate(wh.createdAt, 'dd.MM.yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(wh)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-navy-700" />
                            <span>Düzenle</span>
                          </button>
                        )}
                        {canEdit && !wh.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(wh)}
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer',
                              wh.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                : 'border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40',
                            )}
                          >
                            {wh.isActive ? 'Pasife Al' : 'Aktif Et'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Depo Ekle / Düzenle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <WarehouseIcon className="w-5 h-5 text-navy-700" />
                {editingWarehouse ? 'Depo Bilgilerini Güncelle' : 'Yeni Depo Tanımla'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Depo Kodu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: WH-02"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Depo Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Şerifali Lojistik"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Yetkili Kişi</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Depo sorumlusu adı"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">İletişim Telefonu</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="0555 123 45 67"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Adres / Konum</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    placeholder="Açık adres ve depo bina bilgisi..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-300 text-navy-700 focus:ring-navy-600"
                />
                <label htmlFor="isDefault" className="text-xs font-medium text-foreground cursor-pointer">
                  Varsayılan Ana Depo olarak belirle (Mal kabul varsayılanı)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
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
};
