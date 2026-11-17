import React from 'react';
import { cn } from '@/lib/utils';

interface DreamLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DreamLogo: React.FC<DreamLogoProps> = ({
  className,
  showSubtitle = true,
  size = 'md',
}) => {
  const heights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-12',
  };

  return (
    <div className={cn('flex items-center gap-2 select-none', className)}>
      {/* Gerçek Dream Telecom Resmi Logosu */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200/50 dark:border-slate-800 shadow-xs">
        <img
          src="/logo.png"
          alt="Dream Telecom"
          className={cn('object-contain', heights[size])}
        />
      </div>

      {showSubtitle && (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-navy-800 dark:text-navy-300 tracking-tight leading-tight">
            ERP Platformu
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            Satış, Stok & Kurumsal Yönetim
          </span>
        </div>
      )}
    </div>
  );
};

export const DreamBarsIllustration: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="/logo.png"
      alt="Dream Telecom"
      className={cn('object-contain max-h-16 opacity-80', className)}
    />
  );
};
