import React, { useState } from 'react';
import {
  flexRender,
  Table as TableInstance,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DreamBarsIllustration } from './DreamLogo';

export type TableDensity = 'comfortable' | 'compact';

interface DataTableProps<TData> {
  table: TableInstance<TData>;
  isLoading?: boolean;
  totalRowCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<TData>({
  table,
  isLoading = false,
  totalRowCount,
  emptyMessage = 'Gösterilecek kayıt bulunamadı.',
  className,
}: DataTableProps<TData>) {
  const [density, setDensity] = useState<TableDensity>('comfortable');

  const paddingClass = density === 'compact' ? 'py-2 px-3 text-xs' : 'py-3.5 px-4 text-sm';
  const headerPadding = density === 'compact' ? 'py-2 px-3 text-xs' : 'py-3 px-4 text-xs';

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      {/* Üst Araç Çubuğu: Yoğunluk Seçici */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-muted-foreground font-medium">
          Toplam <span className="font-semibold text-foreground">{totalRowCount ?? table.getRowCount()}</span> kayıt
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setDensity('comfortable')}
            title="Rahat Satır Görünümü"
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
              density === 'comfortable'
                ? 'bg-white dark:bg-slate-900 text-navy-700 dark:text-navy-300 shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Rahat
          </button>
          <button
            type="button"
            onClick={() => setDensity('compact')}
            title="Sıkı Satır Görünümü"
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
              density === 'compact'
                ? 'bg-white dark:bg-slate-900 text-navy-700 dark:text-navy-300 shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Sıkı
          </button>
        </div>
      </div>

      {/* Tablo Konteyneri */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-muted-foreground font-semibold">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={cn(headerPadding, 'select-none whitespace-nowrap')}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              canSort && 'cursor-pointer hover:text-foreground transition-colors',
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              <span className="shrink-0 text-slate-400">
                                {isSorted === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
                                ) : isSorted === 'desc' ? (
                                  <ArrowDown className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-7 h-7 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Veriler yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={cn(paddingClass, 'align-middle')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <DreamBarsIllustration className="w-16 h-16 opacity-40 mb-1" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {emptyMessage}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Arama veya filtre kriterlerinizi değiştirmeyi deneyebilirsiniz.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama Altlığı */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Sayfa Başına:</span>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-foreground cursor-pointer"
            >
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Sayfa <strong className="text-foreground">{table.getState().pagination.pageIndex + 1}</strong> /{' '}
              {Math.max(1, table.getPageCount())}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
