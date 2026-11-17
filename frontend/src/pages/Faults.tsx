import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  ShieldCheck,
  ShieldAlert,
  Building2,
  User,
  Phone,
  Barcode,
  RefreshCw,
  X,
  Laptop,
  Check,
  Copy,
  Eye,
  Truck,
  Package,
  History,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useStockControllerFindAllFaults,
  useStockControllerFindOneFault,
  useStockControllerCreateFault,
  useStockControllerUpdateFaultStatus,
  useStockControllerLookup,
  useStockControllerSearchCustomers,
} from '@/api/generated';
import {
  FaultRecordResponseDto,
  CreateFaultRecordDtoPriority,
  UpdateFaultStatusDtoStatus,
} from '@/api/model';
import { BarcodeScanInput } from '@/components/stock/BarcodeScanInput';
import { downloadFaultPdf } from '@/lib/pdf';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  RECEIVED: { label: 'Kabul Edildi', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', text: 'text-amber-750 dark:text-amber-400' },
  IN_INSPECTION: { label: 'İncelemede', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', text: 'text-blue-750 dark:text-blue-400' },
  WAITING_PARTS: { label: 'Parça Bekliyor', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', text: 'text-purple-750 dark:text-purple-400' },
  SENT_TO_SUPPLIER: { label: 'Tedarikçiye / Distribütöre Gönderildi', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800', text: 'text-indigo-750 dark:text-indigo-400' },
  RESOLVED: { label: 'Onarıldı', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-750 dark:text-emerald-400' },
  REPLACED: { label: 'Değişim Yapıldı', bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800', text: 'text-teal-750 dark:text-teal-400' },
  SCRAPPED: { label: 'Hurdaya Ayrıldı', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800', text: 'text-rose-750 dark:text-rose-400' },
  RETURNED_TO_CUSTOMER: { label: 'Teslim Edildi', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Düşük', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
  MEDIUM: { label: 'Normal', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
  HIGH: { label: 'Yüksek', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  URGENT: { label: 'Acil', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
};

export default function Faults() {
  const queryClient = useQueryClient();
  const { can } = useAuth();

  // Liste Filtreleri
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Form Görünümü (Tam Sayfa)
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Detay & Durum Güncelleme (Tam Sayfa)
  const [detailFaultId, setDetailFaultId] = useState<string | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'audit' | 'lifecycle' | 'previous_faults'>('audit');
  const [updateStatusVal, setUpdateStatusVal] = useState<string>('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');

  // Tekil Detay Sorgusu (AuditLog, lifecycle ve previousFaults dahil)
  const {
    data: detailFaultData,
    isLoading: isDetailLoading,
    refetch: refetchDetail,
  } = useStockControllerFindOneFault(detailFaultId || '', {
    query: {
      enabled: !!detailFaultId,
    },
  });

  useEffect(() => {
    if (detailFaultData) {
      setUpdateStatusVal(detailFaultData.status);
      setTechnicianNotes(detailFaultData.technicianNotes || '');
      setResolutionSummary(detailFaultData.resolutionSummary || '');
    }
  }, [detailFaultData]);

  // Yeni Arıza Form State
  const [scannedSerialId, setScannedSerialId] = useState<string>('');
  const [matchedSerial, setMatchedSerial] = useState<any>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [priority, setPriority] = useState<CreateFaultRecordDtoPriority>(CreateFaultRecordDtoPriority.MEDIUM);
  const [reportedProblem, setReportedProblem] = useState('');

  // API Queries & Mutations
  const { data: faultsData, isLoading, refetch } = useStockControllerFindAllFaults({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== 'ALL' ? (statusFilter as any) : undefined,
    priority: priorityFilter !== 'ALL' ? (priorityFilter as any) : undefined,
  });

  const { data: customersData } = useStockControllerSearchCustomers();
  const customers = (customersData as any[]) || [];

  const createFaultMutation = useStockControllerCreateFault({
    mutation: {
      onSuccess: () => {
        toast.success('Arıza kaydı başarıyla oluşturuldu.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/faults'] });
        resetForm();
        setIsFormOpen(false);
      },
      onError: (err: any) => {
        toast.error(`Kayıt oluşturulamadı: ${err?.response?.data?.message || err?.message || 'Bilinmeyen hata'}`);
      },
    },
  });

  const updateStatusMutation = useStockControllerUpdateFaultStatus({
    mutation: {
      onSuccess: (data) => {
        toast.success(`${data.faultNumber} durumu başarıyla güncellendi.`);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/stock/faults'] });
        refetchDetail();
      },
      onError: (err: any) => {
        toast.error(`Durum güncellenemedi: ${err?.response?.data?.message || err?.message}`);
      },
    },
  });

  const resetForm = () => {
    setScannedSerialId('');
    setMatchedSerial(null);
    setSelectedCustomerId('');
    setContactPerson('');
    setContactPhone('');
    setPriority(CreateFaultRecordDtoPriority.MEDIUM);
    setReportedProblem('');
  };

  const handleSerialLookup = async (serialQuery: string) => {
    const query = serialQuery.trim();
    if (!query) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/stock/lookup?code=${encodeURIComponent(query)}&serial=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data && data.serial) {
        setMatchedSerial(data);
        setScannedSerialId(data.serial.id);

        const custId = data.serial.currentCustomerId || data.customer?.id;
        if (custId) {
          setSelectedCustomerId(custId);
        }
        if (data.customer) {
          if (data.customer.contactPerson) {
            setContactPerson(data.customer.contactPerson);
          }
          if (data.customer.phone) {
            setContactPhone(data.customer.phone);
          }
        }
        toast.success(`✓ Seri bulundu: ${data.serial.serial} (${data.product?.name || 'Ürün'})`);
      } else {
        toast.error('Seri numarası bulunamadı. Lütfen kontrol ediniz.');
        setMatchedSerial(null);
        setScannedSerialId('');
      }
    } catch (err: any) {
      toast.error('Seri no sorgulanamadı.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedSerialId) {
      toast.error('Lütfen geçerli bir seri numarası okutun veya seçin.');
      return;
    }
    if (!reportedProblem.trim()) {
      toast.error('Lütfen arıza / şikayet açıklamasını girin.');
      return;
    }

    createFaultMutation.mutate({
      data: {
        serialId: scannedSerialId,
        customerId: selectedCustomerId || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        reportedProblem: reportedProblem.trim(),
        priority,
      },
    });
  };

  const handleOpenDetail = (fault: any) => {
    setDetailFaultId(fault.id);
    setUpdateStatusVal(fault.status);
    setTechnicianNotes(fault.technicianNotes || '');
    setResolutionSummary(fault.resolutionSummary || '');
    setDetailActiveTab('audit');
  };

  const handleUpdateStatusSubmit = () => {
    if (!detailFaultId) return;
    updateStatusMutation.mutate({
      id: detailFaultId,
      data: {
        status: updateStatusVal as UpdateFaultStatusDtoStatus,
        technicianNotes: technicianNotes.trim() || undefined,
        resolutionSummary: resolutionSummary.trim() || undefined,
      },
    });
  };

  // Garanti hesaplayıcı (görsel)
  const isWarrantyActive = (dateStr?: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) >= new Date();
  };

  /* ================= TAM SAYFA: ARIZA & SERVİS İNCELEME VE GÜNCELLEME EKRANI ================= */
  if (detailFaultId) {
    const current: any = detailFaultData;

    if (isDetailLoading && !current) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setDetailFaultId(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              <span>Arıza Listesine Dön</span>
            </button>
            <div className="text-sm font-semibold text-muted-foreground">Arıza detayları yükleniyor...</div>
          </div>
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-navy-600 dark:text-navy-400" />
            <p className="text-xs text-muted-foreground">Servis kaydı, cihaz geçmişi ve işlem günlüğü yükleniyor...</p>
          </div>
        </div>
      );
    }

    if (!current) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setDetailFaultId(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              <span>Arıza Listesine Dön</span>
            </button>
          </div>
          <div className="p-12 text-center text-rose-500 font-semibold bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-800">
            Arıza kaydı bulunamadı veya silinmiş olabilir.
          </div>
        </div>
      );
    }

    const statusMeta = STATUS_LABELS[current.status] || { label: current.status, bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700' };
    const priorityMeta = PRIORITY_LABELS[current.priority] || { label: current.priority, color: 'text-slate-500 bg-slate-100' };
    const serial = current.serial;
    const customer = current.customer;

    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-150">
        {/* Üst Bar & Başlık */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3.5 flex-wrap">
            <button
              type="button"
              onClick={() => setDetailFaultId(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              <span>Arıza Listesine Dön</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-black tracking-tight text-foreground flex items-center gap-1.5">
                <Wrench className="w-5 h-5 text-amber-600" />
                {current.faultNumber}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(current.faultNumber);
                  toast.success(`Arıza No kopyalandı: ${current.faultNumber}`);
                }}
                title="Arıza numarasını kopyala"
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border', statusMeta.bg, statusMeta.text)}>
                {statusMeta.label}
              </span>

              <span className={cn('px-2 py-0.5 rounded text-xs font-bold', priorityMeta.color)}>
                Öncelik: {priorityMeta.label}
              </span>

              {current.underCustomerWarranty ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Müşteri Garantili
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Garanti Dışı
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetchDetail()}
              title="Yenile"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("w-4 h-4", isDetailLoading && "animate-spin")} />
            </button>

            <button
              type="button"
              onClick={() => downloadFaultPdf(current.id, current.faultNumber)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Servis Kabul Fişi (PDF) İndir</span>
            </button>
          </div>
        </div>

        {/* 3 Ana Bilgi Kartı */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Kart 1: Cihaz ve Garanti Bilgileri */}
          <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Cihaz & Donanım Bilgileri</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Ürün Adı & Kodu</span>
                <span className="font-bold text-foreground text-sm">
                  {serial?.product?.name || '-'}
                </span>
                <span className="font-mono text-muted-foreground ml-1.5">
                  ({serial?.product?.code || '-'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Marka</span>
                  <span className="font-semibold text-foreground">{serial?.product?.brand || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Model</span>
                  <span className="font-semibold text-foreground">{serial?.product?.model || '-'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Seri No:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-navy-600 dark:text-navy-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {serial?.serial || '-'}
                    </span>
                    {serial?.serial && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(serial.serial);
                          toast.success(`Seri no kopyalandı: ${serial.serial}`);
                        }}
                        className="p-1 text-slate-400 hover:text-foreground cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">MAC Adresi:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {serial?.macAddress || '-'}
                    </span>
                    {serial?.macAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(serial.macAddress);
                          toast.success(`MAC adresi kopyalandı: ${serial.macAddress}`);
                        }}
                        className="p-1 text-slate-400 hover:text-foreground cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Müşteri Garanti Bitiş:</span>
                  <span className="font-semibold text-foreground">
                    {serial?.customerWarrantyEnd ? formatDate(serial.customerWarrantyEnd, 'dd.MM.yyyy') : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tedarikçi Garanti Bitiş:</span>
                  <span className="font-semibold text-foreground">
                    {serial?.supplierWarrantyEnd ? formatDate(serial.supplierWarrantyEnd, 'dd.MM.yyyy') : '-'}
                  </span>
                </div>
                {serial?.supplier?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tedarikçi Firma:</span>
                    <span className="font-semibold text-foreground">{serial.supplier.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kart 2: Müşteri & İrtibat Bilgileri */}
          <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Müşteri & İrtibat Bilgileri</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Firma / Müşteri Ünvanı</span>
                <span className="font-bold text-foreground text-sm">
                  {customer?.companyName || 'Belirtilmedi (Bireysel / Cari Tanımsız)'}
                </span>
              </div>

              <div className="pt-1 space-y-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Yetkili İrtibat Kişisi</span>
                  <div className="flex items-center gap-1.5 font-semibold text-foreground mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{current.contactPerson || '-'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px]">İrtibat Telefon Numarası</span>
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {current.contactPhone ? (
                      <a href={`tel:${current.contactPhone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {current.contactPhone}
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>

                {customer?.address && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block text-[11px]">Teslimat / Adres</span>
                    <span className="text-foreground text-[11px] leading-relaxed block mt-0.5">
                      {customer.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kart 3: Servis Kabul & Problem Detayı */}
          <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Servis Kabul & Müşteri Şikayeti</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Kabul Tarihi</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(current.receivedDate, 'dd.MM.yyyy HH:mm')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Kaydı Açan</span>
                  <span className="font-semibold text-foreground">
                    {current.createdBy?.fullName || '-'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Çözülme / Kapanma Zamanı</span>
                <span className={cn("font-semibold", current.resolvedDate ? "text-emerald-600" : "text-amber-600")}>
                  {current.resolvedDate ? formatDate(current.resolvedDate, 'dd.MM.yyyy HH:mm') : 'Devam Ediyor (Açık Servis)'}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-muted-foreground block text-[11px] mb-1 font-bold">Bildirilen Problem:</span>
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 text-xs text-foreground leading-relaxed font-medium">
                  {current.reportedProblem}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Canlı Servis Durumu ve Teknisyen Müdahale Paneli */}
        <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4 text-navy-600 dark:text-navy-400" />
                <span>Servis Durumu ve Teknik Müdahale Güncelleme</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cihazın aşamasını güncelleyiniz, arıza teşhis ve yapılan onarım işlemlerini kaydediniz.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Şu anki durum:</span>
              <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border', statusMeta.bg, statusMeta.text)}>
                {statusMeta.label}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hızlı Durum Butonları */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-2">
                Servis Aşaması Seçiniz <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {[
                  { key: 'RECEIVED', label: 'Kabul Edildi', color: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' },
                  { key: 'IN_INSPECTION', label: 'İncelemede', color: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300' },
                  { key: 'WAITING_PARTS', label: 'Parça Bekliyor', color: 'border-purple-400 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300' },
                  { key: 'SENT_TO_SUPPLIER', label: 'Tedarikçi / Distribütör', color: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300' },
                  { key: 'RESOLVED', label: 'Onarıldı', color: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' },
                  { key: 'REPLACED', label: 'Değişim Yapıldı', color: 'border-teal-400 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300' },
                  { key: 'SCRAPPED', label: 'Hurdaya Ayrıldı', color: 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300' },
                  { key: 'RETURNED_TO_CUSTOMER', label: 'Müşteriye Teslim', color: 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' },
                ].map((st) => {
                  const isSelected = updateStatusVal === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setUpdateStatusVal(st.key)}
                      className={cn(
                        'p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1',
                        isSelected
                          ? cn('ring-2 ring-navy-600 shadow-sm font-black', st.color)
                          : 'border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 text-muted-foreground'
                      )}
                    >
                      <span>{st.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teknisyen İnceleme Notu */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-navy-600" />
                  <span>Teknisyen İnceleme ve Müdahale Notları</span>
                </label>
                <textarea
                  rows={3}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Teknik tespitler, voltaj ölçümleri, değiştirilen bileşenler veya parça bilgisi..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Çözüm Özeti */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nihai Çözüm ve Sonuç Özeti (Müşteri & Rapor Çıktısı)</span>
                </label>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Uygulanan kesin çözüm, teslim edilecek servis sonuç açıklaması..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none font-medium leading-relaxed"
                />
              </div>
            </div>

            {can('FAULTS', 'edit') && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleUpdateStatusSubmit}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{updateStatusMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet & Durumu Güncelle'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Geçmiş İşlemler & Yaşam Döngüsü (Timeline & Audit History) */}
        <div className="bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Tab Başlıkları */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setDetailActiveTab('audit')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap',
                detailActiveTab === 'audit'
                  ? 'border-navy-600 text-navy-600 dark:text-navy-400 bg-white dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <History className="w-4 h-4" />
              <span>Arıza İşlem & Değişiklik Günlüğü</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-foreground font-mono">
                {current.auditLogs?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDetailActiveTab('lifecycle')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap',
                detailActiveTab === 'lifecycle'
                  ? 'border-navy-600 text-navy-600 dark:text-navy-400 bg-white dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Package className="w-4 h-4" />
              <span>Cihaz Yaşam Döngüsü & Depo Giriş / Çıkış</span>
            </button>

            <button
              type="button"
              onClick={() => setDetailActiveTab('previous_faults')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap',
                detailActiveTab === 'previous_faults'
                  ? 'border-navy-600 text-navy-600 dark:text-navy-400 bg-white dark:bg-slate-800 rounded-t-lg'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Layers className="w-4 h-4" />
              <span>Cihazın Önceki Arıza Kayıtları</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700 text-foreground font-mono">
                {current.previousFaults?.length || 0}
              </span>
            </button>
          </div>

          <div className="p-6">
            {/* Tab 1: Audit Log Tarihçesi */}
            {detailActiveTab === 'audit' && (
              <div className="space-y-4">
                {(!current.auditLogs || current.auditLogs.length === 0) ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Bu arıza kaydı için henüz geçmiş işlem günlüğü bulunmamaktadır.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {current.auditLogs.map((log: any) => (
                      <div key={log.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-navy-600 ring-4 ring-card" />
                        <div className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-navy-600" />
                              {log.userName || 'Sistem Kullanıcısı'}
                              {log.userRole && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({log.userRole})
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {formatDate(log.createdAt, 'dd.MM.yyyy HH:mm:ss')}
                            </span>
                          </div>
                          <p className="text-foreground font-medium leading-relaxed pt-1">
                            {log.details || log.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Cihaz Yaşam Döngüsü */}
            {detailActiveTab === 'lifecycle' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Giriş Bilgisi */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span>Depoya Giriş (Mal Kabul)</span>
                  </div>
                  {serial?.stockEntry ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fiş Numarası:</span>
                        <span className="font-mono font-bold text-foreground">{serial.stockEntry.entryNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Giriş Tarihi:</span>
                        <span className="font-semibold text-foreground">
                          {formatDate(serial.stockEntry.entryDate, 'dd.MM.yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tedarikçi:</span>
                        <span className="font-semibold text-foreground">{serial.stockEntry.supplier?.name || '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Doğrudan stok kaydı veya giriş fişi bulunamadı.</p>
                  )}
                </div>

                {/* Çıkış Bilgisi */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Truck className="w-4 h-4 text-navy-600" />
                    <span>Depodan Çıkış (Müşteri Sevkiyatı)</span>
                  </div>
                  {serial?.stockExit ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fiş Numarası:</span>
                        <span className="font-mono font-bold text-foreground">{serial.stockExit.exitNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sevkiyat Tarihi:</span>
                        <span className="font-semibold text-foreground">
                          {formatDate(serial.stockExit.exitDate, 'dd.MM.yyyy')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sevk Edilen Müşteri:</span>
                        <span className="font-semibold text-foreground">{serial.stockExit.customer?.companyName || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kargo / Takip:</span>
                        <span className="font-mono font-bold text-foreground">
                          {serial.stockExit.carrierCompany || '-'} ({serial.stockExit.trackingNumber || '-'})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Bu cihaz henüz müşteriye sevk edilmemiş veya çıkış fişi yok.</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Önceki Arıza Kayıtları */}
            {detailActiveTab === 'previous_faults' && (
              <div className="space-y-3">
                {(!current.previousFaults || current.previousFaults.length === 0) ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Bu seri numarası için sistemde daha önce açılmış başka bir servis kaydı bulunmamaktadır.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {current.previousFaults.map((pf: any) => {
                      const pfStatus = STATUS_LABELS[pf.status] || { label: pf.status, bg: 'bg-slate-100', text: 'text-slate-700' };
                      return (
                        <div
                          key={pf.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-foreground">{pf.faultNumber}</span>
                              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', pfStatus.bg, pfStatus.text)}>
                                {pfStatus.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Kabul: {formatDate(pf.receivedDate, 'dd.MM.yyyy')}
                              </span>
                              {pf.resolvedDate && (
                                <span className="text-[11px] text-emerald-600 font-semibold">
                                  Çözüldü: {formatDate(pf.resolvedDate, 'dd.MM.yyyy')}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                              <span className="font-bold text-foreground">Problem:</span> {pf.reportedProblem}
                            </p>
                            {pf.resolutionSummary && (
                              <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                                <span className="font-bold">Çözüm:</span> {pf.resolutionSummary}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenDetail(pf)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 text-xs font-semibold self-start sm:self-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Bu Kaydı İncele</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================= TAM SAYFA FORM: YENİ ARIZA KAYDI ================= */
  if (isFormOpen) {
    return (
      <div className="space-y-6">
        {/* Üst Bar & Geri Dön Butonu */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Arıza Listesine Dön
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Yeni Arıza & Servis Kaydı Aç
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cihaz kabulü, arıza bildirimi ve otomatik garanti kontrolü.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Kolon: Seri Arama & Cihaz Bilgisi (2 span) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Seri Numarası Okut / Ara */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-blue-600" />
                1. Seri Numarası Okut / Ara (Zebra Barkod Uyumlu)
              </h2>

              <div className="max-w-xl">
                <BarcodeScanInput
                  placeholder="Seri no veya barkod okutun (Enter'a basın)..."
                  onScan={(code) => handleSerialLookup(code)}
                />
              </div>

              {/* Matched Serial Card */}
              {matchedSerial ? (
                <div className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-blue-900 dark:text-blue-200">
                          {matchedSerial.serial?.serial}
                        </span>
                        {matchedSerial.serial?.macAddress && (
                          <span className="text-xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-slate-600 dark:text-slate-300">
                            MAC: {matchedSerial.serial.macAddress}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        {matchedSerial.product?.name} ({matchedSerial.product?.code})
                      </p>
                      <p className="text-xs text-slate-500">
                        Marka: {matchedSerial.product?.brand || '-'} | Model: {matchedSerial.product?.model || '-'}
                      </p>
                    </div>

                    {/* Garanti Rozetleri */}
                    <div className="flex flex-col items-end gap-1.5">
                      {isWarrantyActive(matchedSerial.serial?.customerWarrantyEnd) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Müşteri Garantili (Bitiş: {new Date(matchedSerial.serial.customerWarrantyEnd).toLocaleDateString('tr-TR')})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Müşteri Garanti Dışı
                        </span>
                      )}

                      {matchedSerial.serial?.supplierWarrantyEnd && (
                        <span className="text-[11px] text-slate-500">
                          Tedarikçi Garantisi: {new Date(matchedSerial.serial.supplierWarrantyEnd).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-center text-xs text-slate-500">
                  Cihazın üzerindeki seri numarasını barkod okuyucuyla okutun veya elle yazıp Enter tuşuna basın.
                </div>
              )}
            </div>

            {/* Arıza Açıklaması & Şikayet */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                2. Bildirilen Arıza ve Müşteri Şikayeti
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Arıza Açıklaması <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reportedProblem}
                  onChange={(e) => setReportedProblem(e.target.value)}
                  placeholder="Müşterinin belirttiği arızayı, cihazın verdiği hata veya ışık durumunu detaylı yazın..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Öncelik Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Öncelik Seviyesi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as CreateFaultRecordDtoPriority[]).map((p) => {
                    const isSelected = priority === p;
                    const meta = PRIORITY_LABELS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center flex items-center justify-center gap-1.5',
                          isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Müşteri & İletişim Bilgileri (1 span) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                3. Müşteri & İrtibat
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Müşteri / Kurum
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçilmedi (Cihaz Sahibi Bilinmiyor)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Seri no önceden bir müşteriye sevk edilmişse otomatik doldurulur.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  İrtibat Kişisi / Teslim Eden
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Ad Soyad"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  İrtibat Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0532 ..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Kaydet Butonu */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-3">
              <button
                type="submit"
                disabled={createFaultMutation.isPending || !scannedSerialId}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                {createFaultMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Arıza Kaydını Aç
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(false);
                }}
                className="w-full py-2 px-4 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              >
                İptal Et
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  /* ================= LİSTE GÖRÜNÜMÜ ================= */
  const items = faultsData?.items || [];
  const totalCount = faultsData?.total || 0;
  const totalPages = faultsData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Üst Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            Arıza & Servis Yönetimi (RMA)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Arıza bildirimleri, servis süreçleri, garanti takibi ve resmi servis teslim tutanakları.
          </p>
        </div>

        {can('FAULTS', 'create') && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Arıza Kaydı
          </button>
        )}
      </div>

      {/* Filtre Barı */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Arama */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Arıza no, seri no, ürün veya müşteri ara..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Durum Filtresi */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="RECEIVED">Kabul Edildi</option>
              <option value="IN_INSPECTION">İncelemede</option>
              <option value="WAITING_PARTS">Parça Bekliyor</option>
              <option value="SENT_TO_SUPPLIER">Distribütöre / Tedarikçiye Gönderildi</option>
              <option value="RESOLVED">Onarıldı</option>
              <option value="REPLACED">Değişim Yapıldı</option>
              <option value="SCRAPPED">Hurdaya Ayrıldı</option>
              <option value="RETURNED_TO_CUSTOMER">Teslim Edildi</option>
            </select>
          </div>

          {/* Öncelik Filtresi */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tüm Öncelikler</option>
              <option value="LOW">Düşük</option>
              <option value="MEDIUM">Normal</option>
              <option value="HIGH">Yüksek</option>
              <option value="URGENT">Acil</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Arıza No</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Seri No & MAC</th>
                <th className="px-4 py-3">Ürün / Model</th>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Garanti</th>
                <th className="px-4 py-3">Öncelik</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Arıza kayıtları yükleniyor...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const statusMeta = STATUS_LABELS[row.status] || {
                    label: row.status,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                  };
                  const priorityMeta = PRIORITY_LABELS[row.priority] || {
                    label: row.priority,
                    color: 'text-slate-500 bg-slate-100',
                  };

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                        {row.faultNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(row.receivedDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {row.serial?.serial || row.serial?.serialNumber || '-'}
                        </div>
                        {row.serial?.macAddress && (
                          <div className="font-mono text-[11px] text-slate-400">
                            {row.serial.macAddress}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {row.serial?.product?.name || '-'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {row.serial?.product?.brand || '-'} {row.serial?.product?.model ? `/ ${row.serial.product.model}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {row.customer?.companyName || 'Belirtilmedi'}
                        </div>
                        {row.contactPerson && (
                          <div className="text-xs text-slate-400">{row.contactPerson}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.underCustomerWarranty ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            Garantili
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Garanti Dışı
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-semibold',
                            priorityMeta.color
                          )}
                        >
                          {priorityMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                            statusMeta.bg,
                            statusMeta.text
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Servis Fişi PDF */}
                          <button
                            type="button"
                            onClick={() => downloadFaultPdf(row.id, row.faultNumber)}
                            title="Servis Kabul Fişi (PDF) İndir"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                          </button>

                          {/* İncele */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border border-navy-200 dark:border-navy-800 bg-navy-50 hover:bg-navy-100 text-navy-800 dark:bg-navy-950 dark:hover:bg-navy-900 dark:text-navy-300 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>İncele</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div>Toplam {totalCount} kayıt</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Önceki
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
