import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Mail,
  User,
  MapPin,
  FileText,
} from 'lucide-react';
import {
  useSuppliersControllerFindAll,
  useSuppliersControllerCreate,
  useSuppliersControllerUpdate,
  useSuppliersControllerToggleActive,
} from '@/api/generated';
import { SupplierDto } from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

export const SuppliersPage: React.FC = () => {
  const { can } = useAuth();
  const canCreate = can('SUPPLIERS', 'create');
  const canEdit = can('SUPPLIERS', 'edit');

  const { data: suppliers, isLoading, refetch } = useSuppliersControllerFindAll();
  const createMutation = useSuppliersControllerCreate();
  const updateMutation = useSuppliersControllerUpdate();
  const toggleActiveMutation = useSuppliersControllerToggleActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    const nextNum = (suppliers?.length || 0) + 1;
    setCode(`SUP-${String(nextNum).padStart(4, '0')}`);
    setName('');
    setTaxNumber('');
    setTaxOffice('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sup: SupplierDto) => {
    setEditingSupplier(sup);
    setCode(sup.code);
    setName(sup.name);
    setTaxNumber(sup.taxNumber || '');
    setTaxOffice(sup.taxOffice || '');
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Tedarikçi firma ünvanı zorunludur.');
      return;
    }

    try {
      if (editingSupplier) {
        await updateMutation.mutateAsync({
          id: editingSupplier.id,
          data: {
            code: code.trim().toUpperCase() || undefined,
            name: name.trim(),
            taxNumber: taxNumber.trim() || undefined,
            taxOffice: taxOffice.trim() || undefined,
            contactPerson: contactPerson.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
          },
        });
        toast.success('Tedarikçi bilgileri güncellendi.');
      } else {
        await createMutation.mutateAsync({
          data: {
            code: (code.trim().toUpperCase() || undefined) as any,
            name: name.trim(),
            taxNumber: taxNumber.trim() || undefined,
            taxOffice: taxOffice.trim() || undefined,
            contactPerson: contactPerson.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
          },
        });
        toast.success('Yeni tedarikçi tanımlandı.');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız oldu.');
    }
  };

  const handleToggleActive = async (sup: SupplierDto) => {
    try {
      await toggleActiveMutation.mutateAsync({ id: sup.id });
      toast.success(`Tedarikçi durumu güncellendi: ${sup.name}`);
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
            <Truck className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            Tedarikçi Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Donanım, lisans ve sarf malzemesi tedarikçileri, iletişim ve fatura bilgileri.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-navy-700 text-white text-sm font-semibold hover:bg-navy-800 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Tedarikçi Ekle
          </button>
        )}
      </div>

      {/* Tedarikçiler Tablosu */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Tedarikçiler yükleniyor...</div>
        ) : !suppliers?.length ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Kayıtlı tedarikçi bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-muted-foreground uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Tedarikçi Kodu</th>
                  <th className="px-4 py-3">Firma Ünvanı</th>
                  <th className="px-4 py-3">Vergi No / Daire</th>
                  <th className="px-4 py-3">Yetkili & İletişim</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-navy-700 dark:text-navy-400">
                      {sup.code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {sup.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                      <div>{sup.taxNumber || '-'}</div>
                      {sup.taxOffice && <div className="text-[11px] text-slate-400">{sup.taxOffice} VD.</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <div>{sup.contactPerson || '-'}</div>
                      <div className="font-mono text-slate-400">{sup.phone || sup.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold',
                          sup.isActive ? 'text-green-700 dark:text-green-400' : 'text-slate-400',
                        )}
                      >
                        {sup.isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {sup.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {formatDate(sup.createdAt, 'dd.MM.yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sup)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-navy-700" />
                            <span>Düzenle</span>
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(sup)}
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer',
                              sup.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                                : 'border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40',
                            )}
                          >
                            {sup.isActive ? 'Pasife Al' : 'Aktif Et'}
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

      {/* Tedarikçi Ekle / Düzenle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Truck className="w-5 h-5 text-navy-700" />
                {editingSupplier ? 'Tedarikçi Bilgilerini Güncelle' : 'Yeni Tedarikçi Tanımla'}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-foreground">Tedarikçi Kodu</label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">⚡ Otomatik</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Boş bırakılırsa otomatik üretilir"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Firma Ünvanı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Cisco Türkiye A.Ş."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    placeholder="10 Haneli Vergi No"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    placeholder="Örn: Maslak VD."
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Yetkili Kişi</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Müşteri temsilcisi"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Telefon Numarası</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="0212 555 00 00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">E-Posta Adresi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="siparis@tedarikci.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Adres Bilgisi</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    placeholder="Firma açık adresi..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
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
