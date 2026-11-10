import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  BadgeDollarSign,
  Search,
  FileCheck,
  ClockAlert,
  Edit3,
  Receipt,
  User,
  Building,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import {
  useSalesControllerFindAll,
  useSalesControllerUpdate,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { CopyableCode } from '@/components/common/CopyableCode';
import { PaymentStatusBadge } from '@/components/sales/PaymentStatusBadge';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const SalesPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('');

  const [editSaleModal, setEditSaleModal] = useState<any | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isInvoiced, setIsInvoiced] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PARTIAL' | 'PAID'>('PENDING');
  const [paidAmount, setPaidAmount] = useState('');
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [totalAmount, setTotalAmount] = useState('');

  const { data: salesResponse, isLoading } = useSalesControllerFindAll({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
    isInvoiced: invoiceFilter === 'true' ? true : invoiceFilter === 'false' ? false : undefined,
    sortBy: sorting[0]?.id || 'createdAt',
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const updateSaleMutation = useSalesControllerUpdate();

  // Kalan Bakiye Dinamik Hesaplama (Decimal.js)
  const remainingCalculated = useMemo(() => {
    if (!editSaleModal) return '0.00';
    try {
      const tStr = String(totalAmount || editSaleModal.totalAmount || 0).replace(/,/g, '.').trim();
      const pStr = String(paidAmount || 0).replace(/,/g, '.').trim();
      const total = new Decimal(tStr === '' || tStr === '.' ? 0 : tStr);
      const paid = new Decimal(pStr === '' || pStr === '.' ? 0 : pStr);
      const remaining = total.minus(paid);
      return remaining.isNegative() ? '0.00' : remaining.toFixed(2);
    } catch {
      return '0.00';
    }
  }, [editSaleModal, totalAmount, paidAmount]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'customer.companyName',
        header: 'Müşteri & Satış Detayı',
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block">{row.original.customer?.companyName}</span>
            <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {row.original.soldItemsSummary}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Satış & Tahsilat Tutarı',
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div>
              <div className="font-bold text-navy-700 dark:text-navy-300 text-sm">
                {formatMoney(s.totalAmount, s.currency)}
              </div>
              {s.paymentStatus === 'PARTIAL' && (
                <div className="text-[11px] font-semibold space-y-0.5 mt-0.5">
                  <span className="text-green-700 dark:text-green-400 block font-mono">
                    Tahsil Edilen: {formatMoney(s.paidAmount || '0.00', s.currency)}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 block font-mono">
                    Kalan Bakiye: {formatMoney(s.remainingAmount || s.totalAmount, s.currency)}
                  </span>
                </div>
              )}
              {s.quote?.quoteNumber && (
                <span className="text-[11px] text-muted-foreground block font-mono mt-0.5">
                  Teklif: {s.quote.quoteNumber}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'isInvoiced',
        header: 'Fatura Durumu',
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="space-y-1">
              {s.isInvoiced ? (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-900 border border-green-300">
                    <FileCheck className="w-3 h-3 text-green-700" />
                    Faturalandı
                  </span>
                  {s.invoiceNumber && <CopyableCode code={s.invoiceNumber} label="Fatura No" />}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                  <ClockAlert className="w-3 h-3 text-amber-600" />
                  Fatura Bekliyor
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Ödeme Durumu',
        cell: ({ row }) => <PaymentStatusBadge status={row.original.paymentStatus} />,
      },
      ...(isManager
        ? [
            {
              accessorKey: 'rep.fullName',
              header: 'Temsilci',
              cell: ({ row }: any) => (
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {row.original.rep?.fullName}
                </span>
              ),
            },
          ]
        : []),
      {
        accessorKey: 'createdAt',
        header: 'Tarih',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt, 'dd.MM.yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlem',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setEditSaleModal(row.original);
              setIsInvoiced(row.original.isInvoiced || false);
              setInvoiceNumber(row.original.invoiceNumber || '');
              setPaymentStatus(row.original.paymentStatus || 'PENDING');
              setPaidAmount(row.original.paidAmount || '');
              setCurrency(row.original.currency || 'TRY');
              setTotalAmount(row.original.totalAmount || '');
            }}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-navy-50 text-navy-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-navy-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            Fatura & Tahsilat
          </button>
        ),
      },
    ],
    [isManager],
  );

  const table = useReactTable({
    data: salesResponse?.data || [],
    columns,
    pageCount: salesResponse?.meta?.totalPages || 1,
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

  const handleSaveInvoiceStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSaleModal) return;

    try {
      const activeTotal = totalAmount || editSaleModal.totalAmount;
      let finalPaidAmount = '0.00';
      if (paymentStatus === 'PAID') {
        finalPaidAmount = activeTotal;
      } else if (paymentStatus === 'PARTIAL') {
        finalPaidAmount = paidAmount || '0.00';
      }

      await updateSaleMutation.mutateAsync({
        id: editSaleModal.id,
        data: {
          currency: currency as any,
          totalAmount: activeTotal,
          isInvoiced,
          invoiceNumber: isInvoiced ? invoiceNumber : undefined,
          paymentStatus,
          paidAmount: finalPaidAmount,
        },
      });

      toast.success('Fatura ve tahsilat durumu güncellendi.');
      setEditSaleModal(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Güncellenemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BadgeDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            <span>Satış & Fatura Takibi</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerçekleşen siparişler, tahsilat bakiyeleri ve resmi faturalandırma durumu.
          </p>
        </div>
      </div>

      {/* Arama ve Filtreler */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri adı veya fatura no ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <select
          value={invoiceFilter}
          onChange={(e) => setInvoiceFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground cursor-pointer"
        >
          <option value="">Tüm Faturalar</option>
          <option value="true">Faturalandı</option>
          <option value="false">Fatura Bekliyor</option>
        </select>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={salesResponse?.meta?.totalRowCount}
      />

      {/* ================= MODAL: FATURA & TAHSİLAT DÜZENLE ================= */}
      {editSaleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-5 h-5 text-navy-700" />
              Fatura & Tahsilat Güncelle
            </h3>
            <p className="text-xs text-muted-foreground">
              Müşteri: <strong>{editSaleModal.customer?.companyName}</strong> &bull; Toplam:{' '}
              <span className="font-bold text-green-700 dark:text-green-400">
                {formatMoney(editSaleModal.totalAmount, editSaleModal.currency)}
              </span>
            </p>

            <form onSubmit={handleSaveInvoiceStatus} className="space-y-4">
              {/* Para Birimi ve Satış Tutarı */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Fatura Para Birimi</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="TRY">₺ Türk Lirası (TRY)</option>
                    <option value="USD">$ Amerikan Doları (USD)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Fatura / Satış Tutarı</label>
                  <input
                    type="text"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="Örn: 1200.00"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Fatura Durumu */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-2 border border-slate-200/70 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInvoiced}
                    onChange={(e) => setIsInvoiced(e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">Fatura Kesildi Olarak İşaretle</span>
                </label>

                {isInvoiced && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-semibold text-foreground">Resmi Fatura Numarası *</label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Örn: GIB202600000045"
                      className="w-full h-9 px-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Tahsilat / Ödeme Durumu */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Tahsilat / Ödeme Durumu</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="PENDING">Ödeme Bekliyor (Tahsil Edilmedi)</option>
                  <option value="PARTIAL">Kısmi Tahsilat Yapıldı</option>
                  <option value="PAID">Ödeme Tamamlandı (Tam Tahsil Edildi)</option>
                </select>
              </div>

              {/* Kısmi Tahsilat Tutarı ve Kalan Bakiye */}
              {paymentStatus === 'PARTIAL' && (
                <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      Alınan Para (Tahsil Edilen Tutar) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Örn: 5000.00"
                        className="w-full h-9 px-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200 dark:border-amber-900/40">
                    <span className="text-muted-foreground font-medium">Hesaplanan Kalan Bakiye:</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">
                      {formatMoney(remainingCalculated, editSaleModal.currency)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditSaleModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateSaleMutation.isPending}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {updateSaleMutation.isPending ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
