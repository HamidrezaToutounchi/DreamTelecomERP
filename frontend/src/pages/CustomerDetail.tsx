import React, { useState } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  MessageSquare,
  FileSpreadsheet,
  BadgeDollarSign,
  Plus,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCustomersControllerFindOne,
  useCustomersControllerUpdate,
  useUsersControllerFindAll,
  useInteractionsControllerCreate,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { CopyableCode } from '@/components/common/CopyableCode';
import { QuoteStatusBadge } from '@/components/quotes/QuoteStatusBadge';
import { PaymentStatusBadge } from '@/components/sales/PaymentStatusBadge';
import { QuoteFormModal } from '@/components/quotes/QuoteFormModal';
import { downloadQuotePdf } from '@/lib/pdf';
import { formatDate, formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams({ strict: false }) as { customerId: string };
  const queryClient = useQueryClient();
  const { isManager } = useAuth();

  const { data: customerData, isLoading, error } = useCustomersControllerFindOne(customerId);
  const customer = customerData as any;
  const createInteractionMutation = useInteractionsControllerCreate();
  const updateCustomerMutation = useCustomersControllerUpdate();
  const { data: reps } = useUsersControllerFindAll(
    { role: 'SALES_REP' },
    { query: { enabled: isManager } },
  );

  const [activeTab, setActiveTab] = useState<'timeline' | 'quotes' | 'sales'>('timeline');

  // Teklif Hazırlama Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  // Görüşme Formu State
  const [interactionType, setInteractionType] = useState<
    'PHONE_CALL' | 'IN_PERSON_MEETING' | 'ONLINE_MEETING' | 'EMAIL' | 'WHATSAPP' | 'NOTE'
  >('PHONE_CALL');
  const [contactedPerson, setContactedPerson] = useState('');
  const [summary, setSummary] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [addInteractionOpen, setAddInteractionOpen] = useState(false);

  const handleQuoteCreated = async (newQuote: any) => {
    try {
      await createInteractionMutation.mutateAsync({
        data: {
          customerId,
          type: 'NOTE',
          contactedPerson: customer?.contactPerson || 'Müşteri Yetkilisi',
          summary: `Yeni kurumsal teklif hazırlandı ve zaman tüneline işlendi: ${newQuote.quoteNumber} (Tutar: ${formatMoney(newQuote.grandTotal, newQuote.currency)})`,
        },
      });
      toast.success('Teklif hazırlandı ve müşteri zaman tüneline eklendi.');
    } catch {
      // ignore
    }
    queryClient.invalidateQueries({ queryKey: [`/api/v1/customers/${customerId}`] });
  };

  const handleCreateInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactedPerson || !summary) {
      toast.error('Görüşülen kişi ve özet zorunludur.');
      return;
    }

    try {
      await createInteractionMutation.mutateAsync({
        data: {
          customerId,
          type: interactionType,
          contactedPerson,
          summary,
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : undefined,
        },
      });

      toast.success('Görüşme kaydı zaman tüneline eklendi.');
      setAddInteractionOpen(false);
      setContactedPerson('');
      setSummary('');
      setNextFollowUpDate('');
      queryClient.invalidateQueries({ queryKey: [`/api/v1/customers/${customerId}`] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Görüşme eklenemedi.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-muted-foreground">Müşteri detayları yükleniyor...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center bg-card rounded-xl border border-red-200 dark:border-red-900/40">
        <p className="text-sm font-bold text-red-600 mb-2">Müşteri kaydı bulunamadı veya erişim yetkiniz yok.</p>
        <Link to="/customers" className="text-xs text-navy-600 font-semibold underline">
          &larr; Müşteri Listesine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar: Geri Dönüş ve Firma Başlığı */}
      <div>
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Müşterilere Dön
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-navy-700 dark:text-navy-400" />
                <span>{customer.companyName}</span>
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-navy-50 text-navy-800 dark:bg-navy-950 dark:text-navy-300 border-navy-200">
                {customer.type === 'INDIVIDUAL' ? 'Bireysel' : customer.type === 'DEALER' ? 'Bayi' : 'Kurumsal'}
              </span>
              {customer.category && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border text-foreground"
                  style={{
                    borderColor: `${customer.category.color}40`,
                    backgroundColor: `${customer.category.color}15`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: customer.category.color }}
                  />
                  {customer.category.name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">360° Müşteri Görünümü &bull;</span>
              {isManager ? (
                <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-muted-foreground">Temsilci:</span>
                  <select
                    value={customer.assignedToId || ''}
                    onChange={async (e) => {
                      const newRepId = e.target.value;
                      if (!newRepId || newRepId === customer.assignedToId) return;
                      try {
                        await updateCustomerMutation.mutateAsync({
                          id: customer.id,
                          data: { assignedToId: newRepId },
                        });
                        toast.success('Müşteri temsilcisi güncellendi.');
                        queryClient.invalidateQueries({ queryKey: [`/api/v1/customers/${customerId}`] });
                        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
                      } catch {
                        toast.error('Müşteri temsilcisi güncellenemedi.');
                      }
                    }}
                    className="h-6 px-1.5 text-[11px] font-bold text-navy-800 dark:text-navy-300 bg-transparent border-0 cursor-pointer focus:ring-0"
                    title="Müşteri temsilcisini değiştirmek için tıklayın"
                  >
                    {(reps || []).map((rep: any) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs font-semibold text-foreground">
                  Temsilci: {customer.assignedTo?.fullName || '-'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Teklif Hazırla
            </button>

            <button
              type="button"
              onClick={() => setAddInteractionOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
            >
              <Plus className="w-4 h-4" />
              Görüşme Kaydı Ekle
            </button>
          </div>
        </div>
      </div>

      {/* Müşteri Bilgi Kartı */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">İrtibat Yetkilisi</span>
          <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-400" />
            {customer.contactPerson}
          </span>
          <span className="text-xs text-muted-foreground block">{customer.email || 'E-posta belirtilmemiş'}</span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Telefon & İletişim</span>
          <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-teal-600" />
            {customer.phone}
          </div>
          <span className="text-xs text-muted-foreground block">
            Kayıt: {formatDate(customer.createdAt, 'dd.MM.yyyy')}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Vergi Bilgileri</span>
          {customer.taxNumber ? (
            <div className="space-y-0.5">
              <CopyableCode code={customer.taxNumber} label="Vergi Numarası" />
              <span className="text-xs text-muted-foreground block mt-0.5">{customer.taxOffice || 'Vergi Dairesi'}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Adres / Lokasyon</span>
          <span className="text-xs text-foreground flex items-start gap-1">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{customer.address || 'Adres bilgisi girilmemiş.'}</span>
          </span>
        </div>
      </div>

      {/* Sekmeler: Zaman Tüneli, Teklifler, Satışlar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'timeline'
                ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Clock className="w-4 h-4" />
            Görüşme Zaman Tüneli (Timeline)
            <span className="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full">
              {customer.interactions?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'quotes'
                ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Teklifler
            <span className="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full">
              {customer.quotes?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
              activeTab === 'sales'
                ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <BadgeDollarSign className="w-4 h-4" />
            Satışlar & Faturalar
            <span className="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full">
              {customer.sales?.length || 0}
            </span>
          </button>
        </div>

        {/* ================= SEKME 1: ZAMAN TÜNELİ ================= */}
        {activeTab === 'timeline' && (
          <div className="bg-card p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            {customer.interactions && customer.interactions.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {customer.interactions.map((interaction: any) => (
                  <div key={interaction.id} className="relative group">
                    {/* Timeline Noktası */}
                    <div className="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-navy-600 shadow-xs" />

                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-700 dark:text-navy-300 bg-navy-50 dark:bg-navy-950 px-2 py-0.5 rounded border border-navy-200 dark:border-navy-800">
                            {interaction.type}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {interaction.contactedPerson} ile görüşüldü
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(interaction.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {interaction.summary}
                      </p>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span>Görüşen: {interaction.user?.fullName}</span>
                        {interaction.nextFollowUpDate && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Sonraki Takip: {formatDate(interaction.nextFollowUpDate, 'dd.MM.yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 opacity-30 mx-auto mb-2" />
                <p className="text-xs font-medium">Henüz bir görüşme kaydı girilmedi.</p>
                <button
                  type="button"
                  onClick={() => setAddInteractionOpen(true)}
                  className="mt-3 text-xs text-navy-600 font-bold underline cursor-pointer"
                >
                  İlk Görüşmeyi Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= SEKME 2: TEKLİFLER ================= */}
        {activeTab === 'quotes' && (
          <div className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Müşteriye Sunulan Teklifler</span>
              <button
                type="button"
                onClick={() => setQuoteModalOpen(true)}
                className="text-xs text-navy-600 dark:text-navy-400 font-bold hover:underline cursor-pointer"
              >
                Yeni Teklif Hazırla &rarr;
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(customer.quotes || []).map((quote: any) => (
                <div key={quote.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CopyableCode code={quote.quoteNumber} label="Teklif No" />
                      <QuoteStatusBadge status={quote.status} />
                      <span className="text-muted-foreground">v{quote.version}</span>
                    </div>
                    <span className="text-muted-foreground block">
                      Hazırlayan: {quote.rep?.fullName} &bull; Geçerlilik: {formatDate(quote.validUntil, 'dd.MM.yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-extrabold text-navy-700 dark:text-navy-300 text-sm block">
                        {formatMoney(quote.grandTotal, quote.currency)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{quote.items?.length || 0} kalem ürün</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadQuotePdf(quote.id, quote.quoteNumber)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      PDF İndir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= SEKME 3: SATIŞLAR ================= */}
        {activeTab === 'sales' && (
          <div className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-foreground">Gerçekleşen Satışlar ve Faturalar</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(customer.sales || []).map((sale: any) => (
                <div key={sale.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 max-w-md">
                    <span className="font-bold text-foreground block">{sale.soldItemsSummary}</span>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={sale.paymentStatus} />
                      {sale.isInvoiced ? (
                        <span className="text-[11px] text-green-700 font-semibold font-mono">
                          Fatura No: {sale.invoiceNumber || 'GIB-Belirtilmedi'}
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-semibold">
                          Fatura Kesilmesi Bekleniyor
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-green-700 dark:text-green-400 text-sm block">
                      {formatMoney(sale.totalAmount, sale.currency)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Temsilci: {sale.rep?.fullName} &bull; {formatDate(sale.createdAt, 'dd.MM.yyyy')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: GÖRÜŞME KAYDI EKLE ================= */}
      {addInteractionOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Yeni Görüşme Kaydı Ekle</h3>

            <form onSubmit={handleCreateInteraction} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Etkileşim Kanalı</label>
                <select
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="PHONE_CALL">Telefon Görüşmesi</option>
                  <option value="IN_PERSON_MEETING">Yüz Yüze Toplantı</option>
                  <option value="ONLINE_MEETING">Online Toplantı (Zoom/Teams)</option>
                  <option value="EMAIL">E-posta</option>
                  <option value="WHATSAPP">WhatsApp Mesajlaşma</option>
                  <option value="NOTE">Hızlı Not / Hatırlatma</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Görüşülen Yetkili Kişi *</label>
                <input
                  type="text"
                  required
                  value={contactedPerson}
                  onChange={(e) => setContactedPerson(e.target.value)}
                  placeholder="Örn: Banu Hanım (BT Müdürü)"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Görüşme Özeti & Bilgiler *</label>
                <textarea
                  required
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Ne konuşuldu? Müşteri ne talep etti veya hangi teklif sunuldu?"
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sonraki Takip / Randevu Tarihi</label>
                <input
                  type="datetime-local"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddInteractionOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createInteractionMutation.isPending}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createInteractionMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= MODAL: TEKLİF HAZIRLA (MÜŞTERİYE ÖZEL) ================= */}
      <QuoteFormModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        mode="create"
        fixedCustomerId={customer.id}
        fixedCustomerName={customer.companyName}
        onSuccess={handleQuoteCreated}
      />
    </div>
  );
};
