import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Upload,
  ArrowRight,
  BadgeDollarSign,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import axios from 'axios';
import {
  useQuotesControllerFindAll,
  useQuotesControllerCreate,
  useQuotesControllerUpdateStatus,
  useQuotesControllerRevise,
  useCustomersControllerFindAll,
  useSalesControllerCreate,
  useCompaniesControllerFindAll,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { CopyableCode } from '@/components/common/CopyableCode';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { QuoteFormModal } from '@/components/quotes/QuoteFormModal';
import { formatDate, formatMoney } from '@/lib/formatters';
import { downloadQuotePdf } from '@/lib/pdf';
import { cn } from '@/lib/utils';

interface QuoteItemForm {
  productName: string;
  productCode: string;
  description: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: string;
  discountRate: string;
  taxRate: number;
}

export const QuotesPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');

  const { data: companiesData } = useCompaniesControllerFindAll();
  const companies = (companiesData as any) || [];

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviseModalQuote, setReviseModalQuote] = useState<any | null>(null);
  const [rejectModalQuote, setRejectModalQuote] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [convertToSaleQuote, setConvertToSaleQuote] = useState<any | null>(null);

  // Queries & Mutations
  const { data: quotesResponse, isLoading } = useQuotesControllerFindAll({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    companyId: companyFilter || undefined,
    sortBy: sorting[0]?.id || 'createdAt',
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const { data: customers } = useCustomersControllerFindAll(
    { pageSize: 100 },
    { query: { enabled: createModalOpen } },
  );

  const createMutation = useQuotesControllerCreate();
  const updateStatusMutation = useQuotesControllerUpdateStatus();
  const reviseMutation = useQuotesControllerRevise();
  const createSaleMutation = useSalesControllerCreate();

  // Columns definition
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'quoteNumber',
        header: 'Teklif No & Revizyon',
        cell: ({ row }) => {
          const isTescom =
            row.original.company?.code === 'TESCOM' ||
            row.original.quoteNumber?.startsWith('TS-');
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CopyableCode code={row.original.quoteNumber} label="Teklif No" />
                <span className="text-[11px] font-semibold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  v{row.original.version}
                </span>
              </div>
              <div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded border',
                    isTescom
                      ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                      : 'bg-navy-50 text-navy-800 border-navy-200 dark:bg-navy-950/40 dark:text-navy-300 dark:border-navy-800',
                  )}
                >
                  {isTescom ? 'Tescom Telecom' : 'Dream Telecom'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'customer.companyName',
        header: 'Müşteri',
        cell: ({ row }) => (
          <div>
            <span className="font-bold text-foreground block">{row.original.customer?.companyName}</span>
            <span className="text-xs text-muted-foreground">{row.original.customer?.contactPerson}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => <QuoteStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'grandTotal',
        header: 'Genel Toplam',
        cell: ({ row }) => (
          <div className="font-bold text-navy-700 dark:text-navy-300">
            {formatMoney(row.original.grandTotal, row.original.currency)}
            <span className="text-[11px] text-muted-foreground block font-normal">
              KDV Dahil ({row.original.items?.length || 0} Kalem)
            </span>
          </div>
        ),
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
        accessorKey: 'validUntil',
        header: 'Geçerlilik',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.validUntil, 'dd.MM.yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => {
          const q = row.original;
          return (
            <div className="flex items-center gap-1.5">
              {/* PDF İndir (Güvenli JWT Blob İndirme) */}
              <button
                type="button"
                onClick={() => downloadQuotePdf(q.id, q.quoteNumber)}
                title="Resmi Dream Telecom PDF çıktısını indir"
                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-navy-700 dark:text-navy-300 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Revize Et Butonu (Yalnızca siparişe dönüştürülmemiş ve henüz revize edilmemiş tekliflerde) */}
              {!(q.sales && q.sales.length > 0) && q.status !== 'REVISED' && (
                <button
                  type="button"
                  onClick={() => setReviseModalQuote(q)}
                  title="Teklifi Revize Et (Yeni Versiyon Oluştur)"
                  className="p-1.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold hidden xl:inline">Revize Et</span>
                </button>
              )}

              {/* Onaylandıysa -> Satışa Dönüştür (Yalnızca 1 Kez Dönüştürülebilir) */}
              {q.status === 'APPROVED' && (
                q.sales && q.sales.length > 0 ? (
                  <span
                    title="Bu teklif siparişe dönüştürülmüştür (Mükerrer satış engellendi)"
                    className="px-2 py-0.5 text-[11px] font-bold rounded bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300 border border-green-200 dark:border-green-800 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Satışa Dönüştürüldü
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConvertToSale(q)}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-green-100 hover:bg-green-200 text-green-950 border border-green-300 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <BadgeDollarSign className="w-3.5 h-3.5 text-green-700" />
                    Satışa Dönüştür
                  </button>
                )
              )}

              {/* Taslak veya Gönderildi ise -> Onayla / Reddet */}
              {(q.status === 'DRAFT' || q.status === 'SENT') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(q.id, 'APPROVED')}
                    title="Müşteri Onayladı"
                    className="p-1.5 rounded bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectModalQuote(q)}
                    title="Müşteri Reddetti"
                    className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [isManager],
  );

  const table = useReactTable({
    data: quotesResponse?.data || [],
    columns,
    pageCount: quotesResponse?.meta?.totalPages || 1,
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

  // Durum Güncelleme
  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'SENT', reason?: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        data: {
          status: status as any,
          rejectionReason: reason,
        },
      });
      toast.success(`Teklif durumu '${status}' olarak güncellendi.`);
      setRejectModalQuote(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Güncellenemedi.');
    }
  };

  // Satışa Dönüştürme State
  const [saleInvoiceNumber, setSaleInvoiceNumber] = useState('');
  const [saleIsInvoiced, setSaleIsInvoiced] = useState(false);

  const openConvertToSale = (quote: any) => {
    setConvertToSaleQuote(quote);
    setSaleInvoiceNumber('');
    setSaleIsInvoiced(false);
  };

  const handleConfirmConvertToSale = async () => {
    if (!convertToSaleQuote) return;

    try {
      const summaryText = convertToSaleQuote.items
        ?.map((i: any) => `${i.quantity}x ${i.productName}`)
        .join(', ');

      await createSaleMutation.mutateAsync({
        data: {
          quoteId: convertToSaleQuote.id,
          customerId: convertToSaleQuote.customerId,
          soldItemsSummary: summaryText || 'Satış işlemi',
          totalAmount: convertToSaleQuote.grandTotal,
          currency: convertToSaleQuote.currency || 'TRY',
          isInvoiced: saleIsInvoiced,
          invoiceNumber: saleInvoiceNumber || undefined,
        },
      });

      toast.success('Teklif başarıyla satışa dönüştürüldü ve sipariş kaydı açıldı!');
      setConvertToSaleQuote(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Satışa dönüştürülemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Teklif Yönetimi</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dinamik ürün kalemleri, fotoğraf yükleme, revizyon versiyonlama ve resmi PDF dökümü.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
        >
          <Plus className="w-4 h-4" />
          Yeni Teklif Hazırla
        </button>
      </div>

      {/* Arama ve Durum Filtreleri */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Teklif no (DT-...) veya müşteri ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-foreground cursor-pointer"
        >
          <option value="">🏢 Tüm Firmalar (Dream & Tescom)</option>
          {companies.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground cursor-pointer"
        >
          <option value="">Tüm Teklif Durumları</option>
          <option value="DRAFT">Taslak</option>
          <option value="SENT">Gönderildi</option>
          <option value="APPROVED">Onaylandı</option>
          <option value="REJECTED">Reddedildi</option>
          <option value="REVISED">Revize Edildi</option>
        </select>
      </div>

      {/* DataTable */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={quotesResponse?.meta?.totalRowCount}
      />

      {/* ================= MODAL: YENİ TEKLİF HAZIRLA ================= */}
      <QuoteFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        mode="create"
      />

      {/* ================= MODAL: TEKLİFİ REVİZE ET ================= */}
      {reviseModalQuote && (
        <QuoteFormModal
          isOpen={!!reviseModalQuote}
          onClose={() => setReviseModalQuote(null)}
          mode="revise"
          initialQuote={reviseModalQuote}
          onSuccess={() => {
            setReviseModalQuote(null);
            queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] });
          }}
        />
      )}

      {/* ================= MODAL: RET SEBEBİ GİRİŞİ ================= */}
      {rejectModalQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Teklifi Reddet
            </h3>
            <p className="text-xs text-muted-foreground">
              {rejectModalQuote.quoteNumber} numaralı teklifin ret gerekçesini belirtmeniz zorunludur.
            </p>

            <div className="space-y-2">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Örn: Bütçeyi aştı, rakip teklif tercih edildi, proje iptal oldu..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalQuote(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(rejectModalQuote.id, 'REJECTED', rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                Reddi Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TEKLİFİ SATIŞA DÖNÜŞTÜR ================= */}
      {convertToSaleQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5 text-green-600" />
              Teklifi Satışa / Siparişe Dönüştür
            </h3>
            <p className="text-xs text-muted-foreground">
              {convertToSaleQuote.quoteNumber} numaralı teklif üzerinden satış kaydı açılacak. Satılan donanımların seri/MAC numaralarını girebilirsiniz.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Müşteri: </span>
                  <span className="font-bold">{convertToSaleQuote.customer?.companyName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Toplam Tutar: </span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {formatMoney(convertToSaleQuote.grandTotal, convertToSaleQuote.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isInvoicedCheck"
                  checked={saleIsInvoiced}
                  onChange={(e) => setSaleIsInvoiced(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="isInvoicedCheck" className="text-xs font-semibold text-foreground cursor-pointer">
                  Fatura şimdiden kesildi mi?
                </label>
              </div>

              {saleIsInvoiced && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Fatura Numarası</label>
                  <input
                    type="text"
                    value={saleInvoiceNumber}
                    onChange={(e) => setSaleInvoiceNumber(e.target.value)}
                    placeholder="Örn: GIB202600000123"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConvertToSaleQuote(null)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmConvertToSale}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Satışı Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
