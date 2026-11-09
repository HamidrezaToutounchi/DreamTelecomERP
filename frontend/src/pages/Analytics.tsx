import React, { useState } from 'react';
import {
  BarChart3,
  Filter,
  Calendar,
  Users,
  FileText,
  CheckCircle2,
  TrendingUp,
  Download,
  Eye,
  Award,
  ArrowUpRight,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  FileClock,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  useAnalyticsControllerGetDetailedReports,
  useAnalyticsControllerGetDashboardSummary,
  useUsersControllerFindAll,
  useQuotesControllerFindAll,
  useCompaniesControllerFindAll,
} from '@/api/generated';
import { formatMoney } from '@/lib/formatters';
import { downloadQuotePdf } from '@/lib/pdf';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import Decimal from 'decimal.js';

const BRAND_PALETTE = ['#004A93', '#006F8D', '#78C042', '#F59E0B', '#DC2626', '#6366F1', '#8B5CF6'];

export const AnalyticsPage: React.FC = () => {
  const [displayCurrency, setDisplayCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [companyId, setCompanyId] = useState<string>('');
  const [repId, setRepId] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<string>('');
  const [isInvoiced, setIsInvoiced] = useState<string>('');
  const [leadSource, setLeadSource] = useState<string>('');

  // 1. Şirketler listesi (Dream & Tescom)
  const { data: companiesData } = useCompaniesControllerFindAll();
  const companies = (companiesData as any) || [];

  // 1b. Tüm kullanıcılar ve temsilciler listesi (Yöneticiler de dahil)
  const { data: reps } = useUsersControllerFindAll();

  // 2. Detaylı Raporlar Hook'u
  const { data: reportsData, isLoading } = useAnalyticsControllerGetDetailedReports({
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    repId: repId || undefined,
    companyId: companyId || undefined,
    quoteStatus: (quoteStatus as any) || undefined,
    isInvoiced: isInvoiced === 'true' ? true : isInvoiced === 'false' ? false : undefined,
    leadSource: leadSource || undefined,
  });

  // 3. Genel Dashboard Özeti (Temsilciler kıyaslaması ve genel dağılım için)
  const { data: dashboardData } = useAnalyticsControllerGetDashboardSummary();

  // 4. Seçili temsilcinin (veya genel) teklifleri
  const { data: quotesData, isLoading: quotesLoading } = useQuotesControllerFindAll({
    repId: repId || undefined,
    companyId: companyId || undefined,
    status: (quoteStatus as any) || undefined,
    pageSize: 15,
  });

  const reports = reportsData as any;
  const usdRate = Number(reports?.salesMetrics?.usdRate || 50.18);

  // Seçili temsilci bilgisi
  const selectedRep = reps?.find((r) => r.id === repId);

  // Filtreleri sıfırlama fonksiyonu
  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setCompanyId('');
    setRepId('');
    setQuoteStatus('');
    setIsInvoiced('');
    setLeadSource('');
  };

  // Pasta Grafik 1: Teklif Durum Dağılımı Verisi
  const quoteStatusPieData = [
    {
      name: 'Onaylanan',
      value: reports?.quoteMetrics?.approvedQuotes || 0,
      color: '#78C042', // Yeşil
    },
    {
      name: 'Açık / Gönderilen',
      value: reports?.quoteMetrics?.sentQuotes || 0,
      color: '#006F8D', // Petrol Mavisi
    },
    {
      name: 'Taslak',
      value: reports?.quoteMetrics?.draftQuotes || 0,
      color: '#004A93', // Tescom Lacivert
    },
    {
      name: 'Revize Edilen',
      value: reports?.quoteMetrics?.revisedQuotes || 0,
      color: '#F59E0B', // Amber
    },
    {
      name: 'Reddedilen',
      value: reports?.quoteMetrics?.rejectedQuotes || 0,
      color: '#DC2626', // Kırmızı
    },
  ].filter((item) => item.value > 0);

  // Pasta Grafik 2: Fatura & Tahsilat Durumu Verisi
  const invoicePieData = [
    {
      name: 'Faturalandırılmış',
      value: reports?.salesMetrics?.invoicedCount || 0,
      color: '#78C042',
    },
    {
      name: 'Fatura Bekleyen',
      value: reports?.salesMetrics?.pendingInvoiceCount || 0,
      color: '#F59E0B',
    },
  ].filter((item) => item.value > 0);

  // Pasta Grafik 3: Temsilci Bazlı Ciro Dağılımı (Dashboard özetinden)
  const repSalesPieData = (dashboardData?.salesByRep || []).map((item, idx) => ({
    name: item.repName,
    value: Number(item.totalSalesAmount) || 0,
    formatted: formatMoney(item.totalSalesAmount),
    salesCount: item.salesCount,
    color: BRAND_PALETTE[idx % BRAND_PALETTE.length],
  })).filter((item) => item.value > 0);

  // Temsilciler Kıyaslama Tablosu İçin Hesaplamalar
  const totalSystemRevenue = (dashboardData?.salesByRep || []).reduce(
    (acc, curr) => acc.plus(new Decimal(curr.totalSalesAmount || 0)),
    new Decimal(0),
  );

  const repComparisonList = (dashboardData?.salesByRep || []).map((rep) => {
    const quoteStat = dashboardData?.quotesByRep?.find((q) => q.repId === rep.repId);
    const totalQuotes = quoteStat?.totalQuotesCount || 0;
    const approvedQuotes = quoteStat?.approvedCount || 0;
    const repRevenue = new Decimal(rep.totalSalesAmount || 0);

    // Ciro Payı %
    const revenueSharePct = totalSystemRevenue.gt(0)
      ? repRevenue.dividedBy(totalSystemRevenue).times(100).toFixed(1)
      : '0.0';

    // Win Rate (Kazanma Oranı) %
    const winRatePct = totalQuotes > 0
      ? new Decimal(approvedQuotes).dividedBy(totalQuotes).times(100).toFixed(1)
      : '0.0';

    return {
      repId: rep.repId,
      repName: rep.repName,
      totalSalesAmount: rep.totalSalesAmount,
      salesCount: rep.salesCount,
      totalQuotes,
      approvedQuotes,
      revenueSharePct,
      winRatePct,
    };
  });

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Açıklama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Yönetici Performans & Detaylı Raporlar</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tüm yöneticilerin ve temsilcilerin teklif, satış ve ciro performans verileri.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Para Birimi Değiştirici (TRY / USD) */}
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

          {repId && (
            <button
              onClick={() => setRepId('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Filtreyi Kaldır ({selectedRep?.fullName})
            </button>
          )}
        </div>
      </div>

      {/* Filtre Barı */}
      <div className="bg-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Filter className="w-4 h-4 text-navy-700 dark:text-navy-400" />
            <span>Rapor Filtreleri</span>
          </div>
          {(dateFrom || dateTo || companyId || repId || quoteStatus || isInvoiced || leadSource) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Filtreleri Temizle
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-navy-700 dark:text-navy-400" />
              <span>Teklif Veren Firma</span>
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs cursor-pointer font-bold text-foreground"
            >
              <option value="">🏢 Tüm Firmalar (Tümü)</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Satış Temsilcisi / Yetkili</label>
            <select
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs cursor-pointer font-medium"
            >
              <option value="">Tüm Kullanıcılar & Temsilciler</option>
              {(reps || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName} {r.role === 'SALES_MANAGER' ? '(Yönetici)' : '(Temsilci)'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Teklif Durumu</label>
            <select
              value={quoteStatus}
              onChange={(e) => setQuoteStatus(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs cursor-pointer"
            >
              <option value="">Tüm Teklif Durumları</option>
              <option value="APPROVED">Onaylananlar</option>
              <option value="SENT">Açık / Gönderilenler</option>
              <option value="DRAFT">Taslaklar</option>
              <option value="REJECTED">Reddedilenler</option>
              <option value="REVISED">Revize Edilenler</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Fatura Durumu</label>
            <select
              value={isInvoiced}
              onChange={(e) => setIsInvoiced(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs cursor-pointer"
            >
              <option value="">Tüm Fatura Durumları</option>
              <option value="true">Faturalandırılmış</option>
              <option value="false">Faturası Bekleyen</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-muted-foreground">Rapor verileri analiz ediliyor...</span>
        </div>
      ) : (
        <>
          {/* ===================== 1. ÜÇLÜ METRİK KARTLARI ===================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Satış & Ciro Metrikleri */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Satış & Ciro Metrikleri
                </h3>
                {selectedRep && (
                  <span className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 font-bold px-2 py-0.5 rounded">
                    {selectedRep.fullName}
                  </span>
                )}
              </div>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-muted-foreground block">Toplam Gerçekleşen Ciro:</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                      TCMB Kur: {usdRate.toFixed(2)} ₺
                    </span>
                  </div>
                  <div className="text-right">
                    {displayCurrency === 'TRY' ? (
                      <>
                        <span className="font-extrabold text-green-700 dark:text-green-400 text-base block">
                          {formatMoney(reports?.salesMetrics?.totalSalesVolume || '0.00', 'TRY')}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block font-mono">
                          ${Number(reports?.salesMetrics?.totalSalesVolumeUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-extrabold text-green-700 dark:text-green-400 text-base block font-mono">
                          ${Number(reports?.salesMetrics?.totalSalesVolumeUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                          {formatMoney(reports?.salesMetrics?.totalSalesVolume || '0.00', 'TRY')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground">Toplam Satış Adedi:</span>
                  <span className="font-bold text-foreground">
                    {reports?.salesMetrics?.totalSalesCount || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Faturalanan Satış:</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {reports?.salesMetrics?.invoicedCount || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fatura Bekleyen Satış:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {reports?.salesMetrics?.pendingInvoiceCount || 0} adet
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Teklif Performans Dağılımı */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Teklif Performansı
                </h3>
                <span className="text-[10px] text-muted-foreground">
                  Ort. Tutar: {formatMoney(reports?.quoteMetrics?.averageQuoteAmount || '0.00')}
                </span>
              </div>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Verilen Toplam Teklif:</span>
                  <span className="font-bold text-foreground">
                    {reports?.quoteMetrics?.totalQuotes || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Onaylanan Teklifler:
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {reports?.quoteMetrics?.approvedQuotes || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                    Açık / Bekleyen:
                  </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {reports?.quoteMetrics?.sentQuotes || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Reddedilen Teklifler:
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {reports?.quoteMetrics?.rejectedQuotes || 0} adet
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Pazarlama & Lead Dönüşümü */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-navy-600" />
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                  Lead & Portföy Dönüşümü
                </h3>
              </div>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Toplam Potansiyel Lead:</span>
                  <span className="font-bold text-foreground">
                    {reports?.leadMetrics?.totalLeads || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Müşteriye Dönüşen:</span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    {reports?.leadMetrics?.convertedLeads || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Kaybedilen Lead:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {reports?.leadMetrics?.lostLeads || 0} adet
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-foreground">Dönüşüm Oranı:</span>
                  <span className="font-extrabold text-navy-700 dark:text-navy-300 text-sm">
                    {reports?.leadMetrics?.conversionRate || '0.00%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== 2. PASTA GRAFİKLERİ BÖLÜMÜ ===================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pasta Grafik 1: Teklif Durum Dağılımı */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-foreground">Teklif Durum Dağılımı</h3>
                <p className="text-[11px] text-muted-foreground">
                  Tekliflerin onay, bekleme ve ret oranları
                </p>
              </div>

              <div className="h-64 w-full">
                {quoteStatusPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Gösterilecek teklif verisi yok
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quoteStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {quoteStatusPieData.map((entry, index) => (
                          <Cell key={`quote-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} adet`, 'Teklif Sayısı']} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pasta Grafik 2: Satış & Fatura Durumu */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-foreground">Satış & Fatura Durumu</h3>
                <p className="text-[11px] text-muted-foreground">
                  Kesilen faturalar vs fatura bekleyen satışlar
                </p>
              </div>

              <div className="h-64 w-full">
                {invoicePieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Gösterilecek satış/fatura verisi yok
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={invoicePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {invoicePieData.map((entry, index) => (
                          <Cell key={`inv-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val} adet satış`, 'Durum']} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pasta Grafik 3: Temsilciler Ciro Payı (%) */}
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-foreground">Temsilciler Ciro Payı (%)</h3>
                <p className="text-[11px] text-muted-foreground">
                  Toplam şirket cirosundaki oransal temsilci katkısı
                </p>
              </div>

              <div className="h-64 w-full">
                {repSalesPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Gösterilecek temsilci satış verisi yok
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repSalesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {repSalesPieData.map((entry, index) => (
                          <Cell key={`rep-pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${item.payload.formatted} (${item.payload.salesCount} adet)`,
                          name,
                        ]}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ===================== 2.5 ŞİRKET BAZLI TEKLİF & PERFORMANS DAĞILIMI (DREAM vs TESCOM) ===================== */}
          <div className="bg-card p-5 sm:p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                  <span>Şirket Bazlı Teklif & Dağılım Raporu (Dream Telecom vs Tescom Telecom)</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hangi şirketten ne kadar teklif verildi, kaçı onaylandı ve üretilen toplam hacimler.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded-lg">
                  Para Birimi: {displayCurrency}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {((reports?.quotesByCompany?.length ? reports.quotesByCompany : dashboardData?.quotesByCompany) || []).map((comp: any) => {
                const isTescom = comp.companyCode === 'TESCOM';
                const total = comp.totalQuotesCount || 0;
                const approved = comp.approvedCount || 0;
                const draftOrSent = comp.draftOrSentCount || 0;
                const revised = comp.revisedCount || 0;
                const rejected = comp.rejectedCount || 0;
                const winRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
                const amount =
                  displayCurrency === 'USD'
                    ? `$${Number(comp.totalAmountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${Number(comp.totalAmountTry || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

                return (
                  <div
                    key={comp.companyId}
                    className={cn(
                      'p-5 rounded-xl border shadow-2xs flex flex-col justify-between space-y-4 transition-all',
                      isTescom
                        ? 'border-sky-200 dark:border-sky-900/60 bg-sky-50/25 dark:bg-sky-950/20'
                        : 'border-navy-200 dark:border-navy-900/60 bg-navy-50/25 dark:bg-navy-950/20',
                    )}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-24 bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src={isTescom ? '/tescom-logo.png' : '/logo.png'}
                            alt={comp.companyName}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground">{comp.companyName}</h3>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isTescom ? 'TS- Serisi Teklifler' : 'DT- Serisi Teklifler'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block font-bold">Toplam Teklif Hacmi</span>
                        <span className="text-base font-black text-foreground font-mono">{amount}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-lg bg-card border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-muted-foreground block font-bold">Verilen Teklif</span>
                        <span className="font-extrabold text-foreground text-sm">{total} adet</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-green-700 dark:text-green-400 block font-bold">Onaylanan</span>
                        <span className="font-extrabold text-green-700 dark:text-green-400 text-sm">{approved}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-teal-700 dark:text-teal-400 block font-bold">Açık / Taslak</span>
                        <span className="font-extrabold text-teal-700 dark:text-teal-400 text-sm">{draftOrSent}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-card border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[10px] text-navy-700 dark:text-navy-400 block font-bold">Başarı Oranı</span>
                        <span className="font-extrabold text-navy-700 dark:text-navy-400 text-sm">%{winRate}</span>
                      </div>
                    </div>

                    {/* Oransal Durum Çubuğu */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>Onay / Durum Dağılımı</span>
                        <span>{approved} Onay / {total} Toplam Teklif</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                        <div
                          style={{ width: total > 0 ? `${(approved / total) * 100}%` : '0%' }}
                          className="bg-green-500 h-full transition-all"
                          title={`Onaylanan: ${approved}`}
                        />
                        <div
                          style={{ width: total > 0 ? `${(draftOrSent / total) * 100}%` : '0%' }}
                          className="bg-teal-500 h-full transition-all"
                          title={`Açık/Taslak: ${draftOrSent}`}
                        />
                        <div
                          style={{ width: total > 0 ? `${(revised / total) * 100}%` : '0%' }}
                          className="bg-amber-500 h-full transition-all"
                          title={`Revize: ${revised}`}
                        />
                        <div
                          style={{ width: total > 0 ? `${(rejected / total) * 100}%` : '0%' }}
                          className="bg-red-500 h-full transition-all"
                          title={`Reddedilen: ${rejected}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================== 3. TEMSİLCİ KIYASLAMA TABLOSU (% PAYI & WIN RATE) ===================== */}
          <div className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Satış Temsilcileri Performans & Yüzde Kıyaslama Tablosu</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Temsilcilerin toplam cirodaki oransal payları, teklif onay başarı oranları (% Win Rate) ve satış adetleri.
                </p>
              </div>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded-lg self-start sm:self-auto">
                {repComparisonList.length} Temsilci
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">SATIŞ TEMSİLCİSİ</th>
                    <th className="py-3 px-4">TOPLAM CİRO</th>
                    <th className="py-3 px-4 min-w-[160px]">CİRO PAYI (%)</th>
                    <th className="py-3 px-4 text-center">VERİLEN TEKLİF</th>
                    <th className="py-3 px-4 text-center">ONAYLANAN</th>
                    <th className="py-3 px-4 min-w-[140px]">BAŞARI ORANI (WIN RATE)</th>
                    <th className="py-3 px-4 text-center">SATIŞ ADEDİ</th>
                    <th className="py-3 px-4 text-right">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {repComparisonList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Sistemde kayıtlı satış temsilcisi verisi bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    repComparisonList.map((rep) => {
                      const isSelected = rep.repId === repId;
                      return (
                        <tr
                          key={rep.repId}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors ${
                            isSelected ? 'bg-navy-50/60 dark:bg-navy-950/40 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-900 text-navy-800 dark:text-navy-200 flex items-center justify-center font-bold text-xs uppercase">
                                {rep.repName.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">{rep.repName}</span>
                                {isSelected && (
                                  <span className="text-[10px] text-navy-600 dark:text-navy-400 font-semibold">
                                    (Filtrelendi)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-extrabold text-green-700 dark:text-green-400">
                            {displayCurrency === 'TRY' ? (
                              <>
                                <span className="block">{formatMoney(rep.totalSalesAmount, 'TRY')}</span>
                                <span className="text-[10px] text-muted-foreground block font-mono font-normal">
                                  ${(Number(rep.totalSalesAmount) / usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="block font-mono">
                                  ${(Number(rep.totalSalesAmount) / usdRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-normal">
                                  {formatMoney(rep.totalSalesAmount, 'TRY')}
                                </span>
                              </>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span>%{rep.revenueSharePct}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-navy-600 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(Number(rep.revenueSharePct), 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-medium">{rep.totalQuotes}</td>

                          <td className="py-3 px-4 text-center font-bold text-green-600 dark:text-green-400">
                            {rep.approvedQuotes}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-foreground">
                                <span>%{rep.winRatePct}</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(Number(rep.winRatePct), 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-foreground">
                            {rep.salesCount} adet
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                if (isSelected) {
                                  setRepId('');
                                } else {
                                  setRepId(rep.repId);
                                  // Teklifler tablosuna yumuşak kaydır
                                  document.getElementById('rep-quotes-section')?.scrollIntoView({ behavior: 'smooth' });
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 hover:bg-red-200'
                                  : 'bg-navy-50 text-navy-700 dark:bg-navy-950 dark:text-navy-300 hover:bg-navy-100'
                              }`}
                            >
                              {isSelected ? 'Filtreyi Kaldır' : 'Tekliflerini Gör'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================== 4. SEÇİLİ TEMSİLCİNİN VERDİĞİ TEKLİFLER TABLOSU ===================== */}
          <div id="rep-quotes-section" className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                  <span>
                    {selectedRep
                      ? `${selectedRep.fullName} Tarafından Hazırlanan Teklifler`
                      : 'Tüm Temsilcilerin Teklif Havuzu'}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRep
                    ? `Bu temsilcinin müşterilere sunduğu tüm teklifler, onay durumları ve resmi PDF belgeleri.`
                    : 'Filtrelemek için yukarıdaki tablodan bir satış temsilcisi seçebilirsiniz.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/quotes"
                  className="inline-flex items-center gap-1.5 text-xs text-navy-700 dark:text-navy-400 hover:underline font-bold"
                >
                  Teklifler Modülüne Git
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="overflow-x-auto">
              {quotesLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Teklifler listeleniyor...
                </div>
              ) : (quotesData?.data || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Kayıtlı teklif bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/40 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">TEKLİF NO & REVİZYON</th>
                      <th className="py-3 px-4">MÜŞTERİ</th>
                      <th className="py-3 px-4">TEMSİLCİ</th>
                      <th className="py-3 px-4">GENEL TOPLAM</th>
                      <th className="py-3 px-4 text-center">DURUM</th>
                      <th className="py-3 px-4">GEÇERLİLİK TARİHİ</th>
                      <th className="py-3 px-4 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {((quotesData?.data || []) as any[]).map((quote) => (
                      <tr key={quote.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-navy-700 dark:text-navy-300">
                                {quote.quoteNumber}
                              </span>
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-muted-foreground">
                                v{quote.version}
                              </span>
                            </div>
                            <div>
                              <span
                                className={cn(
                                  'text-[9px] font-extrabold px-1.5 py-0.5 rounded border inline-block',
                                  quote.company?.code === 'TESCOM' || quote.quoteNumber?.startsWith('TS-')
                                    ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                                    : 'bg-navy-50 text-navy-800 border-navy-200 dark:bg-navy-950/40 dark:text-navy-300',
                                )}
                              >
                                {quote.company?.code === 'TESCOM' || quote.quoteNumber?.startsWith('TS-')
                                  ? 'Tescom Telecom'
                                  : 'Dream Telecom'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-foreground block">
                            {quote.customer?.name || 'Müşteri'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {quote.customer?.city || 'Şehir belirtilmemiş'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">
                            {quote.rep?.fullName || 'Belirtilmemiş'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-extrabold text-foreground">
                            {formatMoney(quote.grandTotal)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            KDV Dahil ({quote.items?.length || 0} Kalem)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <QuoteStatusBadge status={quote.status as any} />
                        </td>

                        <td className="py-3 px-4 text-muted-foreground">
                          {quote.validUntil
                            ? new Date(quote.validUntil).toLocaleDateString('tr-TR')
                            : '-'}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => downloadQuotePdf(quote.id, quote.quoteNumber)}
                            title="Resmi PDF İndir"
                            className="p-1.5 text-navy-700 dark:text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-950 rounded-lg transition-colors inline-flex items-center gap-1 font-bold"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">İndir</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
