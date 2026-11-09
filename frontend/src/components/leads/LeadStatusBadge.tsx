import React from 'react';
import {
  Sparkles,
  PhoneMissed,
  PhoneCall,
  Calendar,
  Handshake,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type LeadStatusType =
  | 'NEW'
  | 'CALLED_NO_ANSWER'
  | 'CALLED_REACHED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_DONE'
  | 'CONVERTED'
  | 'LOST';

interface LeadStatusBadgeProps {
  status: string;
  className?: string;
}

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, className }) => {
  switch (status) {
    case 'NEW':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
            className,
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          Yeni
        </span>
      );

    case 'CALLED_NO_ANSWER':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
            className,
          )}
        >
          <PhoneMissed className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Arandı - Ulaşılamadı
        </span>
      );

    case 'CALLED_REACHED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
            className,
          )}
        >
          <PhoneCall className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          Arandı - Görüşüldü
        </span>
      );

    case 'MEETING_SCHEDULED':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
            className,
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          Toplantı Planlandı
        </span>
      );

    case 'MEETING_DONE':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-navy-50 text-navy-800 border border-navy-200 dark:bg-navy-950/50 dark:text-navy-300 dark:border-navy-800',
            className,
          )}
        >
          <Handshake className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
          Görüşüldü / Bilgi Verildi
        </span>
      );

    case 'CONVERTED':
      // WCAG AA KURALI: green-100 zemin üzerine green-900 koyu metin!
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-green-100 text-green-900 border border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
            className,
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
          Müşteriye Dönüştü
        </span>
      );

    case 'LOST':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
            'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
            className,
          )}
        >
          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          Kaybedildi
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
