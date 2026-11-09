import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const PaymentStatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case 'PENDING':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
            className,
          )}
        >
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          Ödeme Bekliyor
        </span>
      );

    case 'PARTIAL':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
            className,
          )}
        >
          <AlertCircle className="w-3 h-3 text-sky-600 dark:text-sky-400" />
          Kısmi Ödeme
        </span>
      );

    case 'PAID':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-900 border border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
            className,
          )}
        >
          <CheckCircle2 className="w-3 h-3 text-green-700 dark:text-green-400" />
          Ödendi
        </span>
      );

    default:
      return <span>{status}</span>;
  }
};
