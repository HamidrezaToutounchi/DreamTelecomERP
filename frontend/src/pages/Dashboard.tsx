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
} from 'lucide-react';
import {
  useAnalyticsControllerGetDashboardSummary,
  useCompaniesControllerFindAll,
  useLeadsControllerFindAll,
  useQuotesControllerFindAll,
  useSalesControllerFindAll,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatters';
import { Link } from '@tanstack/react-router';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';

const BRAND_PALETTE = ['#004A93', '#006F8D', '#78C042', '#F59E0B', '#67737B', '#8B5CF6', '#EC4899'];

export const DashboardPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

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

  const usdRate = Number(analytics?.kpis?.usdRate || 50.18);

  return (
    <div className="space-y-6">
      {/* Karşılama Başlığı ve Para Birimi Seçici */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Hoş Geldiniz, {user?.fullName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isManager
              ? 'Kurumsal satış ciroları, teklif operasyonları ve temsilci performans metrikleri.'
              : 'Size atanan potansiyel müşteriler, açık teklifleriniz ve satışlarınız.'}
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

      {/* Şirket Görünümü & Rapor Filtresi (Tümü / Dream Telecom / Tescom Telecom) */}
      {isManager && (
        <div className="bg-card p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-50 dark:bg-navy-950/60 border border-navy-100 dark:border-navy-900 flex items-center justify-center text-navy-700 dark:text-navy-300">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Şirket Görünümü & Rapor Filtresi
              </span>
              <span className="text-[11px] text-muted-foreground">
                {selectedCompanyId
                  ? `${companies.find((c: any) => c.id === selectedCompanyId)?.name || 'Seçili Şirket'} verileri gösteriliyor.`
                  : 'Tüm şirketlerin (Dream Telecom & Tescom Telecom) konsolide genel tablosu.'}
              </span>
            </div>
          </div>

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
              <span>🏢 Tümü (Konsolide)</span>
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
                  {comp.logoUrl ? (
                    <img
                      src={comp.logoUrl}
                      alt={comp.name}
                      className="h-4 w-auto max-w-[22px] object-contain rounded-xs bg-white/95 p-0.5"
                    />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isTescom ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                  )}
                  <span>{comp.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Konsolide Modda Şirket Teklif Dağılım Kartı */}
      {isManager && !selectedCompanyId && analytics?.quotesByCompany && analytics.quotesByCompany.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-emerald-50/60 dark:from-navy-950/40 dark:via-slate-900/40 dark:to-emerald-950/40 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Şirket Dağılımı:
            </span>
            <span className="text-muted-foreground text-[11px]">
              Şirket kartına tıklayarak paneli o şirkete özel görüntüleyebilirsiniz.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {analytics.quotesByCompany.map((qc) => {
              const isTescom = qc.companyCode === 'TESCOM';
              return (
                <button
                  key={qc.companyId}
                  type="button"
                  onClick={() => setSelectedCompanyId(qc.companyId)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-slate-400 shadow-xs cursor-pointer text-xs transition-all hover:scale-105"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isTescom ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                  />
                  <span className="font-semibold text-foreground">{qc.companyName}:</span>
                  <span className="font-extrabold text-navy-700 dark:text-navy-300">
                    {qc.totalQuotesCount} Teklif
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== 1. SATIŞ MÜDÜRÜ GÖRÜNÜMÜ ===================== */}
      {isManager && (
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
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {analyticsLoading ? '...' : formatMoney(analytics?.kpis.totalRevenue, 'TRY')}
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                      TCMB: {usdRate.toFixed(2)} ₺
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Bu Ayki Satış:</span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {analyticsLoading
                    ? '...'
                    : displayCurrency === 'TRY'
                    ? formatMoney((analytics?.kpis as any)?.thisMonthSalesAmount || '0.00', 'TRY')
                    : `$${Number((analytics?.kpis as any)?.thisMonthSalesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                  {' '}
                  <span className="text-muted-foreground font-normal">
                    ({(analytics?.kpis as any)?.thisMonthSalesCount ?? 0} adet)
                  </span>
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
                  <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.openQuotesAmount, 'TRY')}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    ${Number(analytics?.kpis?.openQuotesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                    ${analyticsLoading ? '...' : Number(analytics?.kpis?.openQuotesAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {analyticsLoading ? '...' : formatMoney(analytics?.kpis.openQuotesAmount, 'TRY')}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-muted-foreground">Karar Aşaması:</span>
                <span className="font-semibold text-foreground">
                  Müşteri onayı bekleyen aktif hacim
                </span>
              </div>
            </div>

            {/* KPI 3: Faturası Bekleyen Satışlar */}
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

            {/* KPI 4: Teklif & Lead Başarı Oranı */}
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

            {/* KPI 5: Depo Stok & Envanter Değeri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Depo Stok Değeri</span>
                <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>

              {displayCurrency === 'TRY' ? (
                <>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    {analyticsLoading ? '...' : formatMoney((analytics?.kpis as any)?.totalStockValueTry || '0.00', 'TRY')}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    ${Number((analytics?.kpis as any)?.totalStockValueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                    ${analyticsLoading ? '...' : Number((analytics?.kpis as any)?.totalStockValueUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {analyticsLoading ? '...' : formatMoney((analytics?.kpis as any)?.totalStockValueTry || '0.00', 'TRY')}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <Link
                  to="/stock/reports"
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium hover:underline"
                >
                  {(analytics?.kpis as any)?.totalStockQuantity || 0} Kalem Fiziksel
                </Link>
                {Number((analytics?.kpis as any)?.pendingExitsCount || 0) > 0 ? (
                  <Link
                    to="/stock/exits"
                    className="font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>{(analytics?.kpis as any)?.pendingExitsCount} Sevkiyat Onayda</span>
                  </Link>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Stok Tam</span>
                )}
              </div>
            </div>
          </div>

          {/* ===================== GRAFİK & PERFORMANS BÖLÜMÜ ===================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pasta Grafik 1: Temsilci & Yönetici Bazlı Satış Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Ciro Üretim Dağılımı ({displayCurrency})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Yönetici ve temsilcilerin ürettiği toplam net satış cirolarının oransal pasta grafiği
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

            {/* ================= MODERN & ANLAŞILIR: TEMSİLCİ TEKLİF & PERFORMANS MATRİSİ ================= */}
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

              {/* Çoklu Temsilciler İçin Ölçeklenebilir, Kaydırılabilir ve Net Kart Listesi */}
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

                    const approvedPct = total > 0 ? (approved / total) * 100 : 0;
                    const sentPct = total > 0 ? (sent / total) * 100 : 0;
                    const revisedPct = total > 0 ? (revised / total) * 100 : 0;
                    const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

                    return (
                      <div
                        key={q.repId}
                        className="p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-900 text-navy-800 dark:text-navy-200 flex items-center justify-center font-bold text-[11px] uppercase">
                              {q.repName.slice(0, 2)}
                            </div>
                            <span className="font-bold text-foreground text-sm">{q.repName}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Toplam <strong>{total}</strong> teklif
                            </span>
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                              %{winRate} Onay
                            </span>
                          </div>
                        </div>

                        {/* Renkli Segmentli İlerleme Çubuğu */}
                        <div className="w-full h-2.5 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden flex">
                          {approvedPct > 0 && (
                            <div
                              style={{ width: `${approvedPct}%` }}
                              title={`Onaylanan: ${approved} adet`}
                              className="bg-green-500 h-full transition-all"
                            />
                          )}
                          {sentPct > 0 && (
                            <div
                              style={{ width: `${sentPct}%` }}
                              title={`Açık: ${sent} adet`}
                              className="bg-teal-600 h-full transition-all"
                            />
                          )}
                          {revisedPct > 0 && (
                            <div
                              style={{ width: `${revisedPct}%` }}
                              title={`Revize: ${revised} adet`}
                              className="bg-amber-500 h-full transition-all"
                            />
                          )}
                          {rejectedPct > 0 && (
                            <div
                              style={{ width: `${rejectedPct}%` }}
                              title={`Reddedilen: ${rejected} adet`}
                              className="bg-red-500 h-full transition-all"
                            />
                          )}
                        </div>

                        {/* Net İstatistik Sayıları */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <span className="font-semibold text-green-700 dark:text-green-400">
                            {approved} Onaylandı
                          </span>
                          <span className="font-semibold text-teal-700 dark:text-teal-400">
                            {sent} Açıkta
                          </span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {revised} Revize
                          </span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {rejected} Reddedildi
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Grafik 3: Kategori Bazlı Satış Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Müşteri Kategorilerine Göre Satış Dağılımı ({displayCurrency})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Telekom operatörleri, kurumsal, kamu ve KOBİ kategorilerindeki ciro ve satış adetleri
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(((analytics as any)?.salesByCategory || []) as any[]).map((item: any) => {
                        const amountTry = Number(item.totalSalesAmount) || 0;
                        const value = displayCurrency === 'USD' ? amountTry / usdRate : amountTry;
                        return {
                          name: item.categoryName,
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
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(((analytics as any)?.salesByCategory || []) as any[]).map((entry: any, index: number) => (
                        <Cell
                          key={`cell-cat-${index}`}
                          fill={entry.categoryColor || BRAND_PALETTE[index % BRAND_PALETTE.length]}
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
          </div>

          {/* ===================== YÖNETİCİ CANLI AKIŞ: SON SATIŞLAR VE AÇIK TEKLİFLER ===================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol: Son Gerçekleşen Satışlar */}
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
                          {s.quote?.company && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                s.quote.company.code === 'TESCOM'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {s.quote.company.name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Yetkili / Temsilci: {s.rep?.fullName || '-'} &bull;{' '}
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

            {/* Sağ: Bekleyen Açık Teklifler */}
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
                          {q.company && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                q.company.code === 'TESCOM'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              {q.company.name}
                            </span>
                          )}
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

      {/* ===================== 2. SATIŞ TEMSİLCİSİ GÖRÜNÜMÜ ===================== */}
      {!isManager && (
        <div className="space-y-6">
          {/* Temsilci Hızlı Durum */}
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

          {/* Son Teklifler ve Leadler Listesi */}
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
    </div>
  );
};
