import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  FileCheck2,
  FileClock,
  ClockAlert,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
  Target,
  Sparkles,
  Calendar,
} from 'lucide-react';
import {
  useAnalyticsControllerGetDashboardSummary,
  useLeadsControllerFindAll,
  useQuotesControllerFindAll,
  useSalesControllerFindAll,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/formatters';
import { Link } from '@tanstack/react-router';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';

const BRAND_PALETTE = ['#004A93', '#006F8D', '#78C042', '#F59E0B', '#67737B'];

export const DashboardPage: React.FC = () => {
  const { user, isManager } = useAuth();

  // If Manager, fetch full analytics
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsControllerGetDashboardSummary({
    query: {
      enabled: isManager,
    },
  });

  // Rep specific queries
  const { data: repLeads } = useLeadsControllerFindAll(
    { pageSize: 5 },
    { query: { enabled: !isManager } },
  );

  const { data: repQuotes } = useQuotesControllerFindAll(
    { pageSize: 5 },
    { query: { enabled: !isManager } },
  );

  const { data: repSales } = useSalesControllerFindAll(
    { pageSize: 5 },
    { query: { enabled: !isManager } },
  );

  return (
    <div className="space-y-6">
      {/* Karşılama Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Hoş Geldiniz, {user?.fullName}</span>
            {isManager ? (
              <span className="text-xs bg-navy-100 dark:bg-navy-950 text-navy-800 dark:text-navy-300 font-bold px-2 py-0.5 rounded border border-navy-200 dark:border-navy-800">
                Müdür Görünümü
              </span>
            ) : (
              <span className="text-xs bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                Temsilci Paneli
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isManager
              ? 'Tüm satış temsilcilerinin gerçek zamanlı ciro, teklif ve dönüşüm metrikleri.'
              : 'Size atanan potansiyel müşteriler, açık teklifleriniz ve son satışlarınız.'}
          </p>
        </div>

        {isManager && (
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
          >
            Detaylı Raporlar
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* ===================== 1. SATIŞ MÜDÜRÜ GÖRÜNÜMÜ ===================== */}
      {isManager && (
        <>
          {/* Üst KPI Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Toplam Ciro</span>
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-xl font-extrabold text-navy-700 dark:text-navy-300">
                {analyticsLoading ? '...' : formatMoney(analytics?.kpis.totalRevenue)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Tüm Zamanlar</span>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Bu Ayki Ciro</span>
                <Calendar className="w-4 h-4 text-navy-600 dark:text-navy-400" />
              </div>
              <div className="text-xl font-extrabold text-green-700 dark:text-green-400">
                {analyticsLoading ? '...' : formatMoney((analytics?.kpis as any)?.thisMonthSalesAmount || '0.00')}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block font-semibold">
                {(analytics?.kpis as any)?.thisMonthSalesCount ?? 0} adet satış
              </span>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Açık Teklifler</span>
                <FileClock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-xl font-extrabold text-teal-700 dark:text-teal-300">
                {analyticsLoading ? '...' : formatMoney(analytics?.kpis.openQuotesAmount)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Karar Aşamasında</span>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Teklif Onay Oranı</span>
                <FileCheck2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                {analyticsLoading ? '...' : analytics?.kpis.quoteApprovalRate}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Onay Başarısı</span>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Faturası Bekleyen</span>
                <ClockAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {analyticsLoading ? '...' : formatMoney(analytics?.kpis.pendingInvoiceSalesAmount)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {analytics?.kpis.pendingInvoiceSalesCount ?? 0} adet satış
              </span>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-semibold">Lead Dönüşüm</span>
                <Target className="w-4 h-4 text-navy-600 dark:text-navy-400" />
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                {analyticsLoading ? '...' : analytics?.kpis.leadConversionRate}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1 block">Müşteriye Dönüşüm</span>
            </div>
          </div>

          {/* Recharts Grafikleri: Pasta Grafik 1 ve Pasta Grafik 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pasta Grafik 1: Temsilci Bazlı Satış Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Temsilci Bazlı Satış Dağılımı
                </h2>
                <p className="text-xs text-muted-foreground">
                  Hangi temsilcinin ne kadarlık ciro ürettiğinin oransal pasta grafiği
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(analytics?.salesByRep || []).map((item) => ({
                        name: item.repName,
                        value: Number(item.totalSalesAmount) || 0,
                        formatted: formatMoney(item.totalSalesAmount),
                        salesCount: item.salesCount,
                      }))}
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

            {/* Grafik 2: Temsilci Bazlı Teklif Durum Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Temsilci Bazlı Teklif & Onay Dağılımı
                </h2>
                <p className="text-xs text-muted-foreground">
                  Temsilcilerin hazırladığı toplam teklif sayısı ve onay/ret kırılımı
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(analytics?.quotesByRep || []).map((item) => ({
                      name: item.repName.split(' ')[0], // Sadece isim
                      Onaylanan: item.approvedCount,
                      Reddedilen: item.rejectedCount,
                      Revize: item.revisedCount,
                      Açık: item.draftOrSentCount,
                    }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Onaylanan" fill="#78C042" stackId="a" />
                    <Bar dataKey="Açık" fill="#006F8D" stackId="a" />
                    <Bar dataKey="Revize" fill="#F59E0B" stackId="a" />
                    <Bar dataKey="Reddedilen" fill="#DC2626" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grafik 3: Kategori Bazlı Satış Dağılımı */}
            <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-base font-bold text-foreground">
                  Müşteri Kategorilerine Göre Satış Dağılımı
                </h2>
                <p className="text-xs text-muted-foreground">
                  Telekom operatörleri, kurumsal, kamu ve KOBİ kategorilerindeki ciro ve satış adetleri
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(((analytics as any)?.salesByCategory || []) as any[]).map((item: any) => ({
                        name: item.categoryName,
                        value: Number(item.totalSalesAmount) || 0,
                        formatted: formatMoney(item.totalSalesAmount),
                        salesCount: item.salesCount,
                      }))}
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
                {repLeads?.meta?.totalRowCount ?? 0}
              </div>
              <Link to="/leads" className="text-xs text-navy-600 dark:text-navy-400 font-semibold mt-2 inline-flex items-center gap-1">
                Leadleri İncele &rarr;
              </Link>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Aktif Teklifleriniz</span>
              <div className="text-2xl font-extrabold text-navy-700 dark:text-navy-300 mt-1">
                {repQuotes?.meta?.totalRowCount ?? 0}
              </div>
              <Link to="/quotes" className="text-xs text-navy-600 dark:text-navy-400 font-semibold mt-2 inline-flex items-center gap-1">
                Teklifleri Yönet &rarr;
              </Link>
            </div>

            <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-semibold text-muted-foreground">Tamamlanan Satışlarınız</span>
              <div className="text-2xl font-extrabold text-green-700 dark:text-green-400 mt-1">
                {repSales?.meta?.totalRowCount ?? 0}
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
                {((repQuotes?.data || []) as any[]).slice(0, 4).map((q) => (
                  <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-navy-700 dark:text-navy-300 block">{q.quoteNumber}</span>
                      <span className="text-muted-foreground">{q.customer?.companyName || '-'}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-foreground block">{formatMoney(q.grandTotal)}</span>
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
                {(repLeads?.data || []).slice(0, 4).map((l) => (
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
