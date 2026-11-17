import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  User,
  Eye,
  Pencil,
  ArrowLeft,
  Store,
  Tag,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCustomersControllerFindAll,
  useCustomersControllerCreate,
  useCustomersControllerUpdate,
  useCategoriesControllerFindAll,
  useUsersControllerFindAll,
} from '@/api/generated';
import { CreateCustomerDtoType as CustomerType } from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { validatePhone, validateEmail } from '@/lib/validators';

export const CustomersPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  const { data: customersResponse, isLoading } = useCustomersControllerFindAll({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
    sortBy: sorting[0]?.id || 'createdAt',
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const { data: categories } = useCategoriesControllerFindAll();
  const { data: reps } = useUsersControllerFindAll(
    { role: 'SALES_REP' },
    { query: { enabled: isManager } },
  );
  const createMutation = useCustomersControllerCreate();
  const updateCustomerMutation = useCustomersControllerUpdate();

  const customerTypeBadges: Record<string, { label: string; icon: any; className: string }> = {
    CORPORATE: {
      label: 'Kurumsal',
      icon: Building2,
      className: 'bg-navy-50 text-navy-800 border-navy-200 dark:bg-navy-950 dark:text-navy-300 dark:border-navy-800',
    },
    INDIVIDUAL: {
      label: 'Bireysel',
      icon: User,
      className: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
    },
    DEALER: {
      label: 'Bayi',
      icon: Store,
      className: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    },
  };

  // Form State
  const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.CORPORATE);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setCompanyName('');
    setTaxNumber('');
    setTaxOffice('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSelectedCategoryId('');
    setCustomerType(CustomerType.CORPORATE);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCustomer(c);
    setCompanyName(c.companyName || '');
    setTaxNumber(c.taxNumber || '');
    setTaxOffice(c.taxOffice || '');
    setContactPerson(c.contactPerson || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setSelectedCategoryId(c.categoryId || '');
    setCustomerType(c.type || CustomerType.CORPORATE);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      toast.error('Müşteri kategorisi seçilmesi zorunludur.');
      return;
    }

    if (!companyName.trim() || !contactPerson.trim()) {
      toast.error('Müşteri/Firma adı ve yetkili kişi alanları zorunludur.');
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

    if (customerType === CustomerType.CORPORATE && !email.trim()) {
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

    if (!address.trim()) {
      toast.error('Müşteri açık adresi zorunludur.');
      return;
    }

    if (customerType === CustomerType.CORPORATE || customerType === CustomerType.DEALER) {
      if (!taxNumber.trim()) {
        toast.error('Kurumsal ve Bayi müşteriler için Vergi Numarası zorunludur.');
        return;
      }
    }

    try {
      const payload = {
        type: customerType,
        categoryId: selectedCategoryId,
        companyName: companyName.trim(),
        taxNumber: taxNumber.trim() || undefined,
        taxOffice: taxOffice.trim() || undefined,
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
      };

      if (editingCustomer) {
        await updateCustomerMutation.mutateAsync({
          id: editingCustomer.id,
          data: payload,
        });
        toast.success('Müşteri bilgileri başarıyla güncellendi.');
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        toast.success('Müşteri başarıyla kaydedildi.');
      }

      setIsFormOpen(false);
      setEditingCustomer(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || (editingCustomer ? 'Müşteri güncellenemedi.' : 'Müşteri oluşturulamadı.'));
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Müşteri / Firma Adı',
        cell: ({ row }) => {
          const typeInfo = customerTypeBadges[row.original.type] || customerTypeBadges.CORPORATE;
          const TypeIcon = typeInfo.icon;

          return (
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: row.original.id }}
                  className="font-bold text-navy-700 hover:text-navy-900 dark:text-navy-400 dark:hover:text-navy-200 block text-sm"
                >
                  {row.original.companyName}
                </Link>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border',
                    typeInfo.className,
                  )}
                >
                  <TypeIcon className="w-3 h-3" />
                  {typeInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  VN: {row.original.taxNumber || '-'} {row.original.taxOffice ? `(${row.original.taxOffice})` : ''}
                </span>
                {row.original.category && (
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    <Tag className="w-3 h-3" />
                    {row.original.category.name}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'contactPerson',
        header: 'Yetkili & İletişim',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {row.original.contactPerson || '-'}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              {row.original.phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" />
                  {row.original.phone}
                </span>
              )}
              {row.original.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {row.original.email}
                </span>
              )}
            </div>
          </div>
        ),
      },
      ...(isManager
        ? [
            {
              accessorKey: 'assignedTo',
              header: 'Satış Temsilcisi',
              cell: ({ row }: any) => {
                const assigned = row.original.assignedTo;
                return (
                  <select
                    value={assigned?.id || ''}
                    onChange={async (e) => {
                      const newRepId = e.target.value;
                      if (!newRepId) return;
                      try {
                        await updateCustomerMutation.mutateAsync({
                          id: row.original.id,
                          data: { assignedToId: newRepId } as any,
                        });
                        toast.success('Müşteri temsilcisi başarıyla atandı.');
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Temsilci atanamadı.');
                      }
                    }}
                    className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-navy-600"
                  >
                    <option value="">Temsilci Ata...</option>
                    {(reps as any[] || []).map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                );
              },
            },
          ]
        : []),
      {
        accessorKey: 'createdAt',
        header: 'Kayıt Tarihi',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt, 'dd.MM.yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenEdit(row.original)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Müşteriyi Düzenle"
            >
              <Pencil className="w-3.5 h-3.5" />
              Düzenle
            </button>
            <Link
              to="/customers/$customerId"
              params={{ customerId: row.original.id }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-navy-50 hover:bg-navy-100 text-navy-800 dark:bg-navy-950 dark:hover:bg-navy-900 dark:text-navy-300 border border-navy-200 dark:border-navy-800 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              360° Detay
            </Link>
          </div>
        ),
      },
    ],
    [isManager, reps, queryClient],
  );

  const table = useReactTable({
    data: customersResponse?.data || [],
    columns,
    pageCount: customersResponse?.meta?.totalPages || 1,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  /* ================= TAM SAYFA FORM: MÜŞTERİ EKLE / GÜNCELLE ================= */
  if (isFormOpen) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-2">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(false);
              setEditingCustomer(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Müşteriler Listesine Dön</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-foreground">
              {editingCustomer ? 'Müşteri Bilgilerini Güncelle' : 'Yeni Müşteri Tanımla'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingCustomer
                ? `${editingCustomer.companyName} bilgilerini güncelliyorsunuz.`
                : 'Firma / Müşteri 360° kartı ve teklif yetkilendirmesi için temel veriler.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Müşteri Türü Seçimi */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">Müşteri Türü *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { type: CustomerType.CORPORATE, label: 'Kurumsal Firma', icon: Building2 },
                { type: CustomerType.INDIVIDUAL, label: 'Bireysel Müşteri', icon: User },
                { type: CustomerType.DEALER, label: 'Bayi / Dağıtıcı', icon: Store },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setCustomerType(item.type)}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all',
                    customerType === item.type
                      ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950 dark:text-navy-200 ring-2 ring-navy-600'
                      : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Kategori Seçimi */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Müşteri Kategorisi <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-navy-600"
            >
              <option value="">Kategori Seçin (Zorunlu)...</option>
              {(categories as any[] || []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Müşteri / Firma Adı */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              {customerType === CustomerType.INDIVIDUAL
                ? 'Müşteri Ad Soyad *'
                : customerType === CustomerType.DEALER
                ? 'Bayi Ticari Ünvanı *'
                : 'Firma Resmi Ünvanı *'}
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={
                customerType === CustomerType.INDIVIDUAL
                  ? 'Örn: Ahmet Korkmaz'
                  : 'Örn: Vodafone Net İletişim A.Ş.'
              }
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>

          {/* Yetkili & Telefon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">Yetkili Kişi *</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Örn: Ayşe Demir"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">Telefon *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0212 xxx xx xx veya 0532 xxx xx xx"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-600"
              />
            </div>
          </div>

          {/* E-posta */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              E-posta Adresi {customerType === CustomerType.CORPORATE && <span className="text-red-500">*</span>}
            </label>
            <input
              type="email"
              required={customerType === CustomerType.CORPORATE}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@sirket.com veya yetkili@sirket.com"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>

          {/* Vergi No & Daire (Kurumsal / Bayi ise Zorunlu) */}
          {customerType !== CustomerType.INDIVIDUAL && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  Vergi Numarası <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  placeholder="10 Haneli Vergi No"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">Vergi Dairesi</label>
                <input
                  type="text"
                  value={taxOffice}
                  onChange={(e) => setTaxOffice(e.target.value)}
                  placeholder="Örn: Kadıköy VD."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>
            </div>
          )}

          {/* Açık Adres */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Açık Adres <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="İlçe, mahalle, cadde, sokak, bina ve kapı no, il..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingCustomer(null);
              }}
              className="px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateCustomerMutation.isPending}
              className="px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateCustomerMutation.isPending
                ? 'Kaydediliyor...'
                : editingCustomer
                ? 'Değişiklikleri Güncelle'
                : 'Müşteriyi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Müşteriler</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Aktif kurumsal, bireysel ve bayi müşteriler, kategoriler ve 360° müşteri detayları.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
        >
          <Plus className="w-4 h-4" />
          Yeni Müşteri Ekle
        </button>
      </div>

      {/* Arama Barı */}
      <div className="flex items-center gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri / firma adı, vergi numarası veya yetkili ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={customersResponse?.meta?.totalRowCount}
      />
    </div>
  );
};
