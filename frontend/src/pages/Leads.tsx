import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  PaginationState,
  SortingState,
} from '@tanstack/react-table';
import {
  Target,
  Upload,
  Plus,
  Search,
  Phone,
  Mail,
  Building,
  User,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  MessageSquare,
  Video,
  Smartphone,
  StickyNote,
  History,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import axios from 'axios';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLeadsControllerFindAll,
  useLeadsControllerCreate,
  useLeadsControllerUpdate,
  useLeadsControllerQuickAction,
  useLeadsControllerImportExcel,
  useUsersControllerFindAll,
  useCustomersControllerCreate,
  useInteractionsControllerFindAll,
} from '@/api/generated';
import { QuickActionLeadDtoStatus, QuickActionLeadDtoType } from '@/api/model';
import { useAuth } from '@/context/AuthContext';
import { DataTable } from '@/components/common/DataTable';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { ConvertToCustomerModal } from '@/components/leads/ConvertToCustomerModal';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { validatePhone, validateEmail } from '@/lib/validators';

export const LeadsPage: React.FC = () => {
  const { user, isManager } = useAuth();
  const queryClient = useQueryClient();

  // Table State
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quickActionLead, setQuickActionLead] = useState<any | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<any | null>(null);

  // Quick Action Form State
  const [qaStatus, setQaStatus] = useState<QuickActionLeadDtoStatus>(QuickActionLeadDtoStatus.CALLED_REACHED);
  const [qaType, setQaType] = useState<QuickActionLeadDtoType>(QuickActionLeadDtoType.PHONE_CALL);
  const [qaSummary, setQaSummary] = useState('');
  const [qaNextFollowUpDate, setQaNextFollowUpDate] = useState('');

  // Queries & Mutations
  const { data: leadsResponse, isLoading } = useLeadsControllerFindAll({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    sortBy: sorting[0]?.id || 'createdAt',
    sortOrder: sorting[0]?.desc ? 'desc' : 'asc',
  });

  const { data: reps } = useUsersControllerFindAll(
    { role: 'SALES_REP' },
    { query: { enabled: isManager } },
  );

  const createMutation = useLeadsControllerCreate();
  const updateLeadMutation = useLeadsControllerUpdate();
  const quickActionMutation = useLeadsControllerQuickAction();
  const importExcelMutation = useLeadsControllerImportExcel();
  const convertToCustomerMutation = useCustomersControllerCreate();

  // Lead timeline query for the modal
  const { data: leadInteractionsResponse, refetch: refetchTimeline } = useInteractionsControllerFindAll(
    { leadId: quickActionLead?.id, pageSize: 20 },
    { query: { enabled: !!quickActionLead?.id } },
  );

  const openQuickAction = (lead: any) => {
    setQuickActionLead(lead);
    setQaStatus(
      (lead.status as QuickActionLeadDtoStatus) || QuickActionLeadDtoStatus.CALLED_REACHED,
    );
    setQaType(QuickActionLeadDtoType.PHONE_CALL);
    setQaSummary('');
    setQaNextFollowUpDate(
      lead.nextFollowUpDate
        ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 16)
        : '',
    );
  };

  // Columns definition
  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'companyName',
        header: 'Firma & Yetkili',
        cell: ({ row }) => (
          <div>
            <Link
              to="/leads/$leadId"
              params={{ leadId: row.original.id }}
              className="font-bold text-navy-700 hover:text-navy-900 dark:text-navy-400 dark:hover:text-navy-200 block hover:underline"
            >
              {row.original.companyName}
            </Link>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-slate-400" />
              {row.original.contactName}
            </span>
            {row.original.nextFollowUpDate && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Sonraki Takip: {formatDate(row.original.nextFollowUpDate, 'dd.MM.yyyy HH:mm')}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'İletişim',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-1 font-mono font-medium text-slate-800 dark:text-slate-200">
              <Phone className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              {row.original.phone}
            </div>
            {row.original.email && (
              <div className="flex items-center gap-1 text-muted-foreground truncate max-w-[180px]">
                <Mail className="w-3 h-3" />
                {row.original.email}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Durum Sembolü',
        cell: ({ row }) => <LeadStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'source',
        header: 'Kaynak',
        cell: ({ row }) => (
          <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {row.original.source}
          </span>
        ),
      },
      ...(isManager
        ? [
            {
              accessorKey: 'assignedTo.fullName',
              header: 'Atanan Temsilci',
              cell: ({ row }: any) => {
                const currentRepId = row.original.assignedToId || '';
                return (
                  <select
                    value={currentRepId}
                    onChange={async (e) => {
                      const newRepId = e.target.value;
                      if (!newRepId || newRepId === currentRepId) return;
                      try {
                        await updateLeadMutation.mutateAsync({
                          id: row.original.id,
                          data: { assignedToId: newRepId },
                        });
                        toast.success('Lead temsilcisi güncellendi.');
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
                      } catch {
                        toast.error('Temsilci güncellenemedi.');
                      }
                    }}
                    className="h-7 px-2 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-background text-foreground cursor-pointer hover:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
                    title="Temsilciyi değiştirmek için seçin"
                  >
                    <option value="" disabled>Temsilci Ata...</option>
                    {(reps || []).map((rep: any) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName}
                      </option>
                    ))}
                  </select>
                );
              },
            },
          ]
        : []),
      {
        accessorKey: 'createdAt',
        header: 'Tarih',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt, 'dd.MM.yyyy')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'İşlem',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Link
              to="/leads/$leadId"
              params={{ leadId: row.original.id }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-700 hover:bg-navy-800 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              title="Ayrı Görüşme & Detay Sayfasını Aç"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Görüşme Sayfası
            </Link>

            <button
              type="button"
              onClick={() => openQuickAction(row.original)}
              className="p-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Hızlı Açılır Not Penceresi"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [isManager],
  );

  const table = useReactTable({
    data: leadsResponse?.data || [],
    columns,
    pageCount: leadsResponse?.meta?.totalPages || 1,
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

  // Excel Dağıtım Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [strategy, setStrategy] = useState<'ROUND_ROBIN' | 'MANUAL_SPLIT'>('ROUND_ROBIN');
  const [selectedReps, setSelectedReps] = useState<string[]>([]);
  const [manualSplitData, setManualSplitData] = useState<Record<string, number>>({});
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/leads/excel-template', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead_yukleme_taslagi.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel şablonu başarıyla indirildi.');
    } catch {
      toast.error('Şablon indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Lütfen bir Excel (.xlsx) dosyası seçin.');
      return;
    }

    try {
      const repIdsParam = selectedReps.length > 0 ? JSON.stringify(selectedReps) : undefined;
      const manualSplitParam =
        strategy === 'MANUAL_SPLIT'
          ? JSON.stringify(
              Object.entries(manualSplitData)
                .filter(([_, count]) => count > 0)
                .map(([repId, count]) => ({ repId, count })),
            )
          : undefined;

      await importExcelMutation.mutateAsync({
        data: {
          file: selectedFile,
          strategy,
          repIds: repIdsParam,
          manualSplit: manualSplitParam,
        },
      });

      toast.success('Excel başarıyla işlendi ve temsilcilere dağıtıldı!');
      setExcelModalOpen(false);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Excel import işlemi başarısız oldu.');
    }
  };

  // Yeni Lead Ekleme State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAssignedRep, setNewAssignedRep] = useState('');

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      toast.error('Firma adı zorunludur.');
      return;
    }

    const phoneValidation = validatePhone(newPhone);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.message || 'Geçerli bir telefon numarası giriniz.');
      return;
    }

    if (newEmail.trim()) {
      const emailValidation = validateEmail(newEmail);
      if (!emailValidation.isValid) {
        toast.error(emailValidation.message || 'Geçerli bir e-posta adresi giriniz.');
        return;
      }
    }

    try {
      await createMutation.mutateAsync({
        data: {
          companyName: newCompanyName.trim(),
          contactName: (newContactName.trim()) || newCompanyName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim() || undefined,
          notes: newNotes.trim() || undefined,
          assignedToId: isManager && newAssignedRep ? newAssignedRep : undefined,
        },
      });

      toast.success('Yeni lead oluşturuldu.');
      setCreateModalOpen(false);
      setNewCompanyName('');
      setNewContactName('');
      setNewPhone('');
      setNewEmail('');
      setNewNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Oluşturulamadı.');
    }
  };

  // Hızlı İşlem & Not Kaydetme (Görüşme Kaydı + Durum Güncelleme + Bildirim Tarihi)
  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickActionLead) return;

    if (!qaSummary.trim()) {
      toast.error('Lütfen görüşme notu veya özetini giriniz.');
      return;
    }

    try {
      await quickActionMutation.mutateAsync({
        id: quickActionLead.id,
        data: {
          status: qaStatus,
          type: qaType,
          summary: qaSummary.trim(),
          nextFollowUpDate: qaNextFollowUpDate ? new Date(qaNextFollowUpDate).toISOString() : undefined,
        },
      });

      toast.success('Görüşme notu kaydedildi ve lead güncellendi.');
      setQuickActionLead(null);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/interactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/interactions/upcoming-followups'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem kaydedilemedi.');
    }
  };

  // Müşteriye Dönüştürme Modalı Açılışı
  const handleOpenConvertToCustomer = () => {
    if (!quickActionLead) return;
    setConvertModalLead(quickActionLead);
    setQuickActionLead(null);
  };

  const channelIcons: Record<string, any> = {
    PHONE_CALL: Phone,
    IN_PERSON_MEETING: Building,
    ONLINE_MEETING: Video,
    WHATSAPP: Smartphone,
    EMAIL: Mail,
    NOTE: StickyNote,
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Aksiyonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Potansiyel Müşteriler (Leads)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Saha ve pazarlama kanallarından gelen aday müşteriler, görüşme notları ve takip planı.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10 disabled:opacity-50"
                title="Toplu lead yüklemek için hazır Excel şablonunu indirin"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{isDownloadingTemplate ? 'İndiriliyor...' : 'Excel Şablonu İndir'}</span>
              </button>

              <button
                type="button"
                onClick={() => setExcelModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
              >
                <Upload className="w-4 h-4" />
                Excel ile Dağıt
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
          >
            <Plus className="w-4 h-4" />
            Yeni Lead Ekle
          </button>
        </div>
      </div>

      {/* Arama ve Durum Filtreleri */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Firma adı, yetkili veya telefon ara..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground cursor-pointer"
        >
          <option value="">Tüm Durumlar</option>
          <option value="NEW">Yeni (İşlem Yapılmadı)</option>
          <option value="CALLED_NO_ANSWER">Arandı - Ulaşılamadı</option>
          <option value="CALLED_REACHED">Arandı - Görüşüldü</option>
          <option value="MEETING_SCHEDULED">Toplantı Planlandı</option>
          <option value="MEETING_DONE">Görüşme Yapıldı</option>
          <option value="CONVERTED">Müşteriye Dönüştü</option>
          <option value="LOST">Kaybedildi / İlgisiz</option>
        </select>
      </div>

      {/* TanStack Table */}
      <DataTable
        table={table}
        isLoading={isLoading}
        totalRowCount={leadsResponse?.meta?.totalRowCount}
      />

      {/* ================= MODAL: HIZLI İŞLEM, NOT & ZAMAN TÜNELİ ================= */}
      {quickActionLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            {/* Modal Başlığı */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                  Hızlı Görüşme & İşlem: {quickActionLead.companyName}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Yetkili: <strong className="text-foreground">{quickActionLead.contactName}</strong> &bull; Tel: <span className="font-mono">{quickActionLead.phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickActionLead(null)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickAction} className="space-y-4">
              {/* Durum Seçimi */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Yeni Lead Durumu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: QuickActionLeadDtoStatus.CALLED_REACHED, label: 'Arandı - Görüşüldü', color: 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300' },
                    { key: QuickActionLeadDtoStatus.CALLED_NO_ANSWER, label: 'Arandı - Ulaşılamadı', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' },
                    { key: QuickActionLeadDtoStatus.MEETING_SCHEDULED, label: 'Toplantı Planlandı', color: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300' },
                    { key: QuickActionLeadDtoStatus.MEETING_DONE, label: 'Görüşme Yapıldı', color: 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300' },
                    { key: QuickActionLeadDtoStatus.LOST, label: 'Kaybedildi / İlgisiz', color: 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300' },
                    { key: QuickActionLeadDtoStatus.NEW, label: 'Yeni (Beklemede)', color: 'border-slate-400 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setQaStatus(item.key)}
                      className={cn(
                        'p-2 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer',
                        qaStatus === item.key
                          ? `${item.color} ring-2 ring-navy-600`
                          : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temsilci Değiştirme (Yalnızca Yönetici) */}
              {isManager && (
                <div className="p-3 bg-navy-50/60 dark:bg-navy-950/40 rounded-xl border border-navy-200/80 dark:border-navy-900 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Atanan Satış Temsilcisi</span>
                    <span className="text-[11px] text-muted-foreground">Leadi başka bir temsilciye aktarabilirsiniz.</span>
                  </div>
                  <select
                    value={quickActionLead?.assignedToId || ''}
                    onChange={async (e) => {
                      const newRepId = e.target.value;
                      if (!newRepId || newRepId === quickActionLead?.assignedToId) return;
                      try {
                        await updateLeadMutation.mutateAsync({
                          id: quickActionLead.id,
                          data: { assignedToId: newRepId },
                        });
                        setQuickActionLead({ ...quickActionLead, assignedToId: newRepId });
                        toast.success('Lead temsilcisi güncellendi.');
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
                      } catch {
                        toast.error('Temsilci güncellenemedi.');
                      }
                    }}
                    className="h-8 px-2.5 rounded-lg border border-navy-300 dark:border-navy-700 bg-background text-xs font-semibold cursor-pointer"
                  >
                    <option value="" disabled>Temsilci Seç...</option>
                    {(reps || []).map((rep: any) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Temas Kanalı ve Sonraki Takip Tarihi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    İletişim Kanalı
                  </label>
                  <select
                    value={qaType}
                    onChange={(e) => setQaType(e.target.value as QuickActionLeadDtoType)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                  >
                    <option value={QuickActionLeadDtoType.PHONE_CALL}>Telefon Görüşmesi</option>
                    <option value={QuickActionLeadDtoType.IN_PERSON_MEETING}>Yüz Yüze Ziyaret</option>
                    <option value={QuickActionLeadDtoType.ONLINE_MEETING}>Online Toplantı (Zoom/Meet)</option>
                    <option value={QuickActionLeadDtoType.WHATSAPP}>WhatsApp / Mesaj</option>
                    <option value={QuickActionLeadDtoType.EMAIL}>E-posta</option>
                    <option value={QuickActionLeadDtoType.NOTE}>Hızlı Not / Hatırlatma</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Sonraki Takip / Randevu (Bildirim Kurulur)
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={qaNextFollowUpDate}
                      onChange={(e) => setQaNextFollowUpDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Görüşme Notu (Textarea) */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Görüşme Notu & Özet <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={qaSummary}
                  onChange={(e) => setQaSummary(e.target.value)}
                  placeholder="Görüşmede ne konuşuldu? İlgilendiği ürün/hizmet paketleri, internet hızı veya teklif talebi..."
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:ring-2 focus:ring-navy-600 focus:outline-hidden"
                />
              </div>

              {/* Butonlar: Kaydet & Müşteriye Dönüştür */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleOpenConvertToCustomer}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-950 border border-green-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <CheckCircle className="w-4 h-4 text-green-700" />
                  Müşteriye Dönüştür (Resmi Müşteri Kartı Aç)
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setQuickActionLead(null)}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={quickActionMutation.isPending}
                    className="px-5 py-2.5 rounded-lg bg-navy-700 hover:bg-navy-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {quickActionMutation.isPending ? 'Kaydediliyor...' : 'İşlem & Notu Kaydet'}
                  </button>
                </div>
              </div>
            </form>

            {/* Zaman Tüneli: Önceki Temas Geçmişi */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
                <History className="w-4 h-4 text-teal-600" />
                Bu Lead İle Temas Geçmişi ({((leadInteractionsResponse as any)?.data || []).length})
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {((leadInteractionsResponse as any)?.data || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Henüz kayıtlı bir görüşme veya temas geçmişi bulunmuyor.
                  </p>
                ) : (
                  ((leadInteractionsResponse as any)?.data || []).map((interaction: any) => {
                    const Icon = channelIcons[interaction.type] || MessageSquare;
                    return (
                      <div
                        key={interaction.id}
                        className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-navy-700 dark:text-navy-400" />
                            {interaction.contactedPerson || quickActionLead.contactName}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {formatDate(interaction.createdAt, 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {interaction.summary}
                        </p>
                        {interaction.nextFollowUpDate && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold font-mono pt-0.5">
                            <Clock className="w-3 h-3" />
                            Takip Planı: {formatDate(interaction.nextFollowUpDate, 'dd.MM.yyyy HH:mm')}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXCEL DAĞITIM (MÜDÜR) ================= */}
      {excelModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Upload className="w-5 h-5 text-teal-600" />
                  Excel ile Toplu Lead Yükle & Dağıt
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Yüklenen listedeki firmalar satış temsilcilerine atanır ve anında canlı socket.io bildirimi fırlatılır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExcelModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Şablon İndirme Kartı */}
            <div className="flex items-center justify-between p-3.5 bg-navy-50/70 dark:bg-navy-950/40 rounded-xl border border-navy-200/80 dark:border-navy-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-navy-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Örnek Excel Taslağı</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Format hatası yaşamamak için hazır şablonu indirin.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-navy-300 dark:border-navy-700 text-navy-800 dark:text-navy-200 rounded-lg text-xs font-bold hover:bg-navy-100 dark:hover:bg-navy-900/60 transition-colors shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-navy-700 dark:text-navy-300" />
                {isDownloadingTemplate ? 'İndiriliyor...' : 'Taslağı İndir (.xlsx)'}
              </button>
            </div>

            <form onSubmit={handleExcelImport} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center cursor-pointer hover:border-teal-500 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100 cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Desteklenen format: .xlsx (Sütunlar: <b>Firma Adı *</b>, <b>Yetkili Kişi</b>, <b>Telefon *</b>, <b>E-posta</b>, <b>Kaynak</b>, <b>Notlar</b>)
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground block">Dağıtım Motoru Stratejisi:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                      strategy === 'ROUND_ROBIN'
                        ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950/40 dark:text-navy-200'
                        : 'border-slate-200 dark:border-slate-700 text-muted-foreground',
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="ROUND_ROBIN"
                      checked={strategy === 'ROUND_ROBIN'}
                      onChange={() => setStrategy('ROUND_ROBIN')}
                      className="hidden"
                    />
                    <span>Eşit Dağıt (Round-Robin)</span>
                  </label>

                  <label
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                      strategy === 'MANUAL_SPLIT'
                        ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950/40 dark:text-navy-200'
                        : 'border-slate-200 dark:border-slate-700 text-muted-foreground',
                    )}
                  >
                    <input
                      type="radio"
                      name="strategy"
                      value="MANUAL_SPLIT"
                      checked={strategy === 'MANUAL_SPLIT'}
                      onChange={() => setStrategy('MANUAL_SPLIT')}
                      className="hidden"
                    />
                    <span>Kota / Adet Bazlı Dağıt</span>
                  </label>
                </div>
              </div>

              {strategy === 'ROUND_ROBIN' && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Dağıtılacak Temsilciler (Boş bırakılırsa tüm aktif temsilcilere eşit dağıtılır):
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    {(reps || []).map((rep) => (
                      <label key={rep.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selectedReps.includes(rep.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReps([...selectedReps, rep.id]);
                            else setSelectedReps(selectedReps.filter((id) => id !== rep.id));
                          }}
                        />
                        <span className="font-medium text-foreground">{rep.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {strategy === 'MANUAL_SPLIT' && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Her Temsilciye Atanacak Adet:
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    {(reps || []).map((rep) => (
                      <div key={rep.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium text-foreground truncate">{rep.fullName}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Adet"
                          value={manualSplitData[rep.id] || ''}
                          onChange={(e) =>
                            setManualSplitData({
                              ...manualSplitData,
                              [rep.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-20 h-8 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-right"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExcelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={importExcelMutation.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {importExcelMutation.isPending ? 'Dağıtılıyor...' : 'Yükle & Dağıt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: YENİ LEAD EKLE ================= */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Yeni Potansiyel Müşteri Ekle</h3>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Firma Adı *</label>
                <input
                  type="text"
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Örn: Akın Teknoloji A.Ş."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Yetkili Kişi</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Örn: Selin Yılmaz"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Telefon *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05xx xxx xx xx"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">E-posta</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="info@firma.com"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {isManager && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Atanacak Temsilci</label>
                  <select
                    value={newAssignedRep}
                    onChange={(e) => setNewAssignedRep(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="">Kendime Ata veya Varsayılan</option>
                    {(reps || []).map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Görüşme Notları</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="İhtiyaç duyulan internet hızı, santral veya dark fiber talepleri..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MÜŞTERİYE DÖNÜŞTÜR (ADRES & VERGİ NO ZORUNLU) ================= */}
      <ConvertToCustomerModal
        isOpen={!!convertModalLead}
        onClose={() => setConvertModalLead(null)}
        lead={convertModalLead}
      />
    </div>
  );
};
