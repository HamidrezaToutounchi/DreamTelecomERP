import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScanBarcode, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Web Audio API ile donanım geri bildirimi (Zebra benzeri ses)
class BeepSound {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext {
    if (!BeepSound.ctx) {
      BeepSound.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return BeepSound.ctx;
  }

  static success() {
    try {
      const ctx = BeepSound.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext engelliyse sessiz kal
    }
  }

  static error() {
    try {
      const ctx = BeepSound.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // AudioContext engelliyse sessiz kal
    }
  }
}

// Türkçe Q klavye harf haritası
const TURKISH_TO_EN: Record<string, string> = {
  'ı': 'i',
  'İ': 'I',
  'ş': 's',
  'Ş': 'S',
  'ğ': 'g',
  'Ğ': 'G',
  'ü': 'u',
  'Ü': 'U',
  'ö': 'o',
  'Ö': 'O',
  'ç': 'c',
  'Ç': 'C',
};

export interface BarcodeScanInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  existingCodes?: string[]; // Mükerrer kontrolü için mevcut listelenmiş kodlar
}

export const BarcodeScanInput: React.FC<BarcodeScanInputProps> = ({
  onScan,
  placeholder = 'Barkod veya Seri No okutunuz / yazınız...',
  autoFocus = false,
  disabled = false,
  className,
  inputClassName,
  existingCodes = [],
}) => {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanInput = (text: string): string => {
    let cleaned = text.trim();
    for (const [tr, en] of Object.entries(TURKISH_TO_EN)) {
      cleaned = cleaned.split(tr).join(en);
    }
    return cleaned;
  };

  const handleProcessCode = useCallback((raw: string) => {
    const cleaned = cleanInput(raw);
    if (!cleaned) return;

    // Mükerrer kontrolü
    if (existingCodes.some((c) => c.toUpperCase() === cleaned.toUpperCase())) {
      BeepSound.error();
      setFeedback({ type: 'error', message: `Bu kod zaten listede ekli: ${cleaned}` });
      setValue('');
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    BeepSound.success();
    setFeedback({ type: 'success', message: `Okundu: ${cleaned}` });
    onScan(cleaned);
    setValue('');
    setTimeout(() => setFeedback(null), 2000);
  }, [existingCodes, onScan]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessCode(value);
    }
  };

  return (
    <div className={cn('relative w-full text-slate-900 dark:text-white', className)}>
      <div className="relative flex items-center">
        <ScanBarcode className="w-5 h-5 text-slate-500 absolute left-3.5 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full pl-11 pr-24 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 shadow-xs disabled:opacity-50',
            inputClassName
          )}
        />
        <button
          type="button"
          disabled={!value.trim() || disabled}
          onClick={() => handleProcessCode(value)}
          className="absolute right-2 px-3 py-1.5 text-xs font-semibold bg-navy-700 text-white rounded-md hover:bg-navy-800 disabled:opacity-40 transition-colors cursor-pointer z-10"
        >
          Ekle
        </button>
      </div>

      {feedback && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs mt-1.5 font-medium animate-in fade-in slide-in-from-top-1',
            feedback.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
