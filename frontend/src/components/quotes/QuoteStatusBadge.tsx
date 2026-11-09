import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Send, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export const QuoteStatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case 'DRAFT':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
            className,
          )}
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Taslak
        </span>
      );

    case 'SENT':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
            className,
          )}
        >
          <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Gönderildi
        </span>
      );

    case 'APPROVED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-900 border border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
            className,
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
          Onaylandı
        </span>
      );

    case 'REJECTED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
            className,
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          Reddedildi
        </span>
      );

    case 'REVISED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
            className,
          )}
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Revize Edildi
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
};
