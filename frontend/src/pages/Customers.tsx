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
  Briefcase,
  Store,
  Tag,
  FileSpreadsheet,
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
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
                  <TypeIcon className="w-2.5 h-2.5" />
                  {typeInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                {row.original.category && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full border text-foreground"
                    style={{
                      borderColor: `${row.original.category.color}40`,
                      backgroundColor: `${row.original.category.color}15`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: row.original.category.color }}
                    />
                    {row.original.category.name}
                  </span>
                )}
                {row.original.taxNumber && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    VN: {row.original.taxNumber}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'contactPerson',
        header: 'İrtibat Yetkilisi',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {row.original.contactPerson}
          </span>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'İletişim Bilgileri',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs">
            <div className="font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Phone className="w-3 h-3 text-teal-600" />
              {row.original.phone}
            </div>
            {row.original.email && (
              <div className="text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {row.original.email}
              </div>
            )}
          </div>
        ),
      },
      ...(isManager
        ? [
            {
              accessorKey: 'assignedTo.fullName',
              header: 'Temsilci',
              cell: ({ row }: any) => {
                const currentRepId = row.original.assignedToId || '';
                return (
                  <select
                    value={currentRepId}
                    onChange={async (e) => {
                      const newRepId = e.target.value;
                      if (!newRepId || newRepId === currentRepId) return;
                      try {
                        await updateCustomerMutation.mutateAsync({
                          id: row.original.id,
                          data: { assignedToId: newRepId },
                        });
                        toast.success('Müşteri temsilcisi güncellendi.');
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
                      } catch {
                        toast.error('Müşteri temsilcisi güncellenemedi.');
                      }
                    }}
                    className="h-7 px-2 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-background text-foreground cursor-pointer hover:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    title="Müşteri temsilcisini değiştirmek için seçin"
                  >
                    <option value="" disabled>Temsilci Seç...</option>
                    {(reps || []).map((rep: any) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName}
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
    [isManager],
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

  // Yeni Müşteri Modal Formu State
  const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.CORPORATE);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const handleCreateCustomer = async (e: React.FormEvent) => {
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
      await createMutation.mutateAsync({
        data: {
          type: customerType,
          categoryId: selectedCategoryId,
          companyName: companyName.trim(),
          taxNumber: taxNumber.trim() || undefined,
          taxOffice: taxOffice.trim() || undefined,
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
        },
      });

      toast.success('Müşteri başarıyla kaydedildi.');
      setCreateModalOpen(false);
      setCompanyName('');
      setTaxNumber('');
      setTaxOffice('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setSelectedCategoryId('');
      setCustomerType(CustomerType.CORPORATE);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Müşteri oluşturulamadı.');
    }
  };

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
          onClick={() => setCreateModalOpen(true)}
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

      {/* ================= MODAL: YENİ MÜŞTERİ EKLE ================= */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-navy-700" />
                Yeni Müşteri Kaydı Oluştur
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5">
              {/* Müşteri Türü Seçimi */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Müşteri Türü</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: CustomerType.CORPORATE, label: 'Kurumsal', icon: Building2 },
                    { type: CustomerType.INDIVIDUAL, label: 'Bireysel', icon: User },
                    { type: CustomerType.DEALER, label: 'Bayi / Dağıtıcı', icon: Store },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCustomerType(item.type)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all',
                        customerType === item.type
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
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
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

              {/* Müşteri / Firma Adı */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
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
                    placeholder="Örn: Ayşe Demir"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Telefon *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0212 xxx xx xx"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* E-posta */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  E-posta {customerType === CustomerType.CORPORATE && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  required={customerType === CustomerType.CORPORATE}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@sirket.com"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              {/* Vergi No & Daire (Kurumsal / Bayi ise Zorunlu) */}
              {customerType !== CustomerType.INDIVIDUAL && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Vergi Numarası <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="10 Haneli VN"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Vergi Dairesi</label>
                    <input
                      type="text"
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                      placeholder="Örn: Kadıköy"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Adres (Zorunlu) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Açık Adres <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="İlçe, mahalle, cadde, kapı no ve şehir..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Müşteriyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
