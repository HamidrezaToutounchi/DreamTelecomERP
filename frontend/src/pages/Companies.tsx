import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Printer,
  Mail,
  Globe,
  MapPin,
  Pencil,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompaniesControllerFindAll, useCompaniesControllerUpdate } from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export const CompaniesPage: React.FC = () => {
  const { isManager } = useAuth();
  const { data: companies, isLoading, refetch } = useCompaniesControllerFindAll();
  const updateMutation = useCompaniesControllerUpdate();

  const [editingCompany, setEditingCompany] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formFax, setFormFax] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formBankInfo, setFormBankInfo] = useState('');

  const handleOpenEdit = (comp: any) => {
    setEditingCompany(comp);
    setFormName(comp.name || '');
    setFormTitle(comp.title || '');
    setFormAddress(comp.address || '');
    setFormPhone(comp.phone || '');
    setFormFax(comp.fax || '');
    setFormEmail(comp.email || '');
    setFormWebsite(comp.website || '');
    setFormBankInfo(comp.bankInfo || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    try {
      await updateMutation.mutateAsync({
        id: editingCompany.id,
        data: {
          name: formName.trim(),
          title: formTitle.trim(),
          address: formAddress.trim(),
          phone: formPhone.trim(),
          fax: formFax.trim() || undefined,
          email: formEmail.trim(),
          website: formWebsite.trim() || undefined,
          bankInfo: formBankInfo.trim() || undefined,
        },
      });

      toast.success(`${formName} bilgileri başarıyla güncellendi.`);
      setEditingCompany(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Şirket bilgileri güncellenemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Şirket Profilleri & Kurumsal Antetler</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dream Telecom ve Tescom Telecom resmi ünvan, iletişim, adres ve teklif PDF antet bilgileri.
          </p>
        </div>
      </div>

      {/* Şirket Kartları */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Şirket profilleri yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(companies as any[] || []).map((comp) => {
            const isTescom = comp.code === 'TESCOM';
            return (
              <div
                key={comp.id}
                className={cn(
                  'bg-card rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all space-y-6',
                  isTescom
                    ? 'border-sky-200 dark:border-sky-900/60'
                    : 'border-navy-200 dark:border-navy-900/60',
                )}
              >
                {/* Üst Logo ve Başlık */}
                <div>
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-28 bg-white dark:bg-slate-800 rounded-xl p-1.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <img
                          src={comp.logoUrl || (isTescom ? '/tescom-logo.png' : '/logo.png')}
                          alt={comp.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-black text-foreground">{comp.name}</h2>
                          <span
                            className={cn(
                              'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                              isTescom
                                ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-navy-50 text-navy-800 border-navy-200 dark:bg-navy-950/60 dark:text-navy-300',
                            )}
                          >
                            {isTescom ? 'TS- Serisi Teklifler' : 'DT- Serisi Teklifler'}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Kod: {comp.code}
                        </span>
                      </div>
                    </div>

                    {isManager && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(comp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5 text-navy-700 dark:text-navy-400" />
                        <span>Düzenle</span>
                      </button>
                    )}
                  </div>

                  {/* Resmi Bilgiler Listesi */}
                  <div className="mt-5 space-y-3.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Resmi Ticari Ünvan
                      </span>
                      <p className="font-bold text-foreground text-xs mt-0.5 leading-snug">
                        {comp.title}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Resmi Adres
                      </span>
                      <p className="text-muted-foreground flex items-start gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{comp.address}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Telefon
                        </span>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{comp.phone}</span>
                        </p>
                      </div>

                      {comp.fax && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Faks
                          </span>
                          <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span>{comp.fax}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          E-Posta İletişim
                        </span>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 font-mono text-[11px] truncate" title={comp.email}>
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{comp.email}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Web Sitesi
                        </span>
                        <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5 font-mono text-[11px]">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{comp.website || '-'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alt PDF Entegrasyon Rozeti */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                    <span>Resmi PDF Teklif Anteti Aktif</span>
                  </span>
                  <span className="font-mono font-bold text-slate-400">
                    Logo: {isTescom ? 'tescom-logo.png' : 'logo.png'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Düzenleme Modalı */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-navy-700" />
                  <span>Şirket Bilgilerini Güncelle</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingCompany.name} ({editingCompany.code})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  Şirket Kısa Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Resmi Ticari Ünvan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold resize-y"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  Resmi Adres <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Faks (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={formFax}
                    onChange={(e) => setFormFax(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    E-Posta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    Web Sitesi
                  </label>
                  <input
                    type="text"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-navy-700 text-white text-xs font-bold hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
