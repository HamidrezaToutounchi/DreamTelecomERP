import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  PackagePlus,
  Plus,
  Search,
  Warehouse as WarehouseIcon,
  Truck,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  Boxes,
  Cpu,
  Info,
  Trash2,
  ScanBarcode,
  Upload,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  useStockControllerFindAllEntries,
  useStockControllerCreateEntry,
  useStockControllerCancelEntry,
  useWarehousesControllerFindAll,
  useSuppliersControllerFindAll,
  useProductsControllerFindAll,
} from '@/api/generated';
import { BarcodeScanInput } from '@/components/stock/BarcodeScanInput';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { CopyableCode } from '@/components/common/CopyableCode';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface SerialItemState {
  serial: string;
  macAddress?: string;
}

interface EntryItemState {
  id: string; // frontend temp id
  productId: string;
  product?: any;
  quantity: number;
  unitPrice: number;
  currency: 'TRY' | 'USD' | 'EUR';
  serials: SerialItemState[];
}

export const StockEntriesPage: React.FC = () => {
  const { can, user } = useAuth();
  const queryClient = useQueryClient();

  const canCreate = can('STOCK_ENTRY', 'create');
  const canEdit = can('STOCK_ENTRY', 'edit');

  // List View State
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Full Page Form View State
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Detail Modal State
  const [detailEntry, setDetailEntry] = useState<any | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields State
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formWaybillNumber, setFormWaybillNumber] = useState('');
  const [formEntryDate, setFormEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formDescription, setFormDescription] = useState('');
  const [formDocumentUrl, setFormDocumentUrl] = useState<string | null>(null);
  const [formDocumentName, setFormDocumentName] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [formItems, setFormItems] = useState<EntryItemState[]>([]);

  // Serial input helper state for active item
  const [activeSerialItemId, setActiveSerialItemId] = useState<string | null>(null);
  const [activeSerialTabItemId, setActiveSerialTabItemId] = useState<string | null>(null);
  const [currentSerialInput, setCurrentSerialInput] = useState('');
  const [bulkSerialsText, setBulkSerialsText] = useState('');
  const [currentMacInput, setCurrentMacInput] = useState('');

  // Queries
  const { data: entriesResponse, isLoading, refetch } = useStockControllerFindAllEntries({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
    warehouseId: warehouseFilter || undefined,
    supplierId: supplierFilter || undefined,
    status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
  });

  const { data: warehouses } = useWarehousesControllerFindAll();
  const { data: suppliers } = useSuppliersControllerFindAll();
  const { data: productsResponse } = useProductsControllerFindAll({ pageSize: 200 });

  const createMutation = useStockControllerCreateEntry();
  const cancelMutation = useStockControllerCancelEntry();

  const allProducts = useMemo(() => (productsResponse as any)?.data || [], [productsResponse]);

  // Set default warehouse when form opens
  const handleOpenCreateForm = () => {
    const defaultWh = warehouses?.find((w) => w.isDefault) || warehouses?.[0];
    setWizardStep(1);
    setFormWarehouseId(defaultWh?.id || '');
    setFormSupplierId('');
    setFormInvoiceNumber('');
    setFormWaybillNumber('');
    setFormEntryDate(new Date().toISOString().slice(0, 10));
    setFormDescription('');
    setFormDocumentUrl(null);
    setFormDocumentName(null);
    setFormItems([]);
    setActiveSerialItemId(null);
    setActiveSerialTabItemId(null);
    setCurrentSerialInput('');
    setCurrentMacInput('');
    setBulkSerialsText('');
    setIsFormOpen(true);
  };

  // Dedicated Product Barcode Scan Handler (EAN-13 / GTIN / Product Code)
  const handleScanProductBarcode = (barcode: string) => {
    const raw = barcode.trim();
    if (!raw) return;

    // Arama: Kod, ID veya Ürün Barkodları tablosundaki barkod
    const foundProduct = allProducts.find(
      (p: any) =>
        (p.code && p.code.toLowerCase() === raw.toLowerCase()) ||
        p.id === raw ||
        (p.barcodes && p.barcodes.some((b: any) => (b.barcode || '').toLowerCase() === raw.toLowerCase()))
    );

    if (foundProduct) {
      // Kalemlerde zaten var mı?
      const existing = formItems.find((it) => it.productId === foundProduct.id);
      if (existing) {
        handleUpdateItem(existing.id, { quantity: Number(existing.quantity) + 1 });
        toast.success(`"${foundProduct.name}" miktarı artırıldı: ${Number(existing.quantity) + 1}`);
      } else {
        handleAddItem(foundProduct.id);
        toast.success(`Ürün kalemlere eklendi: "${foundProduct.name}"`);
      }
    } else {
      toast.error(`"${raw}" barkoduna veya ürün koduna ait ürün katalogda bulunamadı.`);
    }
  };

  // Document upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.xml'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExts.includes(ext)) {
      toast.error('Yalnızca PDF, JPG, PNG ve XML dosyaları yüklenebilir.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya boyutu maksimum 10 MB olabilir.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/stock/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setFormDocumentUrl(res.data.url);
      setFormDocumentName(file.name);
      toast.success('Belge başarıyla yüklendi.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Belge yüklenemedi.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Add Item to Form
  const handleAddItem = (productId?: string) => {
    const defaultProduct = productId ? allProducts.find((p: any) => p.id === productId) : allProducts[0];
    if (!defaultProduct) {
      toast.error('Lütfen önce katalogdan bir ürün seçin.');
      return;
    }

    const newItem: EntryItemState = {
      id: Math.random().toString(36).slice(2, 9),
      productId: defaultProduct.id,
      product: defaultProduct,
      quantity: 1,
      unitPrice: Number(defaultProduct.unitPrice) || 0,
      currency: defaultProduct.currency || 'TRY',
      serials: [],
    };

    setFormItems((prev) => [...prev, newItem]);
    if (defaultProduct.trackSerial) {
      setActiveSerialItemId(newItem.id);
    }
  };

  const handleUpdateItem = (itemId: string, patch: Partial<EntryItemState>) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, ...patch };
        if (patch.productId) {
          const prod = allProducts.find((p: any) => p.id === patch.productId);
          updated.product = prod;
          if (prod) {
            updated.unitPrice = Number(prod.unitPrice) || 0;
            updated.currency = prod.currency || 'TRY';
            if (!prod.trackSerial) {
              updated.serials = [];
            }
          }
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setFormItems((prev) => prev.filter((it) => it.id !== itemId));
    if (activeSerialItemId === itemId) {
      setActiveSerialItemId(null);
    }
  };

  // Single Serial Scan Handler
  const handleScanSerialForItem = (itemId: string, rawSerial: string) => {
    const serial = rawSerial.trim().toUpperCase();
    if (!serial) return;

    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        // Duplicate check within item
        if (item.serials.some((s) => s.serial === serial)) {
          toast.error(`"${serial}" seri numarası bu kaleme zaten eklendi.`);
          return item;
        }

        // Duplicate check across all items in form
        const isDuplicateAcrossForm = prev.some(
          (other) => other.id !== itemId && other.serials.some((s) => s.serial === serial)
        );
        if (isDuplicateAcrossForm) {
          toast.error(`"${serial}" seri numarası başka bir kalemde zaten mevcut.`);
          return item;
        }

        const mac = currentMacInput.trim() ? currentMacInput.trim().toUpperCase() : undefined;
        const newSerials = [...item.serials, { serial, macAddress: mac }];
        setCurrentMacInput('');
        setCurrentSerialInput('');
        toast.success(`Seri eklendi: ${serial}`);
        return {
          ...item,
          quantity: Math.max(Number(item.quantity || 0), newSerials.length),
          serials: newSerials,
        };
      })
    );
  };

  // Bulk Serials Paste Handler
  const handleBulkAddSerials = (itemId: string) => {
    if (!bulkSerialsText.trim()) return;
    const lines = bulkSerialsText
      .split('\n')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    if (lines.length === 0) return;

    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const currentSerialsSet = new Set(item.serials.map((s) => s.serial));
        const newSerialsList = [...item.serials];
        let addedCount = 0;

        for (const line of lines) {
          // Desteklenen format: "SERIAL" veya "SERIAL,MAC"
          const parts = line.split(/[,\t;]/).map((p) => p.trim());
          const serial = parts[0]?.toUpperCase();
          const mac = parts[1]?.toUpperCase() || undefined;

          if (serial && !currentSerialsSet.has(serial)) {
            currentSerialsSet.add(serial);
            newSerialsList.push({ serial, macAddress: mac });
            addedCount++;
          }
        }

        toast.success(`${addedCount} adet seri numarası toplu eklendi.`);
        return {
          ...item,
          quantity: Math.max(Number(item.quantity || 0), newSerialsList.length),
          serials: newSerialsList,
        };
      })
    );

    setBulkSerialsText('');
  };

  const handleRemoveSerial = (itemId: string, serialToRemove: string) => {
    setFormItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSerials = item.serials.filter((s) => s.serial !== serialToRemove);
        return {
          ...item,
          quantity: item.product?.trackSerial ? newSerials.length : item.quantity,
          serials: newSerials,
        };
      })
    );
  };

  // Submit Stock Entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formWarehouseId) {
      toast.error('Lütfen giriş yapılacak depoyu seçin.');
      return;
    }

    if (formItems.length === 0) {
      toast.error('Giriş fişine en az bir kalem eklemelisiniz.');
      return;
    }

    // Doğrulama: Seri takipli ürünlerin miktarı ile okutulan seriler eşleşmeli
    for (const item of formItems) {
      if (item.product?.trackSerial) {
        if (item.serials.length === 0) {
          toast.error(`"${item.product.name}" seri takiplidir. En az bir seri numarası okutmalısınız.`);
          return;
        }
        if (item.serials.length !== item.quantity) {
          toast.error(
            `"${item.product.name}" için girilen miktar (${item.quantity}) ile okutulan seri sayısı (${item.serials.length}) uyuşmuyor.`
          );
          return;
        }
        if (item.product.macRequired) {
          const missingMac = item.serials.some((s) => !s.macAddress);
          if (missingMac) {
            toast.error(`"${item.product.name}" için her seri numarasına MAC adresi girilmesi zorunludur.`);
            return;
          }
        }
      }
    }

    try {
      const payload = {
        warehouseId: formWarehouseId,
        supplierId: formSupplierId || undefined,
        invoiceNumber: formInvoiceNumber.trim() || undefined,
        waybillNumber: formWaybillNumber.trim() || undefined,
        entryDate: formEntryDate ? new Date(formEntryDate).toISOString() : undefined,
        description: formDescription.trim() || undefined,
        documentUrl: formDocumentUrl || undefined,
        documentName: formDocumentName || undefined,
        items: formItems.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice) || 0,
          currency: it.currency,
          serials: it.product?.trackSerial
            ? it.serials.map((s) => ({
                serial: s.serial,
                macAddress: s.macAddress || undefined,
              }))
            : undefined,
        })),
      };

      await createMutation.mutateAsync({ data: payload });
      toast.success('Mal kabul işlemi tamamlandı ve ürünler depoya alındı.');
      setIsFormOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mal kabul girişi kaydedilemedi.');
    }
  };

  // Cancel Stock Entry (Reversal)
  const handleCancelEntry = async () => {
    if (!detailEntry) return;
    if (!cancelReason.trim()) {
      toast.error('Lütfen geçerli bir iptal gerekçesi yazınız.');
      return;
    }

    setIsCancelling(true);
    try {
      await cancelMutation.mutateAsync({
        id: detailEntry.id,
        data: { cancelReason: cancelReason.trim() },
      });
      toast.success(`Fiş (${detailEntry.entryNumber}) iptal edildi ve stoklar geri alındı.`);
      setCancelModalOpen(false);
      setDetailEntry(null);
      setCancelReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Giriş fişi iptal edilemedi.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Table Columns
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'entryNumber',
        header: 'Fiş Numarası',
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <CopyableCode code={row.original.entryNumber} className="font-bold text-xs" />
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>{row.original.type === 'PURCHASE' ? 'Satın Alma' : row.original.type}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'warehouse',
        header: 'Giriş Yapılan Depo',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <WarehouseIcon className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
            <span>{row.original.warehouse?.name || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'supplier',
        header: 'Tedarikçi Firma',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <Truck className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.original.supplier?.name || 'Tedarikçi Belirtilmemiş'}</span>
          </div>
        ),
      },
      {
        id: 'documents',
        header: 'İrsaliye / Fatura No',
        cell: ({ row }) => (
          <div className="text-xs space-y-0.5 font-mono">
            {row.original.waybillNumber && (
              <div className="text-foreground">
                <span className="text-[10px] text-muted-foreground mr-1">İRS:</span>
                {row.original.waybillNumber}
              </div>
            )}
            {row.original.invoiceNumber && (
              <div className="text-muted-foreground">
                <span className="text-[10px] mr-1">FTR:</span>
                {row.original.invoiceNumber}
              </div>
            )}
            {!row.original.waybillNumber && !row.original.invoiceNumber && (
              <span className="text-muted-foreground italic">-</span>
            )}
          </div>
        ),
      },
      {
        id: 'summary',
        header: 'Kalem & Miktar',
        cell: ({ row }) => {
          const items = row.original.items || [];
          const totalQty = items.reduce((acc: number, curr: any) => acc + Number(curr.quantity || 0), 0);
          const serialCount = row.original._count?.serials || 0;
          return (
            <div className="text-xs space-y-0.5">
              <div className="font-bold text-foreground">
                {items.length} Kalem ({totalQty} Adet)
              </div>
              {serialCount > 0 && (
                <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  {serialCount} adet seri takipli
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Durum',
        cell: ({ row }) => {
          const isCompleted = row.original.status === 'COMPLETED';
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border',
                isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
              )}
            >
              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isCompleted ? 'Stoğa Alındı' : 'İptal Edildi'}
            </span>
          );
        },
      },
      {
        accessorKey: 'entryDate',
        header: 'Giriş Tarihi',
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <div>{formatDate(row.original.entryDate, 'dd.MM.yyyy')}</div>
            <div className="text-[10px]">{row.original.createdBy?.fullName || '-'}</div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'İşlemler',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setDetailEntry(row.original)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-navy-50 hover:bg-navy-100 text-navy-800 dark:bg-navy-950 dark:hover:bg-navy-900 dark:text-navy-300 border border-navy-200 dark:border-navy-800 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            İncele
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: entriesResponse?.data || [],
    columns,
    pageCount: entriesResponse?.meta?.totalPages || 1,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  /* ================= TAM SAYFA FORM: MAL KABUL SİHİRBAZI ================= */
  if (isFormOpen) {
    const totalItemsCount = formItems.length;
    const totalQuantity = formItems.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const serialTrackedItems = formItems.filter((it) => it.product?.trackSerial);
    const hasSerialItems = serialTrackedItems.length > 0;

    // Active item for serial management tab in Step 3
    const activeItemInStep3 =
      serialTrackedItems.find((it) => it.id === activeSerialTabItemId) || serialTrackedItems[0] || null;

    // Step validation helpers
    const canGoToStep2 = !!formWarehouseId;
    const canGoToStep3 = formItems.length > 0;
    
    // Check if all serial tracked items have exact matching serial counts
    const serialMismatches = serialTrackedItems.filter(
      (it) => it.serials.length !== Number(it.quantity)
    );
    const missingMacItems = serialTrackedItems.filter(
      (it) => it.product?.macRequired && it.serials.some((s) => !s.macAddress)
    );
    const isStep3Valid = serialMismatches.length === 0 && missingMacItems.length === 0;

    return (
      <div className="space-y-6 max-w-6xl mx-auto py-2">
        {/* Üst Başlık ve Geri Dön */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Mal Kabul Listesine Dön</span>
          </button>
          <div className="text-left sm:text-right">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2 sm:justify-end">
              <PackagePlus className="w-5 h-5 text-navy-700 dark:text-navy-400" />
              Mal Kabul & Stok Giriş Sihirbazı
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tedarikçi irsaliyesi kabulü, ürün barkodu okutma ve cihaz bazlı Seri No / MAC eşleme.
            </p>
          </div>
        </div>

        {/* 4 ADIMLI WIZARD STEPPER BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Adım 1 */}
          <button
            type="button"
            onClick={() => setWizardStep(1)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer',
              wizardStep === 1
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                wizardStep === 1
                  ? 'bg-navy-700 text-white'
                  : canGoToStep2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {canGoToStep2 && wizardStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">1. Belge & Depo</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {formWarehouseId ? 'Depo Seçildi' : 'Depo & Fatura Bilgisi'}
              </div>
            </div>
          </button>

          {/* Adım 2 */}
          <button
            type="button"
            disabled={!canGoToStep2}
            onClick={() => canGoToStep2 && setWizardStep(2)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              wizardStep === 2
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                wizardStep === 2
                  ? 'bg-navy-700 text-white'
                  : formItems.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {formItems.length > 0 && wizardStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">2. Ürün & Barkod</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {formItems.length > 0 ? `${formItems.length} Kalem Eklendi` : 'Barkod Okut / Kalem Ekle'}
              </div>
            </div>
          </button>

          {/* Adım 3 */}
          <button
            type="button"
            disabled={!canGoToStep3}
            onClick={() => canGoToStep3 && setWizardStep(3)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              wizardStep === 3
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                wizardStep === 3
                  ? 'bg-navy-700 text-white'
                  : isStep3Valid && wizardStep > 3
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              {isStep3Valid && wizardStep > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">3. Seri & MAC Eşleme</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {!hasSerialItems
                  ? 'Seri Takipli Ürün Yok'
                  : isStep3Valid
                  ? 'Tüm Seriler Tamamlandı'
                  : `${serialTrackedItems.length} Ürün İçin Seri Girişi`}
              </div>
            </div>
          </button>

          {/* Adım 4 */}
          <button
            type="button"
            disabled={!canGoToStep3}
            onClick={() => canGoToStep3 && setWizardStep(4)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              wizardStep === 4
                ? 'bg-navy-50 dark:bg-navy-950/60 border border-navy-200 dark:border-navy-800 ring-2 ring-navy-600/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            )}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                wizardStep === 4 ? 'bg-navy-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              )}
            >
              4
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-foreground truncate">4. Özet & Tamamlama</div>
              <div className="text-[10px] text-muted-foreground truncate">Kontrol ve Mal Kabulü Bitir</div>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ADIM 1: BELGE VE DEPO BİLGİLERİ                                           */}
        {/* ========================================================================= */}
        {wizardStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    Adım 1: Depo ve Fatura / İrsaliye Bilgileri
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Giriş yapılacak hedef depoyu ve tedarikçi evrak detaylarını belirleyin.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Hedef Depo <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  >
                    <option value="">Depo Seçiniz...</option>
                    {(warehouses || []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) {w.isDefault ? '— Varsayılan' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Tedarikçi Firma</label>
                  <select
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  >
                    <option value="">Tedarikçi Seçiniz (Opsiyonel)...</option>
                    {(suppliers || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Giriş Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formEntryDate}
                    onChange={(e) => setFormEntryDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">İrsaliye Numarası</label>
                  <input
                    type="text"
                    placeholder="Örn: IRS-2026-0045"
                    value={formWaybillNumber}
                    onChange={(e) => setFormWaybillNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Fatura Numarası</label>
                  <input
                    type="text"
                    placeholder="Örn: FTR-2026-9876"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    İrsaliye / Fatura Belgesi (PDF, Görsel, XML)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 h-10 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-navy-500 bg-background text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors overflow-hidden">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="truncate">
                        {isUploadingDoc
                          ? 'Yükleniyor...'
                          : formDocumentName || 'Dosya Seç (Maks 10MB)'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                    {formDocumentUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormDocumentUrl(null);
                          setFormDocumentName(null);
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Belgeyi Kaldır"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Açıklama / Fiş Notları</label>
                <input
                  type="text"
                  placeholder="Mal kabul fişine dair açıklama, koli adedi vb..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>
            </div>

            {/* Alt Gezinme Barı */}
            <div className="flex items-center justify-between p-4 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!canGoToStep2}
                onClick={() => {
                  if (!formWarehouseId) {
                    toast.error('Lütfen giriş yapılacak depoyu seçin.');
                    return;
                  }
                  setWizardStep(2);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>İleri: Ürün & Barkod Kalemleri Ekle</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 2: ÜRÜN KALEMLERİ & ÜRÜN BARKODU OKUTMA                              */}
        {/* ========================================================================= */}
        {wizardStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* HIZLI ÜRÜN BARKODU OKUYUCU ÇUBUĞU */}
            <div className="p-4 bg-gradient-to-r from-navy-900 to-slate-900 text-white rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ScanBarcode className="w-4 h-4 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Ürün Koli / Ambalaj Barkodu Okut (EAN-13, GS1, Ürün Kodu)</h3>
                    <p className="text-[11px] text-slate-300">
                      Cihaz kolisi veya ambalajındaki barkodu okutunuz. Kalem otomatik olarak listeye eklenir veya miktarı artırılır.
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-teal-300 font-mono hidden sm:block">
                  ⚡ Zebra HID Uyumlu
                </div>
              </div>

              <div className="pt-1">
                <BarcodeScanInput
                  placeholder="Koli barkodunu (EAN-13 / GS1) okutunuz veya Ürün Kodu yazıp Enter'a basınız..."
                  onScan={handleScanProductBarcode}
                  inputClassName="bg-white text-slate-900 placeholder:text-slate-400 border-slate-300 shadow-sm font-bold text-sm"
                />
              </div>
            </div>

            {/* KALEMLER TABLOSU */}
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    Giriş Kalemleri ({formItems.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bu partide depoya alınacak ürünler, alış fiyatları ve adetleri.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Katalogdan Seçerek Ekle */}
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold cursor-pointer"
                  >
                    <option value="" disabled>
                      + Katalogdan Ürün Seç...
                    </option>
                    {allProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code || '-'}) {p.trackSerial ? '★ Seri Takipli' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formItems.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <PackagePlus className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-foreground">Henüz kalem eklenmedi.</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Yukarıdaki barkod alanından ürün barkodunu okutarak veya sağ üstteki menüden ürün seçerek listeye ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-muted-foreground font-bold">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Ürün Tanımı</th>
                          <th className="py-2.5 px-3">Takip Türü</th>
                          <th className="py-2.5 px-3">Birim Alış Fiyatı</th>
                          <th className="py-2.5 px-3">Para Birimi</th>
                          <th className="py-2.5 px-3">Miktar</th>
                          <th className="py-2.5 px-3">Tutar</th>
                          <th className="py-2.5 px-3 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {formItems.map((item, idx) => {
                          const isSerial = !!item.product?.trackSerial;
                          const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                              <td className="py-3 px-3 font-bold text-muted-foreground">{idx + 1}</td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-foreground">{item.product?.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Kod: {item.product?.code || '-'} | Model: {item.product?.model || '-'}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                {isSerial ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                      <ScanBarcode className="w-3 h-3" />
                                      Seri Takipli
                                    </span>
                                    {item.product?.trackMac && (
                                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                        {item.product.macRequired ? 'MAC Zorunlu' : 'MAC Opsiyonel'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-medium">Standart Stok</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                                  }
                                  className="w-24 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background font-mono font-bold text-xs"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={item.currency}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { currency: e.target.value as any })
                                  }
                                  className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background font-semibold text-xs"
                                >
                                  <option value="TRY">₺ TRY</option>
                                  <option value="USD">$ USD</option>
                                  <option value="EUR">€ EUR</option>
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItem(item.id, { quantity: parseInt(e.target.value) || 1 })
                                  }
                                  className="w-20 h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background font-mono font-bold text-xs"
                                />
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-foreground">
                                {formatMoney(lineTotal, item.currency)}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                  title="Kalemi Sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Alt Gezinme Barı */}
            <div className="flex items-center justify-between p-4 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri: Belge Bilgileri</span>
              </button>

              <button
                type="button"
                disabled={formItems.length === 0}
                onClick={() => {
                  if (formItems.length === 0) {
                    toast.error('Lütfen en az bir ürün kalemi ekleyin.');
                    return;
                  }
                  if (hasSerialItems) {
                    if (!activeSerialTabItemId) {
                      setActiveSerialTabItemId(serialTrackedItems[0].id);
                    }
                    setWizardStep(3);
                  } else {
                    // Seri takipli ürün yoksa doğrudan 4. adıma geç
                    setWizardStep(4);
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>
                  {hasSerialItems
                    ? `İleri: Seri & MAC Eşleme (${serialTrackedItems.length} Ürün)`
                    : 'İleri: Özet & Kontrol'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 3: SERİ NUMARALARI VE MAC EŞLEME (CİHAZ BAZLI BENZERSİZ KODLAR)      */}
        {/* ========================================================================= */}
        {wizardStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Açıklama Kutusu */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-800 dark:text-blue-200">
                <Info className="w-4 h-4" />
                Önemli Bilgilendirme: Koli Barkodu ile Seri / MAC Farkı
              </div>
              <p className="leading-relaxed">
                Bu adımdaki ürünlerin (örneğin 10 adet Router) koli/ambalaj barkodları <strong>aynıdır</strong>. Ancak depoya giren her bir fiziksel cihazın <strong>Seri Numarası (SN)</strong> ve varsa <strong>MAC Adresi</strong> benzersizdir.
              </p>
              <p className="leading-relaxed text-blue-700 dark:text-blue-400">
                Lütfen her bir cihazın seri barkodunu ve MAC adresini tek tek okutun veya Excel listesinden topluca yapıştırın.
              </p>
            </div>

            {!hasSerialItems ? (
              <div className="p-12 text-center bg-card border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Seri Takipli Ürün Bulunmuyor</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Eklediğiniz tüm ürünler seri takipsizdir. Bu adımı atlayıp doğrudan özete geçebilirsiniz.
                </p>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <span>Özet ve Tamamlama Adımına İlerle</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Ürün Sekmeleri */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {serialTrackedItems.map((item) => {
                    const isSelected = item.id === (activeItemInStep3?.id || serialTrackedItems[0]?.id);
                    const isCompleted = item.serials.length === Number(item.quantity);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSerialTabItemId(item.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border',
                          isSelected
                            ? 'bg-navy-700 text-white border-navy-700 shadow-xs'
                            : 'bg-card text-foreground border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        )}
                      >
                        <span>{item.product?.name}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-mono',
                            isSelected
                              ? isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/20 text-white'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          )}
                        >
                          {item.serials.length} / {item.quantity} {isCompleted ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Seçili Ürünün Seri ve MAC Yönetim Paneli */}
                {activeItemInStep3 && (
                  <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
                    {/* Ürün Başlığı & İlerleme Durumu */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
                      <div>
                        <h4 className="text-base font-bold text-foreground">
                          {activeItemInStep3.product?.name}
                        </h4>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          Katalog Kodu: {activeItemInStep3.product?.code || '-'} | Birim Fiyat:{' '}
                          {formatMoney(activeItemInStep3.unitPrice, activeItemInStep3.currency)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[11px] text-muted-foreground font-semibold">Giriş Hedefi</div>
                          <div className="text-sm font-bold font-mono text-foreground">
                            {activeItemInStep3.quantity} Adet
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-muted-foreground font-semibold">Okutulan Seri</div>
                          <div
                            className={cn(
                              'text-sm font-bold font-mono',
                              activeItemInStep3.serials.length === Number(activeItemInStep3.quantity)
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            )}
                          >
                            {activeItemInStep3.serials.length} Adet
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TEK TEK SERİ VE MAC OKUTMA FORMU */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-2">
                          <ScanBarcode className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                          Tek Tek Seri No ve MAC Okutma (Zebra HID Barkod Okuyucu Uyumlu)
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          Enter tuşuna basıldığında otomatik eklenir
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className={cn(activeItemInStep3.product?.trackMac ? 'sm:col-span-6' : 'sm:col-span-9')}>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Cihaz Seri Numarası (SN) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Seri no okutunuz / yazınız..."
                            value={currentSerialInput}
                            onChange={(e) => setCurrentSerialInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (currentSerialInput.trim()) {
                                  handleScanSerialForItem(activeItemInStep3.id, currentSerialInput);
                                }
                              }
                            }}
                            className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold uppercase"
                          />
                        </div>

                        {activeItemInStep3.product?.trackMac && (
                          <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-foreground block mb-1">
                              MAC Adresi{' '}
                              {activeItemInStep3.product.macRequired ? (
                                <span className="text-red-500">* (Zorunlu)</span>
                              ) : (
                                <span className="text-muted-foreground">(Opsiyonel)</span>
                              )}
                            </label>
                            <input
                              type="text"
                              placeholder="Örn: AA:BB:CC:DD:EE:FF"
                              value={currentMacInput}
                              onChange={(e) => setCurrentMacInput(e.target.value.toUpperCase())}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (currentSerialInput.trim()) {
                                    handleScanSerialForItem(activeItemInStep3.id, currentSerialInput);
                                  }
                                }
                              }}
                              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono uppercase"
                            />
                          </div>
                        )}

                        <div className={cn(activeItemInStep3.product?.trackMac ? 'sm:col-span-2' : 'sm:col-span-3')}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!currentSerialInput.trim()) {
                                toast.error('Lütfen bir seri numarası giriniz.');
                                return;
                              }
                              handleScanSerialForItem(activeItemInStep3.id, currentSerialInput);
                            }}
                            className="w-full h-10 px-4 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            + Seriyi Ekle
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* TOPLU SERİ VE MAC YAPIŞTIRMA */}
                    <details className="text-xs group border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-card">
                      <summary className="font-bold text-navy-700 dark:text-navy-300 cursor-pointer flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Upload className="w-4 h-4" />
                          Excel veya Listeden Toplu Seri & MAC Yapıştır
                        </span>
                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-3 space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] text-muted-foreground">
                          Excel sütununu kopyalayıp buraya yapıştırabilirsiniz. Desteklenen biçimler:
                          <br />• Sadece seri numarası: <code>SN10001</code>
                          <br />• Seri ve MAC birlikte: <code>SN10001,AA:BB:CC:DD:EE:01</code> veya Tab ile ayrılmış
                        </p>
                        <textarea
                          rows={4}
                          value={bulkSerialsText}
                          onChange={(e) => setBulkSerialsText(e.target.value)}
                          placeholder="SN001,AA:BB:CC:DD:EE:01&#10;SN002,AA:BB:CC:DD:EE:02&#10;SN003"
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleBulkAddSerials(activeItemInStep3.id)}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                        >
                          Toplu Listeyi Kaleme Ekle
                        </button>
                      </div>
                    </details>

                    {/* OKUTULAN SERİLER TABLOSU */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-foreground">
                          Eklenen Seri Numaraları ({activeItemInStep3.serials.length})
                        </h5>
                        {activeItemInStep3.serials.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Bu kaleme ait tüm seri numaralarını temizlemek istediğinize emin misiniz?')) {
                                setFormItems((prev) =>
                                  prev.map((it) =>
                                    it.id === activeItemInStep3.id ? { ...it, serials: [] } : it
                                  )
                                );
                              }
                            }}
                            className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Tüm Serileri Temizle
                          </button>
                        )}
                      </div>

                      {activeItemInStep3.serials.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-muted-foreground">
                          Bu ürün için henüz seri numarası girilmedi.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {activeItemInStep3.serials.map((s, sIdx) => (
                            <div
                              key={s.serial}
                              className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs"
                            >
                              <div className="truncate pr-2">
                                <div className="font-mono font-bold text-foreground flex items-center gap-1.5 truncate">
                                  <span className="text-[10px] text-muted-foreground font-normal">#{sIdx + 1}</span>
                                  {s.serial}
                                </div>
                                {s.macAddress ? (
                                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                                    MAC: {s.macAddress}
                                  </div>
                                ) : activeItemInStep3.product?.trackMac ? (
                                  <div className="text-[10px] text-amber-500 font-medium">MAC Eksik</div>
                                ) : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSerial(activeItemInStep3.id, s.serial)}
                                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                                title="Kaldır"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alt Gezinme Barı */}
            <div className="flex items-center justify-between p-4 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri: Ürün Kalemleri</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (serialMismatches.length > 0) {
                    const firstMis = serialMismatches[0];
                    toast.warning(
                      `"${firstMis.product?.name}" için belirlenen miktar (${firstMis.quantity}) ile girilen seri adedi (${firstMis.serials.length}) uyuşmuyor.`
                    );
                  }
                  setWizardStep(4);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>İleri: Özet & Kontrol Adımı</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADIM 4: ÖZET, KONTROL VE MAL KABUL ONAYI                                  */}
        {/* ========================================================================= */}
        {wizardStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Doğrulama Durum Uyarısı */}
            {!isStep3Valid && hasSerialItems ? (
              <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/20 text-xs text-rose-900 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4" />
                  Eksik Seri Numarası veya MAC Adresi Tespit Edildi
                </div>
                <p>
                  Seri takipli bazı ürünlerde girilen seri numarası sayısı hedef miktara eşit değildir veya MAC adresi zorunlu olmasına rağmen boş bırakılmıştır. Girişi tamamlamak için lütfen 3. Adıma dönerek eksikleri tamamlayınız.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Tüm kontroller sağlandı. Mal kabul işlemi kaydedilmeye hazırdır.
              </div>
            )}

            {/* Belge ve Depo Özeti */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <WarehouseIcon className="w-4 h-4 text-navy-700" />
                  Depo & Evrak Bilgileri
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Hedef Depo:</span>
                    <strong className="text-foreground">
                      {warehouses?.find((w) => w.id === formWarehouseId)?.name || '-'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Tedarikçi:</span>
                    <strong className="text-foreground">
                      {suppliers?.find((s) => s.id === formSupplierId)?.name || 'Belirtilmedi'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Giriş Tarihi:</span>
                    <strong className="text-foreground">{formatDate(formEntryDate)}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">İrsaliye / Fatura No:</span>
                    <strong className="text-foreground font-mono">
                      {formWaybillNumber || '-'} / {formInvoiceNumber || '-'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-navy-700" />
                  Kalem & Miktar İcmali
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Toplam Kalem Çeşidi:</span>
                    <strong className="text-foreground">{formItems.length} Kalem</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Toplam Cihaz / Adet:</span>
                    <strong className="text-foreground">{totalQuantity} Adet</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-muted-foreground">Seri Takipli Ürün Sayısı:</span>
                    <strong className="text-foreground">{serialTrackedItems.length} Kalem</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Yüklenen Belge:</span>
                    <strong className="text-foreground truncate max-w-[200px]">
                      {formDocumentName || 'Eklenmedi'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Kalemler Doğrulama Tablosu */}
            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                Kalemlerin Son Doğrulama Durumu
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-muted-foreground font-bold">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Ürün</th>
                      <th className="py-2.5 px-3">Miktar</th>
                      <th className="py-2.5 px-3">Birim Fiyat</th>
                      <th className="py-2.5 px-3">Tutar</th>
                      <th className="py-2.5 px-3">Seri & MAC Durumu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formItems.map((item, idx) => {
                      const isSerial = !!item.product?.trackSerial;
                      const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                      const isSerialOk = !isSerial || item.serials.length === Number(item.quantity);

                      return (
                        <tr key={item.id}>
                          <td className="py-3 px-3 font-bold text-muted-foreground">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground">{item.product?.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {item.product?.code || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono">{item.quantity} Adet</td>
                          <td className="py-3 px-3 font-mono">
                            {formatMoney(item.unitPrice, item.currency)}
                          </td>
                          <td className="py-3 px-3 font-bold font-mono">
                            {formatMoney(lineTotal, item.currency)}
                          </td>
                          <td className="py-3 px-3">
                            {isSerial ? (
                              isSerialOk ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  ✓ {item.serials.length} / {item.quantity} Seri Girildi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  ⚠ {item.serials.length} / {item.quantity} Eksik Seri!
                                </span>
                              )
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Normal Stok</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alt İşlem Barı */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setWizardStep(hasSerialItems ? 3 : 2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Geri: Düzenle</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={!isStep3Valid || createMutation.isPending || isUploadingDoc}
                  onClick={(e) => handleSubmitEntry(e as any)}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {createMutation.isPending
                      ? 'Stoğa Alınıyor...'
                      : 'Mal Kabul Girişini Tamamla ve Stoklara İşle'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= LİSTE GÖRÜNÜMÜ ================= */
  return (
    <div className="space-y-6">
      {/* Üst Başlık & Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Mal Kabul & Stok Girişleri</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tedarikçi irsaliye/fatura kabulü, depo stok artışı, seri no ve garanti başlangıç takibi.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
          >
            <Plus className="w-4 h-4" />
            Yeni Mal Kabul / Giriş Yap
          </button>
        )}
      </div>

      {/* Filtre Barı */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative sm:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Fiş No, İrsaliye, Fatura ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">Tüm Depolar</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">Tüm Tedarikçiler</option>
            {(suppliers || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="COMPLETED">Stoğa Alındı</option>
            <option value="CANCELLED">İptal Edildi</option>
          </select>
        </div>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={entriesResponse?.meta?.totalRowCount}
      />

      {/* ================= MODAL: GİRİŞ FİŞİ DETAYI ================= */}
      {detailEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <PackagePlus className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                    Mal Kabul Detayı: {detailEntry.entryNumber}
                  </h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-bold border',
                      detailEntry.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    )}
                  >
                    {detailEntry.status === 'COMPLETED' ? 'Stoğa Alındı' : 'İptal Edildi'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Giriş Tarihi: {formatDate(detailEntry.entryDate, 'dd.MM.yyyy')} — Ekleyen:{' '}
                  {detailEntry.createdBy?.fullName || '-'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetailEntry(null)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* İptal Bilgisi Uyarısı (Eğer İptalse) */}
            {detailEntry.status === 'CANCELLED' && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Bu Giriş Fişi İptal Edilmiştir
                </div>
                <p>
                  <span className="font-semibold">İptal Eden:</span> {detailEntry.cancelledBy?.fullName || '-'} (
                  {formatDate(detailEntry.cancelledAt, 'dd.MM.yyyy HH:mm')})
                </p>
                <p>
                  <span className="font-semibold">İptal Gerekçesi:</span> {detailEntry.cancelReason || '-'}
                </p>
              </div>
            )}

            {/* Fiş Üst Bilgileri */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-muted-foreground block text-[10px]">Giriş Deposu</span>
                <span className="font-bold text-foreground">{detailEntry.warehouse?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Tedarikçi</span>
                <span className="font-bold text-foreground">{detailEntry.supplier?.name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">İrsaliye No</span>
                <span className="font-mono font-bold text-foreground">{detailEntry.waybillNumber || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Fatura No</span>
                <span className="font-mono font-bold text-foreground">{detailEntry.invoiceNumber || '-'}</span>
              </div>
            </div>

            {/* Ekli Belge Linki */}
            {detailEntry.documentUrl && (
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-navy-600" />
                  <span className="font-bold text-foreground">
                    {detailEntry.documentName || 'Ekli Belge'}
                  </span>
                </div>
                <a
                  href={detailEntry.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-navy-700 hover:text-navy-900 font-bold"
                >
                  <span>Belgeyi Aç</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Kalemler Tablosu */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">Kalemler</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left">Ürün</th>
                      <th className="py-2 px-3 text-right">Miktar</th>
                      <th className="py-2 px-3 text-right">Birim Fiyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(detailEntry.items || []).map((it: any) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {it.product?.name} ({it.product?.code || '-'})
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {it.quantity} {it.product?.unit || 'ADET'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatMoney(it.unitPrice, it.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Seri Numaraları Listesi (Varsa) */}
            {detailEntry.serials && detailEntry.serials.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">
                  Kayıtlı Seri Numaraları ({detailEntry.serials.length})
                </h4>
                <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  {detailEntry.serials.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-1.5 rounded bg-background border border-slate-200 dark:border-slate-800 text-[11px] font-mono"
                    >
                      <div className="font-bold text-foreground">{s.serial}</div>
                      {s.macAddress && (
                        <div className="text-[10px] text-muted-foreground">MAC: {s.macAddress}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aksiyon Barı */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                {canEdit && detailEntry.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Giriş Fişini İptal Et
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: İPTAL ONAYI ================= */}
      {cancelModalOpen && detailEntry && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              Giriş Fişini İptal Et
            </div>

            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{detailEntry.entryNumber}</span> numaralı mal kabul fişi
              iptal edilecek ve bu girişle artırılan tüm stok seviyeleri depodan geri düşülecektir.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                İptal Gerekçesi (Zorunlu) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Örn: Hatalı irsaliye numarası ve mükerrer giriş nedeniyle iptal edildi..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isCancelling || !cancelReason.trim()}
                onClick={handleCancelEntry}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? 'İptal Ediliyor...' : 'Girişi İptal Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
