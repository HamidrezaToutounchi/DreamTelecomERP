import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  ShieldAlert,
  Search,
  Filter,
  User,
  Calendar,
  Activity,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  LogIn,
  Layers,
  Database,
} from 'lucide-react';
import { useAuditLogsControllerFindAll, useUsersControllerFindAll } from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const AuditLogsPage: React.FC = () => {
  const { isManager } = useAuth();

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Kullanıcı listesi (filtreleme için)
  const { data: usersData } = useUsersControllerFindAll(undefined, {
    query: { enabled: isManager },
  });
  const users = (usersData as any) || [];

  // Audit Logs sorgusu
  const { data: logsResponse, isLoading, refetch, isFetching } = useAuditLogsControllerFindAll(
    {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: search || undefined,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
      userId: userFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy: sorting[0]?.id || 'createdAt',
      sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
    },
    { query: { enabled: isManager } },
  );

  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return {
          label: 'Yeni Kayıt',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        };
      case 'UPDATE':
        return {
          label: 'Güncelleme',
          className: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        };
      case 'REASSIGN':
        return {
          label: 'Temsilci Ataması',
          className: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        };
      case 'CONVERT':
        return {
          label: 'Dönüştürme / Satış',
          className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        };
      case 'STATUS_CHANGE':
        return {
          label: 'Durum Değişikliği',
          className: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        };
      case 'LOGIN':
        return {
          label: 'Giriş Yapıldı',
          className: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
        };
      case 'IMPORT':
        return {
          label: 'Excel İçe Aktarma',
          className: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
        };
      case 'DELETE':
        return {
          label: 'Silme',
          className: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        };
      default:
        return {
          label: action,
          className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
        };
    }
  };

  const getEntityBadge = (entity: string) => {
    switch (entity.toUpperCase()) {
      case 'LEAD':
        return { label: 'Potansiyel (Lead)', color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/30' };
      case 'CUSTOMER':
        return { label: 'Müşteri', color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30' };
      case 'QUOTE':
        return { label: 'Teklif', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30' };
      case 'SALE':
        return { label: 'Satış & Sipariş', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' };
      case 'PRODUCT':
        return { label: 'Katalog Ürün', color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/30' };
      case 'AUTH':
        return { label: 'Oturum / Giriş', color: 'text-teal-700 bg-teal-50 dark:bg-teal-950/30' };
      case 'USER':
        return { label: 'Kullanıcı', color: 'text-slate-700 bg-slate-100 dark:bg-slate-800' };
      default:
        return { label: entity, color: 'text-slate-600 bg-slate-50' };
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Tarih & Saat',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground font-mono">
              {formatDate(row.original.createdAt, 'dd.MM.yyyy')}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {formatDate(row.original.createdAt, 'HH:mm:ss')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'userName',
        header: 'Kullanıcı',
        cell: ({ row }) => {
          const name = row.original.userName || row.original.user?.fullName || 'Sistem / Anonim';
          const email = row.original.userEmail || row.original.user?.email || '-';
          const role = row.original.userRole || row.original.user?.role;
          const isManagerUser = role === 'SALES_MANAGER';

          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">{name}</span>
                {role && (
                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.2 rounded border',
                      isManagerUser
                        ? 'bg-navy-50 text-navy-800 border-navy-200 dark:bg-navy-950 dark:text-navy-300 dark:border-navy-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
                    )}
                  >
                    {isManagerUser ? 'Müdür' : 'Temsilci'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{email}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'action',
        header: 'İşlem Türü',
        cell: ({ row }) => {
          const badge = getActionBadge(row.original.action);
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border',
                badge.className,
              )}
            >
              {badge.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'entity',
        header: 'Modül',
        cell: ({ row }) => {
          const badge = getEntityBadge(row.original.entity);
          return (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
                badge.color,
              )}
            >
              {badge.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'details',
        header: 'İşlem Açıklaması & Detayı',
        cell: ({ row }) => (
          <div className="text-xs text-foreground font-medium max-w-lg leading-relaxed whitespace-pre-line">
            {row.original.details || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'entityId',
        header: 'Kayıt ID',
        cell: ({ row }) => (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px] block" title={row.original.entityId}>
            {row.original.entityId ? row.original.entityId.slice(0, 8) + '...' : '-'}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: (logsResponse as any)?.data || [],
    columns,
    pageCount: (logsResponse as any)?.meta?.totalPages || 1,
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!isManager) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-slate-200 dark:border-slate-800">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-foreground">Yetkisiz Erişim</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Kullanıcı işlem loglarını yalnızca Satış Müdürleri görüntüleyebilir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Kullanıcı İşlem & Aktivite Günlüğü (Audit Log)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tüm kullanıcıların sistemde gerçekleştirdiği ekleme, güncelleme, devir, teklif ve giriş hareketleri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filtreleme Çubuğu */}
      <div className="p-4 bg-card rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Detaylı Filtreleme & Arama</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Arama */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Detay veya kullanıcı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
            />
          </div>

          {/* Kullanıcı Filtresi */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-medium cursor-pointer"
            >
              <option value="">Tüm Kullanıcılar</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role === 'SALES_MANAGER' ? 'Müdür' : 'Temsilci'})
                </option>
              ))}
            </select>
          </div>

          {/* Modül Filtresi */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-medium cursor-pointer"
            >
              <option value="">Tüm Modüller</option>
              <option value="LEAD">Potansiyel Müşteri (Lead)</option>
              <option value="CUSTOMER">Müşteri</option>
              <option value="QUOTE">Teklif</option>
              <option value="SALE">Satış & Sipariş</option>
              <option value="AUTH">Oturum / Giriş</option>
              <option value="PRODUCT">Katalog Ürün</option>
              <option value="USER">Kullanıcı</option>
            </select>
          </div>

          {/* İşlem Türü Filtresi */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-medium cursor-pointer"
            >
              <option value="">Tüm İşlem Türleri</option>
              <option value="CREATE">Yeni Kayıt (CREATE)</option>
              <option value="UPDATE">Güncelleme (UPDATE)</option>
              <option value="REASSIGN">Temsilci Ataması (REASSIGN)</option>
              <option value="CONVERT">Dönüştürme (CONVERT)</option>
              <option value="STATUS_CHANGE">Durum Değişikliği (STATUS_CHANGE)</option>
              <option value="LOGIN">Kullanıcı Girişi (LOGIN)</option>
              <option value="IMPORT">Excel İçe Aktar (IMPORT)</option>
            </select>
          </div>

          {/* Başlangıç Tarihi */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              title="Başlangıç Tarihi"
            />
          </div>

          {/* Bitiş Tarihi */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
              title="Bitiş Tarihi"
            />
            {(search || actionFilter || entityFilter || userFilter || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActionFilter('');
                  setEntityFilter('');
                  setUserFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="h-9 px-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Filtreleri Temizle"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tablo */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={(logsResponse as any)?.meta?.totalRowCount}
      />
    </div>
  );
};
