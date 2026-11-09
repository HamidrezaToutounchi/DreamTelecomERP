import React from 'react';
import { DollarSign } from 'lucide-react';
import { useAnalyticsControllerGetExchangeRate } from '@/api/generated';

interface ExchangeRateBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export const ExchangeRateBadge: React.FC<ExchangeRateBadgeProps> = ({ className = '', showIcon = true }) => {
  const { data } = useAnalyticsControllerGetExchangeRate({
    query: {
      staleTime: 5 * 60 * 1000, // 5 dakika önbellek
      refetchInterval: 10 * 60 * 1000, // 10 dakikada bir otomatik yenile
    },
  });

  const usdRate = (data as any)?.usdRate ? Number((data as any).usdRate) : 50.18;
  const source = (data as any)?.source || 'TCMB';
  const lastUpdated = (data as any)?.lastUpdated
    ? new Date((data as any).lastUpdated).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs select-none shadow-2xs ${className}`}
      title={`Kaynak: ${source} (Son Güncelleme: ${lastUpdated || 'Az önce'}) - https://www.tcmb.gov.tr/kurlar/today.xml`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">USD/TRY:</span>
      <span className="font-mono font-extrabold text-emerald-950 dark:text-emerald-100">
        {usdRate.toFixed(2)} ₺
      </span>
    </div>
  );
};
