import React, { useState } from 'react';
import { useParams, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Target,
  Phone,
  Mail,
  User,
  Calendar,
  Clock,
  Building,
  Video,
  Smartphone,
  StickyNote,
  History,
  CheckCircle,
  Plus,
  Send,
  MessageSquare,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLeadsControllerFindOne,
  useLeadsControllerQuickAction,
  useCustomersControllerCreate,
  useInteractionsControllerFindAll,
} from '@/api/generated';
import { QuickActionLeadDtoStatus, QuickActionLeadDtoType } from '@/api/model';
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge';
import { ConvertToCustomerModal } from '@/components/leads/ConvertToCustomerModal';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams({ strict: false }) as { leadId: string };
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: leadData, isLoading, error } = useLeadsControllerFindOne(leadId);
  const lead = leadData as any;

  const quickActionMutation = useLeadsControllerQuickAction();
  const convertToCustomerMutation = useCustomersControllerCreate();

  const { data: interactionsResponse } = useInteractionsControllerFindAll(
    { leadId, pageSize: 50 },
    { query: { enabled: !!leadId } },
  );

  const interactions = ((interactionsResponse as any)?.data || []) as any[];

  // Quick Action Form State
  const [qaStatus, setQaStatus] = useState<QuickActionLeadDtoStatus>(QuickActionLeadDtoStatus.CALLED_REACHED);
  const [qaType, setQaType] = useState<QuickActionLeadDtoType>(QuickActionLeadDtoType.PHONE_CALL);
  const [qaSummary, setQaSummary] = useState('');
  const [qaNextFollowUpDate, setQaNextFollowUpDate] = useState('');
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Sync initial status when lead loads
  React.useEffect(() => {
    if (lead?.status) {
      setQaStatus(lead.status as QuickActionLeadDtoStatus);
    }
    if (lead?.nextFollowUpDate) {
      setQaNextFollowUpDate(new Date(lead.nextFollowUpDate).toISOString().slice(0, 16));
    }
  }, [lead]);

  const handleSaveQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaSummary.trim()) {
      toast.error('Lütfen görüşme notu veya özetini giriniz.');
      return;
    }

    try {
      await quickActionMutation.mutateAsync({
        id: leadId,
        data: {
          status: qaStatus,
          type: qaType,
          summary: qaSummary.trim(),
          nextFollowUpDate: qaNextFollowUpDate ? new Date(qaNextFollowUpDate).toISOString() : undefined,
        },
      });

      toast.success('Görüşme notu başarıyla kaydedildi.');
      setQaSummary('');
      queryClient.invalidateQueries({ queryKey: [`/api/v1/leads/${leadId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/interactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/interactions/upcoming-followups'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem kaydedilemedi.');
    }
  };

  const channelIcons: Record<string, any> = {
    PHONE_CALL: Phone,
    IN_PERSON_MEETING: Building,
    ONLINE_MEETING: Video,
    WHATSAPP: Smartphone,
    EMAIL: Mail,
    NOTE: StickyNote,
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-muted-foreground">Lead detayları yükleniyor...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-red-200 dark:border-red-900/40">
        <p className="text-sm font-bold text-red-600 mb-2">Potansiyel müşteri bulunamadı veya erişim yetkiniz yok.</p>
        <Link to="/leads" className="text-xs text-navy-600 font-semibold underline">
          &larr; Potansiyel Müşterilere Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar: Geri Dönüş ve Başlık */}
      <div>
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Potansiyel Müşterilere Dön
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-navy-700 dark:text-navy-400" />
                <span>{lead.companyName}</span>
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Yetkili: <strong className="text-foreground">{lead.contactName}</strong> &bull; Temsilci:{' '}
              <strong className="text-navy-700 dark:text-navy-400">{lead.assignedTo?.fullName || 'Atanmadı'}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setConvertModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-100 hover:bg-green-200 text-green-950 border border-green-300 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10 shrink-0"
          >
            <CheckCircle className="w-4 h-4 text-green-700" />
            Müşteriye Dönüştür (Resmi Müşteri Kartı Aç)
          </button>
        </div>
      </div>

      {/* 2 Kolonlu Ana Gövde */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon: Lead Bilgi Kartı */}
        <div className="space-y-6">
          <div className="bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              İletişim & Lead Detayları
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Yetkili Kişi:</span>
                <span className="font-bold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                  <User className="w-4 h-4 text-slate-400" />
                  {lead.contactName}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Telefon:</span>
                <a
                  href={`tel:${lead.phone}`}
                  className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5 hover:text-navy-600"
                >
                  <Phone className="w-4 h-4 text-teal-600" />
                  {lead.phone}
                </a>
              </div>

              {lead.email && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">E-posta:</span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5 hover:underline"
                  >
                    <Mail className="w-4 h-4 text-slate-400" />
                    {lead.email}
                  </a>
                </div>
              )}

              <div>
                <span className="text-muted-foreground block text-[11px]">Kaynak:</span>
                <span className="inline-block mt-0.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-300">
                  {lead.source || 'Belirtilmedi'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Kayıt Tarihi:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 mt-0.5 block">
                  {formatDate(lead.createdAt, 'dd.MM.yyyy HH:mm')}
                </span>
              </div>

              {lead.nextFollowUpDate && (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Planlanan Takip / Randevu
                  </span>
                  <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-xs block mt-1">
                    {formatDate(lead.nextFollowUpDate, 'dd.MM.yyyy HH:mm')}
                  </span>
                </div>
              )}

              {lead.notes && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-muted-foreground block text-[11px] mb-1">İlk Kayıt Notu:</span>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic">
                    "{lead.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Kolon (2 Birim): Yeni Görüşme Girişi & Zaman Tüneli */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kart 1: Yeni Görüşme & Durum Güncelleme Formu */}
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                Yeni Görüşme Kaydet & Durum Güncelle
              </h2>
              <span className="text-xs text-muted-foreground">Her temas zaman tüneline işlenir</span>
            </div>

            <form onSubmit={handleSaveQuickAction} className="space-y-4">
              {/* Durum Seçim Butonları */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">
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
                        'p-2.5 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer',
                        qaStatus === item.key
                          ? `${item.color} ring-2 ring-navy-600 shadow-xs`
                          : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temas Kanalı ve Takip Tarihi */}
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
                  <input
                    type="datetime-local"
                    value={qaNextFollowUpDate}
                    onChange={(e) => setQaNextFollowUpDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              {/* Görüşme Notu */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Görüşme Notu & Özet <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={qaSummary}
                  onChange={(e) => setQaSummary(e.target.value)}
                  placeholder="Müşteri ile neler görüşüldü? Hangi internet paketi veya kurumsal çözüm talep edildi?"
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:ring-2 focus:ring-navy-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={quickActionMutation.isPending}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-navy-700 hover:bg-navy-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {quickActionMutation.isPending ? 'Kaydediliyor...' : 'İşlem & Notu Kaydet'}
                </button>
              </div>
            </form>
          </div>

          {/* Kart 2: Zaman Tüneli (Timeline) */}
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                Temas & Etkileşim Zaman Tüneli
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">
                Toplam {interactions.length} kayıt
              </span>
            </div>

            <div className="space-y-3">
              {interactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic border rounded-lg border-dashed">
                  Henüz bir görüşme veya temas kaydı girilmedi. Yukarıdaki formdan ilk görüşmeyi ekleyin.
                </div>
              ) : (
                interactions.map((interaction: any) => {
                  const Icon = channelIcons[interaction.type] || MessageSquare;
                  return (
                    <div
                      key={interaction.id}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-xs space-y-1.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-navy-100 dark:bg-navy-950 text-navy-700 dark:text-navy-300 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">
                              {interaction.contactedPerson || lead.contactName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Temsilci: {interaction.user?.fullName || 'Satış Temsilcisi'}
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] text-muted-foreground font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                          {formatDate(interaction.createdAt, 'dd.MM.yyyy HH:mm')}
                        </span>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs pl-9 pt-1">
                        {interaction.summary}
                      </p>

                      {interaction.nextFollowUpDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold font-mono pl-9 pt-1">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>Sonraki Randevu Planı: {formatDate(interaction.nextFollowUpDate, 'dd.MM.yyyy HH:mm')}</span>
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

      {/* Müşteriye Dönüştürme Modalı */}
      <ConvertToCustomerModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        lead={lead}
        onSuccess={(newCustomer) => navigate({ to: `/customers/${newCustomer.id}` })}
      />
    </div>
  );
};
