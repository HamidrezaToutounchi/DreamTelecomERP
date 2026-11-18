import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  FileCheck2,
  FileClock,
  ClockAlert,
  ArrowUpRight,
  ShieldCheck,
  Target,
  FileText,
  Users,
  CheckCircle2,
  ShoppingBag,
  DollarSign,
  Coins,
  Award,
  Building2,
  Boxes,
  PackageMinus,
  PackagePlus,
  Warehouse,
  Truck,
  AlertTriangle,
  AlertCircle,
  Check,
  X,
  XCircle,
  Eye,
  Layers,
  ArrowRight,
  CheckCheck,
  Calendar,
  BadgeDollarSign,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  useAnalyticsControllerGetDashboardSummary,
  useCompaniesControllerFindAll,
  useLeadsControllerFindAll,
  useQuotesControllerFindAll,
  useSalesControllerFindAll,
  useStockControllerFindAllExits,
  useStockControllerFindAllEntries,
  useStockControllerGetCriticalStockReport,
  useStockControllerGetWarehouseStockReport,
  useStockControllerApproveExit,
  useStockControllerRejectExit,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatters';
import { Link } from '@tanstack/react-router';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const BRAND_PALETTE = ['#004A93', '#006F8D', '#78C042', '#F59E0B', '#67737B', '#8B5CF6', '#EC4899'];

export const DashboardPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();
  const [displayCurrency, setDisplayCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SALES_FINANCE' | 'WAREHOUSE_OPERATIONS'>('SALES_FINANCE');

  // Quick Approval & Rejection Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedExitForApproval, setSelectedExitForApproval] = useState<any | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);

  const { data: companiesData } = useCompaniesControllerFindAll();
  const companies = (companiesData as any) || [];

  // If Manager, fetch full analytics filtered by company
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsControllerGetDashboardSummary(
    { companyId: selectedCompanyId || undefined },
    {
      query: {
        enabled: isManager,
      },
    },
  );

  // Queries for Recent Activity (Used by both Manager and Rep)
  const { data: recentLeads } = useLeadsControllerFindAll(
    { pageSize: 5 },
    { query: { enabled: true } },
  );

  const { data: recentQuotes } = useQuotesControllerFindAll(
    { pageSize: 5, companyId: selectedCompanyId || undefined },
    { query: { enabled: true } },
  );

  const { data: recentSales } = useSalesControllerFindAll(
    { pageSize: 5, companyId: selectedCompanyId || undefined },
    { query: { enabled: true } },
  );

  // ================= STOK & DEPO OPERASYON VERİLERİ =================
  // 1. Onay Bekleyen Çıkışlar (Sıralı Onay Masası)
  const {
    data: pendingExitsResponse,
    isLoading: isPendingExitsLoading,
    refetch: refetchPendingExits,
  } = useStockControllerFindAllExits(
    { status: 'PENDING_APPROVAL' as any, pageSize: 15 },
    { query: { refetchInterval: 15000 } },
  );

  // 2. Sevk Edilmeyi Bekleyen Onaylanmış Çıkışlar (APPROVED)
  const { data: approvedExitsResponse, isLoading: isApprovedExitsLoading } = useStockControllerFindAllExits(
    { status: 'APPROVED' as any, pageSize: 5 },
    { query: { enabled: activeTab === 'WAREHOUSE_OPERATIONS' || isManager } },
  );

  // 3. Kritik Stok Raporu
  const { data: criticalStockData, isLoading: isCriticalStockLoading } = useStockControllerGetCriticalStockReport(
    { query: { enabled: activeTab === 'WAREHOUSE_OPERATIONS' || isManager } },
  );

  // 4. Depo Stok Dağılım Raporu
  const { data: warehouseStockData, isLoading: isWarehouseStockLoading } = useStockControllerGetWarehouseStockReport(
    undefined,
    { query: { enabled: activeTab === 'WAREHOUSE_OPERATIONS' || isManager } },
  );

  // 5. Son Tamamlanan Mal Kabul Girişleri
  const { data: recentEntriesResponse, isLoading: isRecentEntriesLoading } = useStockControllerFindAllEntries(
    { pageSize: 5 },
    { query: { enabled: activeTab === 'WAREHOUSE_OPERATIONS' || isManager } },
  );

  // Mutations
  const approveMutation = useStockControllerApproveExit();
  const rejectMutation = useStockControllerRejectExit();

  const usdRate = Number(analytics?.kpis?.usdRate || 50.18);

  // Stok & Sevkiyat Hesaplamaları
  const pendingExits = ((pendingExitsResponse as any)?.data as any[]) || [];
  const pendingExitsCount = (pendingExitsResponse as any)?.meta?.totalRowCount ?? pendingExits.length ?? 0;

  const approvedExits = ((approvedExitsResponse as any)?.data as any[]) || [];
  const approvedExitsCount = (approvedExitsResponse as any)?.meta?.totalRowCount ?? approvedExits.length ?? 0;

  const criticalStockList = (criticalStockData as any[]) || [];
  const criticalCount = criticalStockList.length;

  const recentEntries = ((recentEntriesResponse as any)?.data as any[]) || [];

  const rawWarehouseStocks = (warehouseStockData as any[]) || [];
  const totalStockQuantity = rawWarehouseStocks.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const totalStockValueTry = rawWarehouseStocks.reduce((acc, it) => {
    const val = Number(it.totalValue ?? (Number(it.quantity || 0) * Number(it.unitPrice || 0)));
    return acc + (it.currency === 'USD' ? val * usdRate : val);
  }, 0);
  const totalStockValueUsd = totalStockValueTry / (usdRate || 50.18);

  // Depo bazlı özet gruplama
  const warehouseBreakdownMap = new Map<string, {
    warehouseId: string;
    warehouseName: string;
    productCount: number;
    totalQuantity: number;
    totalValueTry: number;
  }>();

  for (const it of rawWarehouseStocks) {
    const wId = it.warehouseId || it.warehouseName || 'default';
    const existing = warehouseBreakdownMap.get(wId) || {
      warehouseId: wId,
      warehouseName: it.warehouseName || 'Depo',
      productCount: 0,
      totalQuantity: 0,
      totalValueTry: 0,
    };
    existing.productCount += 1;
    existing.totalQuantity += Number(it.quantity || 0);
    const itemVal = Number(it.totalValue ?? (Number(it.quantity || 0) * Number(it.unitPrice || 0)));
    existing.totalValueTry += it.currency === 'USD' ? itemVal * usdRate : itemVal;
    warehouseBreakdownMap.set(wId, existing);
  }

  const warehouseSummaries = Array.from(warehouseBreakdownMap.values());

  // Bu onay adımının HEDEF ONAYCISI bu kullanıcı mı?
  // Kullanıcının talebi: "ikinci fotograf hedef kisinin ekraninda sadece gozuksun knk baskalarinin ekraninda gozukmesine gerek yok"
  const isUserTargetApprover = (exit: any): boolean => {
    if (!exit || exit.status !== 'PENDING_APPROVAL' || !user?.id) return false;
    const approvals: any[] = exit?.approvals || [];
    if (approvals.length === 0) {
      return Boolean(user.isSuperAdmin || isManager);
    }
    const pendingStep = approvals.find((a: any) => a.status === 'PENDING');
    if (!pendingStep) return false;

    // 1. Bu adıma doğrudan belirli bir kullanıcı atanmışsa (örn: Dilan veya Ersin):
    // SADECE O KULLANICI GÖRÜR!
    if (pendingStep.approverId) {
      return pendingStep.approverId === user.id;
    }

    // 2. Bu adıma belirli bir rol atanmışsa:
    // SADECE O ROLE SAHİP KULLANICI GÖRÜR!
    if (pendingStep.roleId) {
      return user.appRoleId === pendingStep.roleId;
    }

    // 3. Herhangi bir kısıtlama yoksa ("ANY"):
    // Yönetici veya Süper Admin görür
    return Boolean(user.isSuperAdmin || isManager);
  };

  // Yalnızca giriş yapan kullanıcının onaylaması gereken fişler (hedef kişinin ekranı)
  const myPendingApprovalExits = pendingExits.filter(isUserTargetApprover);

  // Yetki Kontrolü: Bu onay adımını kullanıcı onaylayabilir mi?
  const canUserApproveExit = (exit: any): boolean => {
    return isUserTargetApprover(exit);
  };

  // Mevcut onay adımı bilgisi
  const getApprovalStepInfo = (exit: any) => {
    const approvals: any[] = exit?.approvals || [];
    if (approvals.length === 0) {
      return { stepNum: 1, totalSteps: 1, name: 'Genel Yönetici Onayı', approverTitle: 'Tüm Yöneticiler' };
    }
    const pending = approvals.find((a: any) => a.status === 'PENDING');
    if (!pending) {
      return { stepNum: approvals.length, totalSteps: approvals.length, name: 'Onaylandı', approverTitle: 'Tamamlandı' };
    }

    const assignedUserName = pending.approver?.fullName;
    const assignedRoleName = (pending as any).role?.name || (pending as any).roleName;
    const approverTitle = assignedUserName || assignedRoleName || 'Yönetici Onayı';
    const stepName = (pending as any).name || (pending as any).stepName || (assignedUserName ? `${assignedUserName} Onayı` : `Adım ${pending.step}`);

    return {
      stepNum: pending.step,
      totalSteps: approvals.length,
      name: stepName,
      approverTitle,
    };
  };

  // Hızlı Onay İşlemi
  const handleApprove = async () => {
    if (!selectedExitForApproval) return;
    setIsActionPending(true);
    try {
      await approveMutation.mutateAsync({
        id: selectedExitForApproval.id,
        data: { note: approveNote.trim() || undefined },
      });
      toast.success(`Çıkış fişi (${selectedExitForApproval.exitNumber}) başarıyla onaylandı.`);
      setApproveModalOpen(false);
      setApproveNote('');
      setSelectedExitForApproval(null);
      refetchPendingExits();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Onay işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  // Hızlı Ret İşlemi
  const handleReject = async () => {
    if (!selectedExitForApproval) return;
    if (!rejectNote.trim()) {
      toast.error('Lütfen bir ret gerekçesi giriniz.');
      return;
    }
    setIsActionPending(true);
    try {
      await rejectMutation.mutateAsync({
        id: selectedExitForApproval.id,
        data: { note: rejectNote.trim() },
      });
      toast.success(`Çıkış fişi (${selectedExitForApproval.exitNumber}) reddedildi, seriler depoya serbest bırakıldı.`);
      setRejectModalOpen(false);
      setRejectNote('');
      setSelectedExitForApproval(null);
      refetchPendingExits();
      queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/exits'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Red işlemi başarısız oldu.');
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= 1. KARŞILAMA VE GÖRÜNÜM SEÇİCİ HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Hoş Geldiniz, {user?.fullName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isManager
              ? 'Kurumsal satış ciroları, teklif operasyonları, depo sevkiyatları ve onay akışları.'
              : 'Size atanan potansiyel müşteriler, açık teklifleriniz ve depo operasyonları.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Para Birimi Değiştirici (TRY / USD) */}
          {isManager && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDisplayCurrency('TRY')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayCurrency === 'TRY'
                    ? 'bg-white dark:bg-slate-700 text-navy-800 dark:text-navy-200 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>₺ TRY</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayCurrency('USD')}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  displayCurrency === 'USD'
                    ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>$ USD</span>
              </button>
            </div>
          )}

          {isManager && (
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
            >
              Detaylı Raporlar
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ================= 2. DASHBOARD MOD VE GÖRÜNÜM SEÇİCİ SEKMELER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Mod Değiştirici Butonlar: Satış & Finans VS Depo Operasyon */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('SALES_FINANCE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'SALES_FINANCE'
                ? 'bg-white dark:bg-slate-800 text-navy-800 dark:text-navy-200 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BadgeDollarSign className="w-4 h-4 text-navy-700 dark:text-navy-400" />
            <span>Satış & Kurumsal Finans Paneli</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WAREHOUSE_OPERATIONS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 relative ${
              activeTab === 'WAREHOUSE_OPERATIONS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Depo Operasyon Paneli</span>
            {pendingExitsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded-full animate-pulse shadow-xs">
                {pendingExitsCount} Onay Bekliyor
              </span>
            )}
          </button>
        </div>

        {/* Şirket Görünümü & Rapor Filtresi (Yalnızca Yönetici Görür) */}
        {isManager && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedCompanyId('')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                !selectedCompanyId
                  ? 'bg-white dark:bg-slate-800 text-navy-800 dark:text-navy-200 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tümü (Konsolide)</span>
            </button>

            {companies.map((comp: any) => {
              const isSelected = selectedCompanyId === comp.id;
              const isTescom = comp.code === 'TESCOM';
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(comp.id)}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? isTescom
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-navy-700 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTescom ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  />
                  <span>{comp.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 3. HER İKİ MODDA DA GÖRÜNEN CANLI ONAY BİLDİRİMİ ================= */}
      {pendingExitsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ClockAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Onay Bekleyen {pendingExitsCount} Adet Stok Çıkış Talebi Bulunuyor!
                </span>
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  Sıralı Onay Sırasında
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Sevkiyatın depodan çıkabilmesi için sıralı onay adımlarındaki yetkililerin onayı bekleniyor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab !== 'WAREHOUSE_OPERATIONS' && (
              <button
                type="button"
                onClick={() => setActiveTab('WAREHOUSE_OPERATIONS')}
                className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Depo Paneline Geç
              </button>
            )}
            <Link
              to="/stock/exits"
              className="px-3.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors shadow-xs inline-flex items-center gap-1"
            >
              <span>Tüm Çıkışları Gör</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= 4. DEPO OPERASYON PANELİ (YENİ ÖZEL GÖRÜNÜM) ============ */}
      {/* ========================================================================= */}
      {activeTab === 'WAREHOUSE_OPERATIONS' && (
        <div className="space-y-6">
          {/* Depo Operasyon 5 Ana KPI Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* KPI 1: Toplam Envanter Değeri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Toplam Envanter Değeri</span>
                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {displayCurrency === 'TRY'
                  ? formatMoney(totalStockValueTry, 'TRY')
                  : `$${totalStockValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Fiziksel Kalem:</span>
                <span className="font-bold text-foreground">
                  {rawWarehouseStocks.length} Ürün &bull; {totalStockQuantity.toLocaleString('tr-TR')} Adet
                </span>
              </div>
            </div>

            {/* KPI 2: Onay Bekleyen Çıkışlar */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Onay Bekleyen Çıkışlar</span>
                <ClockAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono flex items-center gap-2">
                <span>{pendingExitsCount}</span>
                {pendingExitsCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Sıralı Onayda
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Onay Bekleme Durumu:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {pendingExitsCount > 0 ? 'Müdahale Gerekiyor' : 'Tümü Onaylandı'}
                </span>
              </div>
            </div>

            {/* KPI 3: Sevk Edilmeyi Bekleyenler (APPROVED) */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Sevk Edilmeyi Bekleyenler</span>
                <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                {approvedExitsCount}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">İrsaliye & Kargo:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  Paketleme & Sevk Hazır
                </span>
              </div>
            </div>

            {/* KPI 4: Kritik Stok Uyarısı */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Kritik Stok Uyarısı</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-2">
                <span>{criticalCount}</span>
                {criticalCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                    Min Limit Altı
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Tedarik Durumu:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {criticalCount > 0 ? 'Sipariş Verilmeli' : 'Stoklar Yeterli'}
                </span>
              </div>
            </div>

            {/* KPI 5: Son Mal Kabul / Stok Girişleri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Mal Kabul Girişleri</span>
                <PackagePlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                {recentEntries.length}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Son Hareketler:</span>
                <Link to="/stock/entries" className="font-bold text-teal-700 dark:text-teal-300 hover:underline">
                  Girişleri Gör &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* ================= CANLI ONAY MASASI: ONAY BEKLEYEN STOK ÇIKIŞLARI TABLOSU ================= */}
          <div className="bg-card p-5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <ClockAlert className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Onay Bekleyen Stok Çıkışları (Sıralı Onay Masası)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      {pendingExitsCount} Bekliyor
                    </span>
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Sistemde tanımlı sıralı onay adımlarındaki yetkililerin kararı bekleyen sevkiyat talepleri.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/stock/approval-settings"
                  className="text-xs text-navy-600 dark:text-navy-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Onay Akışı Ayarları</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  to="/stock/exits"
                  className="px-3 py-1.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1"
                >
                  <span>Tüm Çıkışlar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Çıkış Listesi Tablosu */}
            {pendingExits.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Harika! Şu anda onay bekleyen herhangi bir çıkış fişi bulunmuyor.</p>
                <p className="text-[11px]">Tüm stok çıkış talepleri onaylandı veya sevk edildi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Fiş No</th>
                      <th className="py-2.5 px-3 font-semibold">Tarih</th>
                      <th className="py-2.5 px-3 font-semibold">Çıkış Türü</th>
                      <th className="py-2.5 px-3 font-semibold">Müşteri / Hedef</th>
                      <th className="py-2.5 px-3 font-semibold">Çıkış Deposu</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Kalem / Miktar</th>
                      <th className="py-2.5 px-3 font-semibold">Sıradaki Onay Adımı</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Hızlı İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingExits.map((exit: any) => {
                      const stepInfo = getApprovalStepInfo(exit);
                      const isAuthorized = canUserApproveExit(exit);
                      const totalQty = (exit.items || []).reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

                      return (
                        <tr key={exit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-3">
                            <Link
                              to="/stock/exits"
                              className="font-mono font-bold text-navy-700 dark:text-navy-300 hover:underline block"
                            >
                              {exit.exitNumber}
                            </Link>
                            {exit.waybillNumber && (
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                İrs: {exit.waybillNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                            {new Date(exit.exitDate).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {exit.type === 'SALE_SHIPMENT'
                                ? 'Satış Sevkiyatı'
                                : exit.type === 'FAULT_RETURN'
                                ? 'Arıza İadesi'
                                : exit.type === 'INTERNAL_USE'
                                ? 'Dahili Kullanım'
                                : exit.type === 'SCRAP'
                                ? 'Hurda / Fire'
                                : exit.type}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-foreground block">
                              {exit.customer?.name || exit.customer?.companyName || exit.recipientPerson || '-'}
                            </span>
                            {exit.recipientPhone && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {exit.recipientPhone}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                              <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                              {exit.warehouse?.name || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-bold text-foreground">
                              {exit.items?.length || 0} Kalem
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              ({totalQty} Adet)
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Adım {stepInfo.stepNum} / {stepInfo.totalSteps}
                                </span>
                                <span className="font-semibold text-[11px] text-foreground">
                                  {stepInfo.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground block">
                                Bekleyen: <strong className="text-slate-700 dark:text-slate-300">{stepInfo.approverTitle}</strong>
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAuthorized ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedExitForApproval(exit);
                                      setApproveModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                                    title="Onayla"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Onayla</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedExitForApproval(exit);
                                      setRejectModalOpen(true);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 cursor-pointer inline-flex items-center gap-1"
                                    title="Reddet"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Reddet</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Yetki Bekleniyor
                                </span>
                              )}
                              <Link
                                to="/stock/exits"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Çıkış Sayfasında İncele"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ================= 2 KOLON: DEPO BAZLI DAĞILIM VE KRİTİK STOK UYARILARI ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Kolon: Depo Bazlı Stok Dağılımı */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                  <h3 className="text-sm font-bold text-foreground">Depo Bazlı Stok & Değer Dağılımı</h3>
                </div>
                <Link to="/warehouses" className="text-xs text-navy-600 dark:text-navy-400 font-bold hover:underline">
                  Depoları Yönet &rarr;
                </Link>
              </div>

              {warehouseSummaries.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Tanımlı aktif depo veya stok verisi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-3">
                  {warehouseSummaries.map((w, idx) => {
                    const pct = totalStockValueTry > 0 ? (w.totalValueTry / totalStockValueTry) * 100 : 0;
                    return (
                      <div
                        key={w.warehouseId}
                        className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND_PALETTE[idx % BRAND_PALETTE.length] }} />
                            {w.warehouseName}
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {formatMoney(w.totalValueTry, 'TRY')}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: BRAND_PALETTE[idx % BRAND_PALETTE.length],
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{w.productCount} Farklı Ürün Kalemi</span>
                          <span>{w.totalQuantity.toLocaleString('tr-TR')} Adet Fiziksel Stok ({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sağ Kolon: Kritik Stok Uyarı Listesi */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-foreground">Kritik Stok Uyarısı (Minimum Limit Altı)</h3>
                </div>
                <Link to="/stock/reports" className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline">
                  Raporu İncele &rarr;
                </Link>
              </div>

              {criticalStockList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Tüm ürünler güvenli stok seviyesinde.</p>
                  <p className="text-[11px]">Minimum stok limitinin altına düşen ürün bulunmuyor.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto pr-1">
                  {criticalStockList.slice(0, 5).map((it: any) => (
                    <div key={it.productId || it.productName} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground block">
                          {it.productName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Depo: {it.warehouseName || '-'} &bull; Min Limit: <strong className="text-slate-800 dark:text-slate-200">{it.minStockLevel || 0}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-600 dark:text-rose-400 block font-mono">
                          Mevcut: {it.currentStock || 0} Adet
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          {Math.max(0, (it.minStockLevel || 0) - (it.currentStock || 0))} Eksik
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ================= 2 KOLON: SEVK EDİLMEYİ BEKLEYENLER VE SON MAL KABUL GİRİŞLERİ ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Sevk Edilmeyi Bekleyen Onaylı Çıkışlar */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-foreground">Sevk Edilmeyi Bekleyenler (Onaylandı)</h3>
                </div>
                <Link to="/stock/exits" className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">
                  Tümü &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {approvedExits.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Sevk edilmeyi bekleyen onaylı çıkış fişi bulunmuyor.
                  </div>
                ) : (
                  approvedExits.slice(0, 5).map((exit: any) => (
                    <div key={exit.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link to="/stock/exits" className="font-mono font-bold text-navy-700 dark:text-navy-300 hover:underline">
                            {exit.exitNumber}
                          </Link>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            Onaylandı
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          {exit.customer?.name || exit.recipientPerson || '-'} &bull; Depo: {exit.warehouse?.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          {(exit.items || []).length} Kalem
                        </span>
                        <Link
                          to="/stock/exits"
                          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Sevk Et &rarr;
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sağ: Son Tamamlanan Mal Kabul Girişleri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-foreground">Son Mal Kabul Girişleri (Depoya Girenler)</h3>
                </div>
                <Link to="/stock/entries" className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline">
                  Tüm Girişler &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentEntries.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Henüz tamamlanan mal kabul girişi bulunmuyor.
                  </div>
                ) : (
                  recentEntries.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Link to="/stock/entries" className="font-mono font-bold text-teal-700 dark:text-teal-300 hover:underline">
                            {entry.entryNumber}
                          </Link>
                          {entry.invoiceNumber && (
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono text-muted-foreground">
                              Fat: {entry.invoiceNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          Tedarikçi: {entry.supplier?.name || '-'} &bull; {entry.warehouse?.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block">
                          {(entry.items || []).length} Kalem
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(entry.entryDate).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= 5. SATIŞ & KURUMSAL FİNANS PANELİ ====================== */}
      {/* ========================================================================= */}
      {activeTab === 'SALES_FINANCE' && isManager && (
        <>
          {/* Üst Yönetici 5 Ana KPI Kartı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* KPI 1: Toplam & Bu Ayki Ciro (TRY ve USD Dinamik) */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Net Satış Cirosu</span>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>

              {displayCurrency === 'TRY' ? (
                <>
                  <div className="text-2xl font-extrabold text-navy-700 dark:text-navy-300">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.totalRevenue, 'TRY')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      ${Number(analytics?.kpis?.totalRevenueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      TCMB: {usdRate.toFixed(2)} ₺
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-green-700 dark:text-green-400">
                    ${analyticsLoading ? '...' : Number(analytics?.kpis?.totalRevenueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.totalRevenue, 'TRY')}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Bu Ayki Satış:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {displayCurrency === 'TRY'
                    ? formatMoney(analytics?.kpis.thisMonthSalesAmount, 'TRY')
                    : `$${Number(analytics?.kpis?.thisMonthSalesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  {' '}({analytics?.kpis.thisMonthSalesCount ?? 0} adet)
                </span>
              </div>
            </div>

            {/* KPI 2: Açık Teklif Portföyü */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Açık Teklif Portföyü</span>
                <FileClock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>

              {displayCurrency === 'TRY' ? (
                <>
                  <div className="text-2xl font-extrabold text-navy-700 dark:text-navy-300">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.openQuotesAmount, 'TRY')}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    ${Number(analytics?.kpis?.openQuotesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-400">
                    ${analyticsLoading ? '...' : Number(analytics?.kpis?.openQuotesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.openQuotesAmount, 'TRY')}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Karar Aşaması:</span>
                <span className="font-bold text-teal-700 dark:text-teal-300">
                  Müşteri onayı bekleyen aktif hacim
                </span>
              </div>
            </div>

            {/* KPI 3: Faturalanacak Satışlar */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Faturası Bekleyen</span>
                <ClockAlert className="w-4 h-4 text-amber-500" />
              </div>

              {displayCurrency === 'TRY' ? (
                <>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.pendingInvoiceSalesAmount, 'TRY')}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    ${Number(analytics?.kpis?.pendingInvoiceSalesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    ${analyticsLoading ? '...' : Number(analytics?.kpis?.pendingInvoiceSalesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.pendingInvoiceSalesAmount, 'TRY')}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Operasyon Durumu:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {analytics?.kpis.pendingInvoiceSalesCount ?? 0} satış faturalanacak
                </span>
              </div>
            </div>

            {/* KPI 4: Teklif Onay Oranı */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-navy-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Teklif Onay Oranı</span>
                <Target className="w-4 h-4 text-navy-600 dark:text-navy-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {analyticsLoading ? '...' : analytics?.kpis.quoteApprovalRate}
              </div>
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Lead Dönüşüm Başarısı:</span>
                <span className="font-bold text-navy-700 dark:text-navy-300">
                  {analyticsLoading ? '...' : analytics?.kpis.leadConversionRate}
                </span>
              </div>
            </div>

            {/* KPI 5: Depo Stok Değeri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Depo Stok Değeri</span>
                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {displayCurrency === 'TRY'
                  ? formatMoney(totalStockValueTry, 'TRY')
                  : `$${totalStockValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('WAREHOUSE_OPERATIONS')}
                  className="text-muted-foreground hover:text-emerald-600 transition-colors font-medium hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>{rawWarehouseStocks.length} Kalem Fiziksel</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">&bull; Depo Paneli &rarr;</span>
                </button>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {pendingExitsCount > 0 ? `${pendingExitsCount} Çıkış Bekliyor` : 'Stok Tam'}
                </span>
              </div>
            </div>
          </div>

          {/* ================= ON-DEMAND ONAY MASASI: YALNIZCA HEDEF ONAYCIYA GÖRÜNÜR ================= */}
          {myPendingApprovalExits.length > 0 && (
            <div className="bg-card p-5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ClockAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-foreground">
                    Onayınızı Bekleyen Stok Çıkışları ({myPendingApprovalExits.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('WAREHOUSE_OPERATIONS')}
                  className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Depo Operasyon Masasında Yönet &rarr;</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {myPendingApprovalExits.slice(0, 4).map((exit: any) => {
                  const stepInfo = getApprovalStepInfo(exit);
                  const isAuthorized = canUserApproveExit(exit);

                  return (
                    <div key={exit.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link to="/stock/exits" className="font-mono font-bold text-navy-700 dark:text-navy-300 hover:underline">
                            {exit.exitNumber}
                          </Link>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            Adım {stepInfo.stepNum}/{stepInfo.totalSteps}: {stepInfo.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-900/60">
                            <span>Sıradaki Onaycı:</span>
                            <span className="font-bold">{stepInfo.approverTitle}</span>
                          </span>
                          <span>&bull;</span>
                          <span>
                            <strong className="text-foreground">Alıcı Müşteri:</strong> {exit.customer?.companyName || exit.customer?.name || exit.recipientPerson || '-'}
                          </span>
                          <span>&bull;</span>
                          <span>
                            <strong className="text-foreground">Çıkış Deposu:</strong> {exit.warehouse?.name}
                          </span>
                          <span>&bull;</span>
                          <span>{(exit.items || []).length} Kalem</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAuthorized && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedExitForApproval(exit);
                              setApproveModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Onayla</span>
                          </button>
                        )}
                        <Link
                          to="/stock/exits"
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-200 transition-colors"
                        >
                          İncele
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= GRAFİK MATRİSİ: CİRO VE TEMSİLCİ PERFORMANSI ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ciro Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-bold text-foreground">
                  Ciro Üretim Dağılımı ({displayCurrency})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Yönetici ve temsilcilerin ürettiği toplam net satış cirolarının oransal pasta grafiği.
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(analytics?.salesByRep || []).map((item) => {
                        const amountTry = Number(item.totalSalesAmount) || 0;
                        const value = displayCurrency === 'USD' ? amountTry / usdRate : amountTry;
                        return {
                          name: item.repName,
                          value,
                          formatted:
                            displayCurrency === 'USD'
                              ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : formatMoney(item.totalSalesAmount, 'TRY'),
                          salesCount: item.salesCount,
                        };
                      })}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(analytics?.salesByRep || []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={BRAND_PALETTE[index % BRAND_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${item.payload.formatted} (${item.payload.salesCount} adet)`,
                        name,
                      ]}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Temsilci Teklif & Onay Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    <span>Temsilci Teklif & Onay Dağılımı</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tüm temsilcilerin hazırladığı toplam teklifler, onay, açık ve ret kırılımları.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Onaylandı
                  </span>
                  <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                    <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" /> Açık
                  </span>
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Revize
                  </span>
                  <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Ret
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(analytics?.quotesByRep || []).length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Sistemde henüz teklif kaydı bulunmamaktadır.
                  </div>
                ) : (
                  (analytics?.quotesByRep || []).map((q) => {
                    const total = q.totalQuotesCount || 0;
                    const approved = q.approvedCount || 0;
                    const sent = q.draftOrSentCount || 0;
                    const revised = q.revisedCount || 0;
                    const rejected = q.rejectedCount || 0;
                    const winRate = total > 0 ? ((approved / total) * 100).toFixed(0) : '0';

                    return (
                      <div
                        key={q.repId}
                        className="p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{q.repName}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Başarı: <strong className="text-green-600 dark:text-green-400">{winRate}%</strong> ({approved}/{total})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                          {total > 0 && (
                            <>
                              <div style={{ width: `${(approved / total) * 100}%` }} className="bg-green-500 h-full" />
                              <div style={{ width: `${(sent / total) * 100}%` }} className="bg-teal-600 h-full" />
                              <div style={{ width: `${(revised / total) * 100}%` }} className="bg-amber-500 h-full" />
                              <div style={{ width: `${(rejected / total) * 100}%` }} className="bg-red-500 h-full" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ================= CANLI AKIŞ: SON SATIŞLAR VE AÇIK TEKLİFLER ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Son Gerçekleşen Satışlar */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-green-600" />
                  <h3 className="text-sm font-bold text-foreground">Son Gerçekleşen Satışlar</h3>
                </div>
                <Link
                  to="/sales"
                  className="text-xs text-navy-600 dark:text-navy-400 font-bold hover:underline flex items-center gap-1"
                >
                  Tüm Satışlar &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {((recentSales?.data || []) as any[]).length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Henüz gerçekleşen satış kaydı yok.
                  </div>
                ) : (
                  ((recentSales?.data || []) as any[]).slice(0, 5).map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground block">
                            {s.customer?.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Temsilci: {s.rep?.fullName || '-'} &bull;{' '}
                          {new Date(s.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-green-700 dark:text-green-400 block">
                          {formatMoney(s.totalAmount, s.currency)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            s.isInvoiced
                              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {s.isInvoiced ? 'Faturalandı' : 'Fatura Bekliyor'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bekleyen Açık Teklifler */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileClock className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-foreground">Karar Aşamasındaki Açık Teklifler</h3>
                </div>
                <Link
                  to="/quotes"
                  className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                >
                  Tüm Teklifler &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(() => {
                  const openList = ((recentQuotes?.data || []) as any[]).filter(
                    (q) => q.status === 'SENT' || q.status === 'DRAFT'
                  );
                  if (openList.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs text-muted-foreground">
                        Karar aşamasında bekleyen açık teklif bulunmamaktadır.
                      </div>
                    );
                  }
                  return openList.slice(0, 5).map((q) => (
                    <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-navy-700 dark:text-navy-300">
                            {q.quoteNumber}
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-semibold text-muted-foreground">
                            v{q.version}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          {q.customer?.name} &bull; Temsilci: {q.rep?.fullName || '-'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground block font-mono">
                          {formatMoney(q.grandTotal, q.currency)}
                        </span>
                        <QuoteStatusBadge status={q.status} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= 6. SATIŞ TEMSİLCİSİ GÖRÜNÜMÜ ================= */}
      {!isManager && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Bekleyen Leadleriniz</span>
              <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 mt-1">
                {recentLeads?.meta?.totalRowCount ?? 0}
              </div>
              <Link to="/leads" className="text-xs text-navy-600 dark:text-navy-400 font-semibold mt-2 inline-flex items-center gap-1">
                Leadleri İncele &rarr;
              </Link>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Aktif Teklifleriniz</span>
              <div className="text-2xl font-extrabold text-navy-700 dark:text-navy-300 mt-1">
                {recentQuotes?.meta?.totalRowCount ?? 0}
              </div>
              <Link to="/quotes" className="text-xs text-navy-600 dark:text-navy-400 font-semibold mt-2 inline-flex items-center gap-1">
                Teklifleri Yönet &rarr;
              </Link>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Tamamlanan Satışlarınız</span>
              <div className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-1">
                {recentSales?.meta?.totalRowCount ?? 0}
              </div>
              <Link to="/sales" className="text-xs text-navy-600 dark:text-navy-400 font-semibold mt-2 inline-flex items-center gap-1">
                Satış Geçmişi &rarr;
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Son Teklifleriniz</h3>
                <Link to="/quotes" className="text-xs text-navy-600 dark:text-navy-400 font-semibold">Tümü &rarr;</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {((recentQuotes?.data || []) as any[]).slice(0, 4).map((q) => (
                  <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-navy-700 dark:text-navy-300 block">{q.quoteNumber}</span>
                      <span className="text-muted-foreground">{q.customer?.name || '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground block">{formatMoney(q.grandTotal, q.currency)}</span>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Size Atanan Son Leadler</h3>
                <Link to="/leads" className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Tümü &rarr;</Link>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(recentLeads?.data || []).slice(0, 4).map((l) => (
                  <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground block">{l.companyName}</span>
                      <span className="text-muted-foreground">{l.contactName} &bull; {l.phone}</span>
                    </div>
                    <div>
                      <LeadStatusBadge status={l.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. HIZLI ONAY MODALI ================= */}
      {approveModalOpen && selectedExitForApproval && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Stok Çıkış Fişini Onayla</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Fiş: {selectedExitForApproval.exitNumber}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Müşteri / Hedef:</span>
                <strong className="text-foreground">{selectedExitForApproval.customer?.name || selectedExitForApproval.recipientPerson || '-'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Çıkış Deposu:</span>
                <strong className="text-foreground">{selectedExitForApproval.warehouse?.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mevcut Adım:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {getApprovalStepInfo(selectedExitForApproval).name} ({getApprovalStepInfo(selectedExitForApproval).stepNum}/{getApprovalStepInfo(selectedExitForApproval).totalSteps})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Onay Notu (İsteğe Bağlı)
              </label>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="Örn: Evraklar ve ödeme kontrol edildi, onaylandı."
                rows={3}
                className="w-full px-3 py-2 bg-background border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setApproveModalOpen(false);
                  setSelectedExitForApproval(null);
                  setApproveNote('');
                }}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending}
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isActionPending ? 'Onaylanıyor...' : 'Çıkışı Onayla'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 8. HIZLI RET MODALI ================= */}
      {rejectModalOpen && selectedExitForApproval && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Stok Çıkış Fişini Reddet</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Fiş: {selectedExitForApproval.exitNumber}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Bu çıkış talebini reddettiğinizde, ayrılmış tüm seri numaraları otomatik olarak depoda tekrar kullanılabilir (IN_STOCK) duruma dönecektir.
            </p>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Ret Gerekçesi *
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Örn: Cari bakiye aşımı / Hatalı ürün talebi."
                rows={3}
                required
                className="w-full px-3 py-2 bg-background border border-rose-300 dark:border-rose-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedExitForApproval(null);
                  setRejectNote('');
                }}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={isActionPending}
                onClick={handleReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isActionPending ? 'Reddediliyor...' : 'Talebi Reddet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
