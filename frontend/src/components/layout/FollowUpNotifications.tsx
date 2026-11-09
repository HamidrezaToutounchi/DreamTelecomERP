import React, { useState } from 'react';
import { Bell, Clock, Calendar, AlertTriangle, ArrowRight, User } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useInteractionsControllerGetUpcomingFollowUps } from '@/api/generated';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const FollowUpNotifications: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data: followUpsData, refetch } = useInteractionsControllerGetUpcomingFollowUps();

  const followUps = ((followUpsData as unknown) as any[]) || [];
  const overdueCount = followUps.filter((f) => f.isOverdue).length;
  const totalCount = followUps.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        title="Takip ve Randevu Bildirimleri"
      >
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs',
              overdueCount > 0 ? 'bg-red-600 animate-pulse' : 'bg-amber-500',
            )}
          >
            {totalCount}
          </span>
        )}
      </button>

      {/* Açılır Bildirim Paneli */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-4 shadow-xl z-50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                <span className="text-xs font-bold text-foreground">Görüşme & Takip Bildirimleri</span>
              </div>
              {overdueCount > 0 && (
                <span className="text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {overdueCount} Gecikmiş
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {followUps.length > 0 ? (
                followUps.map((item) => {
                  const targetName = item.customer?.companyName || item.lead?.companyName || 'Müşteri';
                  const contactPerson = item.customer?.contactPerson || item.lead?.contactName || item.contactedPerson;
                  const phone = item.customer?.phone || item.lead?.phone;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-2.5 rounded-lg text-xs space-y-1 transition-colors',
                        item.isOverdue
                          ? 'bg-red-50/60 dark:bg-red-950/20 border-l-2 border-red-500'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">{targetName}</span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold font-mono shrink-0',
                            item.isOverdue ? 'text-red-600 font-bold' : 'text-amber-600',
                          )}
                        >
                          {formatDate(item.nextFollowUpDate, 'dd.MM HH:mm')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Yetkili: {contactPerson}</span>
                        {phone && <span className="font-mono">{phone}</span>}
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 italic">
                        "{item.summary}"
                      </p>

                      <div className="pt-1 flex justify-end">
                        {item.customerId ? (
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: item.customerId }}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-navy-600 dark:text-navy-400 font-bold flex items-center gap-1 hover:underline"
                          >
                            Müşteri Kartına Git <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : item.leadId ? (
                          <Link
                            to="/leads/$leadId"
                            params={{ leadId: item.leadId }}
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 hover:underline"
                          >
                            Görüşme Sayfasına Git <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            to="/leads"
                            onClick={() => setOpen(false)}
                            className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 hover:underline"
                          >
                            Lead Listesinde Gör <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Yaklaşan veya gecikmiş bir takip randevusu bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
