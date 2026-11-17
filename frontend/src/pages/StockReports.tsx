import React, { useState } from 'react';
import {
  BarChart3,
  Search,
  Download,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Package,
  Layers,
  History,
  FileSpreadsheet,
  Truck,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Barcode,
  Calendar,
  Filter,
  RefreshCw,
  User,
  ScanBarcode,
  Coins,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatters';
import {
  useStockControllerGetWarehouseStockReport,
  useStockControllerGetCriticalStockReport,
  useStockControllerGetSerialTimeline,
  useStockControllerGetWarrantyReport,
  useStockControllerGetStockMovements,
  useStockControllerGetSupplierEntriesReport,
  useStockControllerGetCustomerExitsReport,
  useStockControllerGetFaultStatisticsReport,
  useWarehousesControllerFindAll,
} from '@/api/generated';
import { BarcodeScanInput } from '@/components/stock/BarcodeScanInput';
import { cn } from '@/lib/utils';

type ReportTab =
  | 'WAREHOUSE_STOCK'
  | 'CRITICAL_STOCK'
  | 'SERIAL_TIMELINE'
  | 'WARRANTY'
  | 'MOVEMENTS'
  | 'PARTNERS'
  | 'FAULT_STATS';

export default function StockReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('WAREHOUSE_STOCK');

  // Depo Stok & Kritik Filtreleri
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [stockSearch, setStockSearch] = useState('');

  // Seri No Yaşam Döngüsü Filtresi
  const [timelineQuery, setTimelineQuery] = useState('');
  const [searchedSerial, setSearchedSerial] = useState('');

  // Garanti Takip Filtreleri
  const [warrantyType, setWarrantyType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [warrantyDaysLeft, setWarrantyDaysLeft] = useState<number>(30);

  // Hareket Defteri Filtreleri
  const [movementStartDate, setMovementStartDate] = useState('');
  const [movementEndDate, setMovementEndDate] = useState('');
  const [movementType, setMovementType] = useState('');

  // Depolar Listesi
  const { data: warehousesData } = useWarehousesControllerFindAll();
  const warehouses = warehousesData || [];

  // API Queries
  const {
    data: warehouseStockData,
    isLoading: isWarehouseStockLoading,
    refetch: refetchWarehouseStock,
  } = useStockControllerGetWarehouseStockReport(
    { warehouseId: selectedWarehouseId || undefined },
    { query: { enabled: activeTab === 'WAREHOUSE_STOCK' } }
  );

  const {
    data: criticalStockData,
    isLoading: isCriticalStockLoading,
    refetch: refetchCriticalStock,
  } = useStockControllerGetCriticalStockReport({
    query: { enabled: activeTab === 'CRITICAL_STOCK' },
  });

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    error: timelineError,
  } = useStockControllerGetSerialTimeline(
    { query: searchedSerial },
    { query: { enabled: Boolean(searchedSerial && activeTab === 'SERIAL_TIMELINE'), retry: false } }
  );

  const {
    data: warrantyData,
    isLoading: isWarrantyLoading,
  } = useStockControllerGetWarrantyReport(
    { type: warrantyType, daysLeft: warrantyDaysLeft },
    { query: { enabled: activeTab === 'WARRANTY' } }
  );

  const {
    data: movementsData,
    isLoading: isMovementsLoading,
  } = useStockControllerGetStockMovements(
    {
      startDate: movementStartDate || undefined,
      endDate: movementEndDate || undefined,
      type: movementType || undefined,
    },
    { query: { enabled: activeTab === 'MOVEMENTS' } }
  );

  const { data: supplierEntriesData, isLoading: isSuppliersLoading } =
    useStockControllerGetSupplierEntriesReport({
      query: { enabled: activeTab === 'PARTNERS' },
    });

  const { data: customerExitsData, isLoading: isCustomersLoading } =
    useStockControllerGetCustomerExitsReport({
      query: { enabled: activeTab === 'PARTNERS' },
    });

  const { data: faultStatsData, isLoading: isFaultStatsLoading } =
    useStockControllerGetFaultStatisticsReport({
      query: { enabled: activeTab === 'FAULT_STATS' },
    });

  // Excel Dışa Aktarma
  const handleExportExcel = async (reportType: string, customParams: Record<string, any> = {}) => {
    const toastId = toast.loading('Excel raporu hazırlanıyor...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/stock/reports/export/${reportType}`, {
        params: customParams,
        responseType: 'blob',
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel dosyası indirildi.', { id: toastId });
    } catch (err: any) {
      toast.error('Excel dosyası oluşturulamadı.', { id: toastId });
    }
  };

  const handleSerialSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!timelineQuery.trim()) {
      toast.error('Lütfen bir seri no veya MAC adresi girin.');
      return;
    }
    setSearchedSerial(timelineQuery.trim());
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Stok & Sevkiyat Raporları
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Depo stok durumları, kritik seviyeler, seri no yaşam döngüsü zaman tüneli ve hareket defteri.
          </p>
        </div>
      </div>

      {/* Sekmeler (Modern ERP Segment Barı - Scrollbarsız, Temiz ve Şık) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('WAREHOUSE_STOCK')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'WAREHOUSE_STOCK'
              ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Depo Stok Durumu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CRITICAL_STOCK')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'CRITICAL_STOCK'
              ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 shadow-xs border border-rose-200 dark:border-rose-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Kritik Stok Uyarısı</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SERIAL_TIMELINE')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'SERIAL_TIMELINE'
              ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs border border-amber-200 dark:border-amber-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <History className="w-3.5 h-3.5 text-amber-500" />
          <span>Seri No Yaşam Döngüsü</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WARRANTY')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'WARRANTY'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-emerald-200 dark:border-emerald-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Garanti Takip Raporu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MOVEMENTS')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'MOVEMENTS'
              ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-200 dark:border-purple-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
          <span>Stok Hareket Defteri</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PARTNERS')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'PARTNERS'
              ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-teal-200 dark:border-teal-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Tedarikçi & Müşteri İcmali</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FAULT_STATS')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'FAULT_STATS'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-200 dark:border-indigo-900/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
          )}
        >
          <Wrench className="w-3.5 h-3.5 text-indigo-500" />
          <span>Arıza & Servis İstatistikleri</span>
        </button>
      </div>

      {/* ================= SEKME 1: DEPO BAZLI STOK DURUMU ================= */}
      {activeTab === 'WAREHOUSE_STOCK' && (
        <div className="space-y-4">
          {/* Envanter & Stok Değeri Özeti */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 dark:from-blue-950/40 dark:via-slate-900 dark:to-emerald-950/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Toplam Depo Mevcudu
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {((warehouseStockData as any[]) || []).reduce((acc: number, r: any) => acc + Number(r.quantity || 0), 0)} Kalem / Adet
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Toplam Envanter Değeri
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatMoney(((warehouseStockData as any[]) || []).reduce((acc: number, r: any) => acc + Number(r.totalValue || 0), 0), 'TRY')}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Kritik Seviyedeki Ürünler
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                {((warehouseStockData as any[]) || []).filter((r: any) => r.isCritical).length} Kalem
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Depo Seçimi */}
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Tüm Depolar</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>

              {/* Arama */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Ürün adı veya kodu ara..."
                  className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleExportExcel('warehouse-stock', { warehouseId: selectedWarehouseId || undefined })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Excel Olarak İndir (.xlsx)
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Ürün Kodu</th>
                    <th className="px-4 py-3">Ürün Adı</th>
                    <th className="px-4 py-3">Marka / Model</th>
                    <th className="px-4 py-3">Depo</th>
                    <th className="px-4 py-3 text-right">Mevcut Stok</th>
                    <th className="px-4 py-3 text-right">Birim Fiyat</th>
                    <th className="px-4 py-3 text-right">Toplam Değer</th>
                    <th className="px-4 py-3 text-right">Kritik Eşik</th>
                    <th className="px-4 py-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isWarehouseStockLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                        Stok durumu yükleniyor...
                      </td>
                    </tr>
                  ) : ((warehouseStockData as any[]) || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    ((warehouseStockData as any[]) || [])
                      .filter((row: any) =>
                        stockSearch
                          ? row.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
                            row.productCode.toLowerCase().includes(stockSearch.toLowerCase())
                          : true
                      )
                      .map((row: any, idx: number) => (
                        <tr
                          key={idx}
                          className={cn(
                            'hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors',
                            row.isCritical && 'bg-rose-50/40 dark:bg-rose-950/20'
                          )}
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {row.productCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {row.productName}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.brand || '-'} {row.model ? `/ ${row.model}` : ''}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {row.warehouseName}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-sm">
                            <span className={row.isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
                              {row.quantity} {row.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-xs text-slate-600 dark:text-slate-300">
                            {formatMoney(row.unitPrice || 0, row.currency || 'TRY')}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatMoney(row.totalValue || 0, row.currency || 'TRY')}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">
                            {row.minStockLevel ? `${row.minStockLevel} ${row.unit}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {row.isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                Kritik
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                Yeterli
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEKME 2: KRİTİK STOK UYARISI ================= */}
      {activeTab === 'CRITICAL_STOCK' && (
        <div className="space-y-4">
          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Kritik Stok Uyarısı (Eşik Seviyesi Altındaki Ürünler)
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                  Mevcut stoğu tanımlı minimum stok seviyesinin altına düşmüş ürünler listelenmektedir.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleExportExcel('critical-stock')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Sipariş Listesini İndir (Excel)
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Ürün Kodu</th>
                    <th className="px-4 py-3">Ürün Adı</th>
                    <th className="px-4 py-3">Depo</th>
                    <th className="px-4 py-3 text-right">Mevcut Miktar</th>
                    <th className="px-4 py-3 text-right">Kritik Eşik</th>
                    <th className="px-4 py-3 text-right">Eksik Miktar (İhtiyaç)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isCriticalStockLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : ((criticalStockData as any[]) || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-emerald-600 font-semibold">
                        🎉 Tebrikler! Kritik seviyede hiçbir ürün bulunmamaktadır. Tüm stoklar yeterlidir.
                      </td>
                    </tr>
                  ) : (
                    ((criticalStockData as any[]) || []).map((row: any, idx: number) => {
                      const deficit = (row.minStockLevel || 0) - row.quantity;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50">
                          <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {row.productCode}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {row.productName}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                            {row.warehouseName}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-600">
                            {row.quantity} {row.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {row.minStockLevel} {row.unit}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-700 dark:text-rose-400">
                            +{Math.max(0, deficit)} {row.unit}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEKME 3: SERİ NO YAŞAM DÖNGÜSÜ (ZAMAN TÜNELİ) ================= */}
      {activeTab === 'SERIAL_TIMELINE' && (
        <div className="space-y-6">
          {/* Seri / Barkod Arama */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-blue-600" />
                Cihaz Seri Numarası veya MAC Adresi Sorgula
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cihazın depoya ilk girişinden müşteriye sevkiyatına, gördüğü tüm servis ve bakım işlemlerine kadar eksiksiz tarihçe.
              </p>
            </div>

            <form onSubmit={handleSerialSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="relative flex-1">
                <ScanBarcode className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={timelineQuery}
                  onChange={(e) => setTimelineQuery(e.target.value)}
                  placeholder="Seri no veya MAC okutunuz / yazınız (Enter'a basın)..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 shadow-xs"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!timelineQuery.trim() || isTimelineLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Sorgula</span>
              </button>
            </form>
          </div>

          {/* Timeline Sonuçları */}
          {isTimelineLoading && (
            <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Cihaz yaşam döngüsü getiriliyor...
            </div>
          )}

          {Boolean(timelineError) && (
            <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-center text-sm text-rose-700 dark:text-rose-400 font-semibold">
              Belirtilen seri numarası veya MAC sistemde bulunamadı.
            </div>
          )}

          {timelineData && (
            <div className="space-y-6">
              {/* Cihaz Üst Bilgi Kartı */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                        {timelineData.serial}
                      </h2>
                      {timelineData.macAddress && (
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          MAC: {timelineData.macAddress}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        Durum: {timelineData.status}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">
                      {timelineData.productName} ({timelineData.productCode})
                    </p>
                    <p className="text-xs text-slate-500">
                      Marka: {timelineData.brand || '-'} | Model: {timelineData.model || '-'}
                    </p>
                  </div>

                  {/* Garanti Bilgisi */}
                  <div className="flex flex-col items-start md:items-end gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Müşteri Garantisi:
                      </span>
                      <span>
                        {timelineData.customerWarrantyEnd
                          ? new Date(timelineData.customerWarrantyEnd).toLocaleDateString('tr-TR')
                          : 'Tanımsız'}
                      </span>
                    </div>
                    {timelineData.currentCustomer && (
                      <div className="text-slate-500">
                        Mevcut Sahip: <strong className="text-slate-800 dark:text-slate-200">{timelineData.currentCustomer}</strong>
                      </div>
                    )}
                    {timelineData.currentWarehouse && (
                      <div className="text-slate-500">
                        Bulunduğu Depo: <strong className="text-slate-800 dark:text-slate-200">{timelineData.currentWarehouse}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* İnteraktif Dikey Zaman Tüneli */}
                <div className="pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
                    Kronolojik Yaşam Döngüsü Olayları ({timelineData.timeline.length} Olay)
                  </h3>

                  <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {timelineData.timeline.map((event, idx) => {
                      const isEntry = event.type === 'STOCK_ENTRY';
                      const isExit = event.type === 'STOCK_EXIT';
                      const isFault = event.type === 'FAULT_RECORD';

                      return (
                        <div key={event.id || idx} className="relative group">
                          {/* İkon Noktası */}
                          <div
                            className={cn(
                              'absolute -left-[30px] top-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-xs shadow-sm',
                              isEntry && 'bg-emerald-600',
                              isExit && 'bg-blue-600',
                              isFault && 'bg-amber-600',
                              !isEntry && !isExit && !isFault && 'bg-purple-600'
                            )}
                          >
                            {isEntry && <Package className="w-3 h-3" />}
                            {isExit && <Truck className="w-3 h-3" />}
                            {isFault && <Wrench className="w-3 h-3" />}
                            {!isEntry && !isExit && !isFault && <ArrowRight className="w-3 h-3" />}
                          </div>

                          {/* Kart İçeriği */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 transition-all group-hover:border-blue-300 dark:group-hover:border-blue-700">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {event.title}
                              </h4>
                              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(event.date).toLocaleString('tr-TR')}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {event.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                              {event.referenceNumber && (
                                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                  Ref: {event.referenceNumber}
                                </span>
                              )}
                              {event.party && (
                                <span>İlgili Taraf: <strong>{event.party}</strong></span>
                              )}
                              {event.performedBy && (
                                <span>İşlem Yapan: <strong>{event.performedBy}</strong></span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SEKME 4: GARANTİ TAKİP RAPORU ================= */}
      {activeTab === 'WARRANTY' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={warrantyType}
                onChange={(e) => setWarrantyType(e.target.value as any)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
              >
                <option value="CUSTOMER">Müşteri Garantisi Takibi</option>
                <option value="SUPPLIER">Tedarikçi Garantisi Takibi</option>
              </select>

              <select
                value={warrantyDaysLeft}
                onChange={(e) => setWarrantyDaysLeft(Number(e.target.value))}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value={15}>Bitişine 15 Gün Kalanlar</option>
                <option value={30}>Bitişine 30 Gün Kalanlar</option>
                <option value={60}>Bitişine 60 Gün Kalanlar</option>
                <option value={90}>Bitişine 90 Gün Kalanlar</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Seri No</th>
                    <th className="px-4 py-3">Ürün & Model</th>
                    <th className="px-4 py-3">{warrantyType === 'CUSTOMER' ? 'Müşteri' : 'Tedarikçi'}</th>
                    <th className="px-4 py-3">Garanti Bitiş Tarihi</th>
                    <th className="px-4 py-3 text-right">Kalan Gün</th>
                    <th className="px-4 py-3 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isWarrantyLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : ((warrantyData as unknown as any[]) || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    ((warrantyData as unknown as any[]) || []).map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50">
                        <td className="px-4 py-3 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          {row.serial}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 dark:text-white block">
                            {row.productName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {row.brand} / {row.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {row.partyName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {new Date(row.endDate).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          <span
                            className={
                              row.daysLeft < 0
                                ? 'text-rose-600'
                                : row.daysLeft <= 30
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }
                          >
                            {row.daysLeft < 0 ? `${Math.abs(row.daysLeft)} gün geçti` : `${row.daysLeft} gün`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-semibold',
                              row.statusText === 'Aktif' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60',
                              row.statusText === 'Yaklaşıyor' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/60',
                              row.statusText === 'Sona Erdi' && 'bg-rose-50 text-rose-700 dark:bg-rose-950/60'
                            )}
                          >
                            {row.statusText}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEKME 5: STOK HAREKET DEFTERİ ================= */}
      {activeTab === 'MOVEMENTS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">Tüm Hareket Tipleri</option>
                <option value="ENTRY">Giriş (Mal Kabul)</option>
                <option value="EXIT">Çıkış (Sevkiyat)</option>
                <option value="TRANSFER">Depo Transferi</option>
                <option value="CANCEL_REVERSAL">İptal İadesi</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleExportExcel('movements', { type: movementType || undefined })}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-600" />
              Hareket Defterini İndir (Excel)
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3">Tip</th>
                    <th className="px-4 py-3">Ürün</th>
                    <th className="px-4 py-3">Depo</th>
                    <th className="px-4 py-3 text-right">Miktar</th>
                    <th className="px-4 py-3">İşlem Yapan</th>
                    <th className="px-4 py-3">Açıklama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isMovementsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Yükleniyor...
                      </td>
                    </tr>
                  ) : ((movementsData as unknown as any[]) || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Hareket kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    ((movementsData as unknown as any[]) || []).map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(m.date).toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-semibold',
                              m.type === 'ENTRY' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
                              m.type === 'EXIT' && 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
                              m.type === 'CANCEL_REVERSAL' && 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            )}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900 dark:text-white block">
                            {m.productName}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{m.productCode}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {m.warehouseName}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          {m.quantity}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {m.userName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                          {m.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEKME 6: TEDARİKÇİ & MÜŞTERİ İCMALİ ================= */}
      {activeTab === 'PARTNERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tedarikçi İcmali */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Tedarikçi Mal Kabul İcmali
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Tedarikçi</th>
                    <th className="px-3 py-2.5 text-right">Fiş Adedi</th>
                    <th className="px-3 py-2.5 text-right">Giriş Adedi</th>
                    <th className="px-3 py-2.5 text-right">Son Giriş</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isSuppliersLoading ? (
                    <tr><td colSpan={4} className="py-4 text-center">Yükleniyor...</td></tr>
                  ) : ((supplierEntriesData as unknown as any[]) || []).map((s: any) => (
                    <tr key={s.supplierId}>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                        {s.supplierName} ({s.supplierCode})
                      </td>
                      <td className="px-3 py-2.5 text-right">{s.entryCount}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                        {s.totalItemsReceived}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400">
                        {s.lastEntryDate ? new Date(s.lastEntryDate).toLocaleDateString('tr-TR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Müşteri Sevkiyat İcmali */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Müşteri Sevkiyat İcmali
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Müşteri</th>
                    <th className="px-3 py-2.5 text-right">Sevkiyat Adedi</th>
                    <th className="px-3 py-2.5 text-right">Toplam Ürün</th>
                    <th className="px-3 py-2.5 text-right">Son Sevkiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isCustomersLoading ? (
                    <tr><td colSpan={4} className="py-4 text-center">Yükleniyor...</td></tr>
                  ) : ((customerExitsData as unknown as any[]) || []).map((c: any) => (
                    <tr key={c.customerId}>
                      <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                        {c.customerName}
                      </td>
                      <td className="px-3 py-2.5 text-right">{c.shipmentCount}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-blue-600">
                        {c.totalItemsShipped}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-400">
                        {c.lastShipmentDate ? new Date(c.lastShipmentDate).toLocaleDateString('tr-TR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= SEKME 7: ARIZA & SERVİS İSTATİSTİKLERİ ================= */}
      {activeTab === 'FAULT_STATS' && (
        <div className="space-y-6">
          {isFaultStatsLoading ? (
            <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Toplam Arıza Kaydı</span>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {(faultStatsData as any)?.totalFaults || 0}
                </p>
              </div>

              <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Çözülen / Tamamlanan</span>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {(faultStatsData as any)?.resolvedCount || 0}
                </p>
              </div>

              <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
                <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Garantili Cihaz Oranı</span>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {(faultStatsData as any)?.underCustomerWarrantyCount || 0}
                </p>
              </div>

              <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
                <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Hurda / Değişim</span>
                <p className="text-3xl font-bold text-rose-600 mt-1">
                  {((faultStatsData as any)?.replacedCount || 0) + ((faultStatsData as any)?.scrappedCount || 0)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
