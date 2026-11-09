import React, { useState } from 'react';
import { BarChart3, Filter, Calendar, Users, FileText, CheckCircle2 } from 'lucide-react';
import {
  useAnalyticsControllerGetDetailedReports,
  useUsersControllerFindAll,
} from '@/api/generated';
import { formatMoney } from '@/lib/formatters';

export const AnalyticsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [repId, setRepId] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<string>('');
  const [isInvoiced, setIsInvoiced] = useState<string>('');
  const [leadSource, setLeadSource] = useState<string>('');

  const { data: reps } = useUsersControllerFindAll({ role: 'SALES_REP' });

  const { data: reportsData, isLoading } = useAnalyticsControllerGetDetailedReports({
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
    repId: repId || undefined,
    quoteStatus: (quoteStatus as any) || undefined,
    isInvoiced: isInvoiced === 'true' ? true : isInvoiced === 'false' ? false : undefined,
    leadSource: leadSource || undefined,
  });

  const reports = reportsData as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-navy-700 dark:text-navy-400" />
          <span>Yönetici Performans & Detaylı Raporlar</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tarih, temsilci, teklif durumu, fatura ve kaynak kırılımlı analitik veriler.
        </p>
      </div>

      {/* Filtre Barı */}
      <div className="bg-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
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
          <label className="font-semibold text-muted-foreground">Satış Temsilcisi</label>
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs cursor-pointer"
          >
            <option value="">Tüm Temsilciler</option>
            {(reps || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
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
            <option value="">Tümü</option>
            <option value="APPROVED">Onaylananlar</option>
            <option value="SENT">Açık / Gönderilenler</option>
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
            <option value="">Tümü</option>
            <option value="true">Faturalandırılmış</option>
            <option value="false">Faturası Bekleyen</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-muted-foreground">Raporlar hesaplanıyor...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Satış Metrikleri */}
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground pb-2 border-b border-slate-100 dark:border-slate-800">
              Satış & Ciro Metrikleri
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Toplam Satış Adedi:</span>
                <span className="font-bold text-foreground">{reports?.salesMetrics.totalSalesCount} adet</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Toplam Ciro Hacmi:</span>
                <span className="font-bold text-green-700 dark:text-green-400 text-sm">
                  {formatMoney(reports?.salesMetrics.totalSalesVolume)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Faturalanan Satış:</span>
                <span className="font-semibold text-green-700">{reports?.salesMetrics.invoicedCount} adet</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Fatura Bekleyen:</span>
                <span className="font-semibold text-amber-600">{reports?.salesMetrics.pendingInvoiceCount} adet</span>
              </div>
            </div>
          </div>

          {/* Teklif Metrikleri */}
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground pb-2 border-b border-slate-100 dark:border-slate-800">
              Teklif Performans Dağılımı
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Verilen Toplam Teklif:</span>
                <span className="font-bold text-foreground">{reports?.quoteMetrics.totalQuotes} adet</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ortalama Teklif Tutarı:</span>
                <span className="font-bold text-navy-700 dark:text-navy-300">
                  {formatMoney(reports?.quoteMetrics.averageQuoteAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Onaylanan Teklifler:</span>
                <span className="font-bold text-green-700">{reports?.quoteMetrics.approvedQuotes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Açık / Gönderilen:</span>
                <span className="font-bold text-teal-600">{reports?.quoteMetrics.sentQuotes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reddedilen Teklifler:</span>
                <span className="font-bold text-red-600">{reports?.quoteMetrics.rejectedQuotes}</span>
              </div>
            </div>
          </div>

          {/* Lead Dönüşüm Metrikleri */}
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground pb-2 border-b border-slate-100 dark:border-slate-800">
              Pazarlama & Lead Dönüşümü
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Toplam Potansiyel Lead:</span>
                <span className="font-bold text-foreground">{reports?.leadMetrics.totalLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Müşteriye Dönüşen:</span>
                <span className="font-bold text-green-700">{reports?.leadMetrics.convertedLeads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Kaybedilen Lead:</span>
                <span className="font-bold text-red-600">{reports?.leadMetrics.lostLeads}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-foreground">Dönüşüm Oranı:</span>
                <span className="font-extrabold text-navy-700 dark:text-navy-300 text-sm">
                  {reports?.leadMetrics.conversionRate}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
