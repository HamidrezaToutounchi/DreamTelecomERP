import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  User,
  Store,
  MapPin,
  CheckCircle,
  X,
  Phone,
  Mail,
  Receipt,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCustomersControllerCreate,
  useCategoriesControllerFindAll,
} from '@/api/generated';
import { CreateCustomerDtoType as CustomerType } from '@/api/model';
import { cn } from '@/lib/utils';
import { validatePhone, validateEmail } from '@/lib/validators';

interface ConvertToCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    companyName: string;
    contactName: string;
    phone: string;
    email?: string;
  } | null;
  onSuccess?: (createdCustomer: any) => void;
}

export const ConvertToCustomerModal: React.FC<ConvertToCustomerModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const createCustomerMutation = useCustomersControllerCreate();
  const { data: categories } = useCategoriesControllerFindAll();

  const [type, setType] = useState<CustomerType>(CustomerType.CORPORATE);
  const [categoryId, setCategoryId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [address, setAddress] = useState('');

  // Lead değiştiğinde form alanlarını doldur
  useEffect(() => {
    if (lead) {
      setCompanyName(lead.companyName || '');
      setContactPerson(lead.contactName || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setTaxNumber('');
      setTaxOffice('');
      setAddress('');
      setType(CustomerType.CORPORATE);
      setCategoryId('');
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim() || !contactPerson.trim()) {
      toast.error('Müşteri/Firma adı ve yetkili kişi alanları zorunludur.');
      return;
    }

    if (!categoryId) {
      toast.error('Müşteri kategorisi seçilmesi zorunludur.');
      return;
    }

    if (!phone.trim()) {
      toast.error('Müşteri telefon numarası kesinlikle boş bırakılamaz.');
      return;
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.message || 'Geçerli bir telefon numarası giriniz.');
      return;
    }

    if (type === CustomerType.CORPORATE && !email.trim()) {
      toast.error('Kurumsal müşteriler için e-posta adresi zorunludur.');
      return;
    }

    if (email.trim()) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        toast.error(emailValidation.message || 'Geçerli bir e-posta adresi giriniz.');
        return;
      }
    }

    // Açık adres zorunluluğu
    if (!address.trim()) {
      toast.error('Müşterinin açık adresi kesinlikle girilmelidir.');
      return;
    }

    // Kurumsal ve Bayi için Vergi Numarası zorunluluğu
    if (type === CustomerType.CORPORATE || type === CustomerType.DEALER) {
      if (!taxNumber.trim()) {
        toast.error('Kurumsal ve Bayi müşteriler için Vergi Numarası zorunludur.');
        return;
      }
    }

    try {
      const createdCustomer = await createCustomerMutation.mutateAsync({
        data: {
          leadId: lead.id,
          type,
          categoryId: categoryId,
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          taxNumber: taxNumber.trim() || undefined,
          taxOffice: taxOffice.trim() || undefined,
          address: address.trim(),
        },
      });

      toast.success(`${companyName} başarıyla müşteriye dönüştürüldü!`);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
      onClose();

      if (onSuccess) {
        onSuccess(createdCustomer);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Müşteriye dönüştürme işlemi başarısız oldu.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
        {/* Başlık */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Müşteriye Dönüştür & Resmi Kart Aç
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lead: <strong className="text-foreground">{lead.companyName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Müşteri Türü Seçimi */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Müşteri Türü <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: CustomerType.CORPORATE, label: 'Kurumsal', icon: Building2 },
                { key: CustomerType.INDIVIDUAL, label: 'Bireysel', icon: User },
                { key: CustomerType.DEALER, label: 'Bayi / Dağıtıcı', icon: Store },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setType(item.key)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all',
                    type === item.key
                      ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950 dark:text-navy-200 ring-2 ring-navy-600'
                      : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50',
                  )}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kategori Seçimi */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Müşteri Kategorisi <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
            >
              <option value="">Kategori Seçin (Zorunlu)...</option>
              {(categories as any[] || []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Firma / Müşteri Adı */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              {type === CustomerType.INDIVIDUAL
                ? 'Müşteri Ad Soyad *'
                : type === CustomerType.DEALER
                ? 'Bayi Ticari Ünvanı *'
                : 'Firma Resmi Ünvanı *'}
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
            />
          </div>

          {/* Yetkili & Telefon */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Yetkili Kişi *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Telefon Numarası <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0212 xxx xx xx"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* E-posta */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              E-posta Adresi {type === CustomerType.CORPORATE && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              required={type === CustomerType.CORPORATE}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
            />
          </div>

          {/* Vergi No & Vergi Dairesi (Kurumsal / Bayi ise ZORUNLU) */}
          {type !== CustomerType.INDIVIDUAL && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">
                  Vergi Numarası <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="10 Haneli VN"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Vergi Dairesi</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  placeholder="Örn: Kadıköy"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
            </div>
          )}

          {/* Açık Adres (ZORUNLU) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-navy-700" />
              Müşteri Açık Adresi <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Firma / Müşteri açık adresi, mahalle, cadde, kapı no, ilçe ve il (Zorunlu)..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:ring-2 focus:ring-navy-600 focus:outline-hidden"
            />
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createCustomerMutation.isPending}
              className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {createCustomerMutation.isPending ? 'Dönüştürülüyor...' : 'Müşteriye Dönüştür & Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
