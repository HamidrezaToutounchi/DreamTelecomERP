import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyableCodeProps {
  code: string | null | undefined;
  label?: string;
  className?: string;
  truncate?: boolean;
}

export const CopyableCode: React.FC<CopyableCodeProps> = ({
  code,
  label,
  className,
  truncate = false,
}) => {
  const [copied, setCopied] = useState(false);

  if (!code) return <span className="text-muted-foreground">-</span>;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(label ? `${label} panoya kopyalandı` : 'Kopyalandı', {
        description: code,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Kopyalama başarısız oldu.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Panoya kopyalamak için tıklayın"
      className={cn(
        'group inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-xs font-semibold',
        'bg-slate-100 hover:bg-navy-50 text-slate-800 hover:text-navy-700 border border-slate-200 hover:border-navy-200 transition-colors cursor-pointer',
        'dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 dark:hover:border-navy-400',
        className,
      )}
    >
      <span className={cn('select-all', truncate && 'max-w-[140px] truncate')}>
        {code}
      </span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-navy-600 dark:group-hover:text-navy-300 shrink-0 transition-colors" />
      )}
    </button>
  );
};
