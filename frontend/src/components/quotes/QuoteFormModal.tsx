import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  X,
  RefreshCw,
  Building2,
  DollarSign,
  AlertCircle,
  Upload,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import Decimal from 'decimal.js';
import axios from 'axios';
import {
  useQuotesControllerCreate,
  useQuotesControllerRevise,
  useCustomersControllerFindAll,
  useProductsControllerFindAll,
  useCompaniesControllerFindAll,
  useAnalyticsControllerGetExchangeRate,
} from '@/api/generated';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

function toSafeDecimal(val: any): Decimal {
  if (val === undefined || val === null || val === '') return new Decimal(0);
  if (val instanceof Decimal) return val;
  try {
    const s = String(val).trim().replace(/,/g, '.');
    if (s === '' || s === '.' || s === '-' || s === '+') return new Decimal(0);
    const clean = s.endsWith('.') ? s.slice(0, -1) || '0' : s;
    return new Decimal(clean);
  } catch {
    return new Decimal(0);
  }
}

export interface QuoteItemRow {
  productId?: string;
  productName: string;
  productCode?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: string;
  discountRate: string;
  taxRate: number;
}

interface QuoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'revise';
  initialQuote?: any;
  fixedCustomerId?: string;
  fixedCustomerName?: string;
  onSuccess?: (quote: any) => void;
}

export const QuoteFormModal: React.FC<QuoteFormModalProps> = ({
  isOpen,
  onClose,
  mode = 'create',
  initialQuote,
  fixedCustomerId,
  fixedCustomerName,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const createMutation = useQuotesControllerCreate();
  const reviseMutation = useQuotesControllerRevise();

  const [companyId, setCompanyId] = useState<string>('');
  const [customerId, setCustomerId] = useState(fixedCustomerId || '');
  const [currency, setCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    '1. Teklif 30 gün süreyle geçerlidir.\n2. Fiyatlarımıza KDV dahildir.\n3. Kurulum ve devreye alma Dream Telecom uzman ekiplerince yapılacaktır.',
  );
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [items, setItems] = useState<QuoteItemRow[]>([
    {
      productName: '',
      productCode: '',
      description: '',
      quantity: 1,
      unitPrice: '0',
      discountRate: '0',
      taxRate: 20,
    },
  ]);

  // Companies query (Dream Telecom & Tescom Telecom)
  const { data: companiesData } = useCompaniesControllerFindAll({
    query: { enabled: isOpen },
  });

  const companies: any[] = (companiesData as any) || [];

  // Customers query (only if not fixedCustomerId and creating)
  const { data: customersData } = useCustomersControllerFindAll(
    { pageSize: 100 },
    { query: { enabled: isOpen && mode === 'create' && !fixedCustomerId } },
  );

  // Products catalog query
  const { data: catalogData } = useProductsControllerFindAll(
    { pageSize: 100 },
    { query: { enabled: isOpen } },
  );

  // Exchange rate query (for live USD/TRY conversion)
  const { data: exchangeRateData } = useAnalyticsControllerGetExchangeRate({
    query: { enabled: isOpen },
  });
  const usdRate = Number((exchangeRateData as any)?.usdRate) || 50.18;

  const customers = (customersData as any)?.data || [];
  const catalogProducts = (catalogData as any)?.data || [];

  // Initialize or reset form based on mode and initialQuote
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'revise' && initialQuote) {
      setCompanyId(initialQuote.companyId || initialQuote.company?.id || '');
      setCustomerId(initialQuote.customerId || '');
      setCurrency(initialQuote.currency || 'TRY');
      setNotes(initialQuote.notes || '');
      setTerms(initialQuote.terms || '');
      setValidUntil(
        initialQuote.validUntil
          ? new Date(initialQuote.validUntil).toISOString().slice(0, 10)
          : '',
      );

      if (initialQuote.items && initialQuote.items.length > 0) {
        setItems(
          initialQuote.items.map((i: any) => ({
            productId: i.productId || undefined,
            productName: i.productName || '',
            productCode: i.productCode || '',
            brand: i.brand || '',
            model: i.model || '',
            description: i.description || '',
            imageUrl: i.imageUrl || undefined,
            quantity: Number(i.quantity) || 1,
            unitPrice: i.unitPrice?.toString() || '0',
            discountRate: i.discountRate?.toString() || '0',
            taxRate: Number(i.taxRate) || 20,
          })),
        );
      }
    } else {
      // Create mode
      if (companies.length > 0 && !companyId) {
        const defaultComp = companies.find((c: any) => c.code === 'DREAM') || companies[0];
        setCompanyId(defaultComp.id);
      }
      setCustomerId(fixedCustomerId || '');
      setNotes('');
      setTerms(
        '1. Teklif 30 gün süreyle geçerlidir.\n2. Fiyatlarımıza KDV dahildir.\n3. Kurulum ve devreye alma Dream Telecom uzman ekiplerince yapılacaktır.',
      );
      // Default validity 30 days
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      setValidUntil(thirtyDays.toISOString().slice(0, 10));

      setItems([
        {
          productName: '',
          productCode: '',
          description: '',
          quantity: 1,
          unitPrice: '0',
          discountRate: '0',
          taxRate: 20,
        },
      ]);
    }
  }, [isOpen, mode, initialQuote, fixedCustomerId]);

  // Canlı Toplam Hesaplama (Decimal.js - Virgül ve Nokta Destekli)
  const totals = useMemo(() => {
    let subTotalAcc = new Decimal(0);
    let taxTotalAcc = new Decimal(0);

    items.forEach((item) => {
      const qty = toSafeDecimal(item.quantity || 1);
      const price = toSafeDecimal(item.unitPrice);
      const disc = toSafeDecimal(item.discountRate);
      const taxR = toSafeDecimal(item.taxRate ?? 20).dividedBy(100);

      const lineSub = qty.times(price);
      const discAmount = lineSub.times(disc).dividedBy(100);
      const lineTotal = lineSub.minus(discAmount);
      const taxAmount = lineTotal.times(taxR);

      subTotalAcc = subTotalAcc.plus(lineTotal);
      taxTotalAcc = taxTotalAcc.plus(taxAmount);
    });

    const grandTotal = subTotalAcc.plus(taxTotalAcc);

    return {
      subTotal: subTotalAcc.toFixed(2),
      taxTotal: taxTotalAcc.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    };
  }, [items]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: '',
        productCode: '',
        description: '',
        quantity: 1,
        unitPrice: '0',
        discountRate: '0',
        taxRate: 20,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemPhotoUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const toastId = toast.loading('Fotoğraf yükleniyor...');

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/uploads/product-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      const updated = [...items];
      updated[index].imageUrl = res.data.url;
      setItems(updated);
      toast.success('Ürün fotoğrafı yüklendi (Teklif PDF’ine eklenecektir).', { id: toastId });
    } catch {
      toast.error('Fotoğraf yüklenemedi.', { id: toastId });
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetCustId = fixedCustomerId || customerId;
    if (!targetCustId && mode === 'create') {
      toast.error('Lütfen bir hedef müşteri seçiniz.');
      return;
    }

    if (items.length === 0) {
      toast.error('En az bir ürün kalemi eklemelisiniz.');
      return;
    }

    for (let idx = 0; idx < items.length; idx++) {
      if (!items[idx].productName.trim()) {
        toast.error(`${idx + 1}. kalemin ürün adını giriniz.`);
        return;
      }
    }

    setConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    const targetCustId = fixedCustomerId || customerId;
    try {
      if (mode === 'revise') {
        const revised = await reviseMutation.mutateAsync({
          id: initialQuote.id,
          data: {
            companyId: companyId || undefined,
            currency: currency as any,
            items: items.map((i, idx) => ({
              productId: i.productId || undefined,
              productName: i.productName.trim(),
              productCode: i.productCode?.trim() || `PRD-${idx + 1}`,
              brand: i.brand?.trim() || undefined,
              model: i.model?.trim() || undefined,
              description: i.description?.trim() || undefined,
              imageUrl: i.imageUrl || undefined,
              quantity: Number(i.quantity) || 1,
              unitPrice: (i.unitPrice || '0').replace(/,/g, '.').replace(/\.+$/, '').trim() || '0',
              discountRate: (i.discountRate || '0').replace(/,/g, '.').replace(/\.+$/, '').trim() || '0',
              taxRate: Number(i.taxRate) || 20,
            })),
            notes: notes.trim() || undefined,
            terms: terms.trim() || undefined,
            validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          },
        });

        toast.success(`Teklif başarıyla revize edildi. Yeni Revizyon: ${revised.quoteNumber}`);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
        setConfirmModalOpen(false);
        onClose();
        if (onSuccess) onSuccess(revised);
      } else {
        const created = await createMutation.mutateAsync({
          data: {
            companyId: companyId || undefined,
            customerId: targetCustId,
            currency: currency as any,
            items: items.map((i, idx) => ({
              productId: i.productId || undefined,
              productName: i.productName.trim(),
              productCode: i.productCode?.trim() || `PRD-${idx + 1}`,
              brand: i.brand?.trim() || undefined,
              model: i.model?.trim() || undefined,
              description: i.description?.trim() || undefined,
              imageUrl: i.imageUrl || undefined,
              quantity: Number(i.quantity) || 1,
              unitPrice: (i.unitPrice || '0').replace(/,/g, '.').replace(/\.+$/, '').trim() || '0',
              discountRate: (i.discountRate || '0').replace(/,/g, '.').replace(/\.+$/, '').trim() || '0',
              taxRate: Number(i.taxRate) || 20,
            })),
            notes: notes.trim() || undefined,
            terms: terms.trim() || undefined,
            validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          },
        });

        toast.success(`Teklif başarıyla oluşturuldu: ${created.quoteNumber}`);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/customers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/v1/analytics/dashboard-summary'] });
        setConfirmModalOpen(false);
        onClose();
        if (onSuccess) onSuccess(created);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız oldu.');
    }
  };

  const isPending = createMutation.isPending || reviseMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card w-full max-w-5xl lg:max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-4">
        {/* Başlık */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-navy-700 dark:text-navy-400" />
              <span>Yeni Teklif Hazırla</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fixedCustomerName
                ? `Müşteri: ${fixedCustomerName}`
                : 'Müşteriye özel kurumsal teklif kalemleri ve fiyatlandırma.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handlePreSubmit} className="space-y-4">
          {/* Teklif Veren Şirket Seçimi (Dream Telecom & Tescom Telecom) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>🏢 Teklif Veren Şirket</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Resmi antet, iletişim ve logo otomatik basılır)
                </span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {companies.map((comp: any) => {
                const isSelected = companyId === comp.id || (!companyId && comp.code === 'DREAM');
                const isTescom = comp.code === 'TESCOM';
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setCompanyId(comp.id);
                      if (comp.code === 'TESCOM') {
                        setTerms(
                          '1. Teklif 30 gün süreyle geçerlidir.\n2. Fiyatlarımıza KDV dahildir.\n3. Kurulum ve devreye alma Tescom Telecom teknik ekibince yapılacaktır.\n4. Cihazlar 2 yıl Tescom ve distribütör garantisi kapsamındadır.',
                        );
                      } else {
                        setTerms(
                          '1. Teklif 30 gün süreyle geçerlidir.\n2. Fiyatlarımıza KDV dahildir.\n3. Kurulum ve devreye alma Dream Telecom uzman ekiplerince yapılacaktır.\n4. Cihazlar 2 yıl Dream Telecom ve üretici garantisi kapsamındadır.',
                        );
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                      isSelected
                        ? isTescom
                          ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30 shadow-xs'
                          : 'border-navy-600 bg-navy-50/80 dark:bg-navy-950/40 text-navy-950 dark:text-navy-100 ring-2 ring-navy-600/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-card text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800',
                    )}
                  >
                    <div className="h-8 w-20 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200/60 dark:border-slate-700 shrink-0">
                      <img
                        src={comp.logoUrl || (isTescom ? '/tescom-logo.png' : '/logo.png')}
                        alt={comp.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black truncate">{comp.name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Aktif
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {isTescom ? 'TS- Serisi Teklif Numarası' : 'DT- Serisi Teklif Numarası'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Müşteri, Para Birimi ve Geçerlilik Tarihi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mode === 'create' && !fixedCustomerId ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Hedef Müşteri <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                >
                  <option value="">Müşteri Seçiniz...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.contactPerson})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Müşteri</label>
                <div className="h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center gap-2 text-xs font-bold text-foreground">
                  <Building2 className="w-4 h-4 text-navy-700" />
                  <span>{fixedCustomerName || initialQuote?.customer?.companyName || 'Müşteri'}</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Teklif Para Birimi</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-bold cursor-pointer"
              >
                <option value="TRY">₺ Türk Lirası (TRY)</option>
                <option value="USD">$ Amerikan Doları (USD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Teklif Geçerlilik Tarihi</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
              />
            </div>
          </div>

          {/* Teklif Kalemleri Listesi */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Teklif Kalemleri ({items.length})
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">Tüm Kalemlere KDV:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value !== '') {
                      const rate = Number(e.target.value);
                      setItems(items.map((it) => ({ ...it, taxRate: rate })));
                    }
                  }}
                  defaultValue=""
                  className="h-7 px-2 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-background text-foreground cursor-pointer"
                >
                  <option value="" disabled>KDV Seç...</option>
                  <option value={20}>Tümü %20</option>
                  <option value={10}>Tümü %10</option>
                  <option value={1}>Tümü %1</option>
                  <option value={0}>Tümü %0 (KDV Muaf)</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 dark:bg-navy-950 text-navy-800 dark:text-navy-300 border border-navy-200 dark:border-navy-800 text-xs font-bold hover:bg-navy-100 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Kalem Ekle
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2"
                >
                  {/* Katalogdan Otomatik Doldurma Seçicisi */}
                  {catalogProducts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-navy-700 dark:text-navy-300">
                        ⚡ Katalogdan Hızlı Seç:
                      </span>
                      <select
                        value={item.productId || ''}
                        onChange={(e) => {
                          const selected = catalogProducts.find((p: any) => p.id === e.target.value);
                          if (selected) {
                            const updated = [...items];
                            updated[idx].productId = selected.id;
                            updated[idx].productName = selected.name;
                            updated[idx].productCode = selected.code || '';
                            updated[idx].brand = selected.brand || '';
                            updated[idx].model = selected.model || '';
                            updated[idx].description = selected.description || '';
                            updated[idx].unitPrice = selected.unitPrice?.toString() || '0';
                            updated[idx].taxRate = Number(selected.taxRate) || 20;
                            updated[idx].imageUrl = selected.imageUrl || undefined;

                            // Ürünün kendi para birimi neyse teklif para birimini ona eşitle (kullanıcı karıştırmasın)
                            if (selected.currency && (selected.currency === 'USD' || selected.currency === 'TRY')) {
                              setCurrency(selected.currency as 'TRY' | 'USD');
                            }

                            setItems(updated);
                          }
                        }}
                        className="h-7 px-2 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-foreground cursor-pointer flex-1 max-w-sm"
                      >
                        <option value="">Manuel Tanım (veya katalogdan seç)...</option>
                        {catalogProducts.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            [{p.type === 'PHYSICAL' ? 'Fiziksel' : p.type === 'SOFTWARE' ? 'Yazılım' : 'Hizmet'}] {p.name} {p.brand ? `(${p.brand})` : ''} - {formatMoney(p.unitPrice, p.currency)}
                          </option>
                        ))}
                      </select>
                      {item.brand && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          Marka: {item.brand} {item.model ? `| Model: ${item.model}` : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    {/* Ürün Görseli & Adı */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground block">
                          Ürün / Hizmet Tanımı *
                        </label>
                        {item.imageUrl && (
                          <span className="text-[10px] text-green-600 font-bold">✓ Fotoğraf Hazır</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.imageUrl ? (
                          <div className="relative group w-9 h-9 rounded border border-slate-200 overflow-hidden shrink-0">
                            <img
                              src={`http://localhost:3000${item.imageUrl}`}
                              alt="Ürün"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...items];
                                delete updated[idx].imageUrl;
                                setItems(updated);
                              }}
                              className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] font-bold transition-opacity cursor-pointer"
                              title="Fotoğrafı Kaldır"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label
                            className="w-9 h-9 rounded border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-navy-500 cursor-pointer shrink-0 transition-colors"
                            title="Ürüne Fotoğraf Ekle (PDF'e basılır)"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="text-[7.5px] font-bold leading-none mt-0.5">Foto</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleItemPhotoUpload(idx, e.target.files[0]);
                              }}
                            />
                          </label>
                        )}
                        <input
                          type="text"
                          required
                          placeholder="Örn: GCC 6010 SANTRAL"
                          value={item.productName}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].productName = e.target.value;
                            setItems(updated);
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Miktar */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block text-center">Miktar</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = Number(e.target.value) || 1;
                          setItems(updated);
                        }}
                        className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-bold text-center font-mono"
                      />
                    </div>

                    {/* Birim Fiyat */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">
                        Birim Fiyat ({currency === 'USD' ? 'USD $' : 'TL ₺'})
                      </label>
                      <input
                        type="text"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].unitPrice = e.target.value;
                          setItems(updated);
                        }}
                        placeholder="25000"
                        className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
                      />
                    </div>

                    {/* İskonto % */}
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block text-center">İsk. %</label>
                      <input
                        type="text"
                        value={item.discountRate}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].discountRate = e.target.value;
                          setItems(updated);
                        }}
                        placeholder="0"
                        className="w-full h-9 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono text-center"
                      />
                    </div>

                    {/* KDV Oranı Seçimi */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block text-center">KDV (%)</label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].taxRate = Number(e.target.value);
                          setItems(updated);
                        }}
                        className="w-full h-9 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold cursor-pointer text-center"
                      >
                        <option value={20}>%20</option>
                        <option value={10}>%10</option>
                        <option value={1}>%1</option>
                        <option value={0}>%0 (Muaf)</option>
                      </select>
                    </div>

                    {/* Sil Butonu */}
                    <div className="md:col-span-1 flex justify-center pb-0.5">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer transition-colors"
                          title="Kalemi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kalem Açıklaması */}
                  <div>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[idx].description = e.target.value;
                        setItems(updated);
                      }}
                      placeholder="Kalem açıklaması veya teknik özellikler (Opsiyonel)..."
                      className="w-full h-7 px-2.5 rounded border border-slate-200/60 dark:border-slate-800 bg-background text-[11px] text-muted-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canlı Toplamlar Kartı */}
          <div className="bg-slate-100/70 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1.5 text-xs">
            <div>
              <span className="text-muted-foreground mr-3">Ara Toplam:</span>
              <span className="font-mono font-bold text-foreground">{formatMoney(totals.subTotal, currency)}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-3">KDV Toplamı:</span>
              <span className="font-mono font-bold text-foreground">{formatMoney(totals.taxTotal, currency)}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-1 mt-1 text-sm">
              <span className="font-extrabold text-navy-700 dark:text-navy-300 mr-3">GENEL TOPLAM:</span>
              <span className="font-mono font-black text-navy-700 dark:text-navy-300 text-base">
                {formatMoney(totals.grandTotal, currency)}
              </span>
            </div>
          </div>

          {/* Notlar ve Şartlar & Koşullar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Özel Notlar</label>
                <span className="text-[10px] text-muted-foreground font-medium">Müşteriye teklifte iletilir</span>
              </div>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Kurulum ve devreye alma tarihi, özel teslimat koşulları..."
                className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-xs leading-relaxed focus:ring-2 focus:ring-navy-600 focus:border-transparent resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Şartlar & Koşullar</span>
                  <span className="text-[10px] font-normal text-muted-foreground">(PDF Teklife Basılır)</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTerms(
                      '1. Teklif 30 gün süreyle geçerlidir.\n2. Fiyatlarımıza KDV dahildir.\n3. Kurulum ve devreye alma Dream Telecom uzman ekiplerince yapılacaktır.\n4. Tüm ürünler 2 yıl resmi garanti kapsamındadır.',
                    )
                  }
                  className="text-[10px] font-bold text-navy-700 dark:text-navy-300 hover:underline cursor-pointer"
                  title="Varsayılan standart maddeleri yükle"
                >
                  + Standart Şartları Doldur
                </button>
              </div>
              <textarea
                rows={5}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="1. Teklif 30 gün süreyle geçerlidir...&#10;2. Fiyatlarımıza KDV dahildir...&#10;3. Ödeme vadesi teslimatta peşindir..."
                className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-background text-xs leading-relaxed focus:ring-2 focus:ring-navy-600 focus:border-transparent font-sans resize-y"
              />
            </div>
          </div>

          {/* Aksiyon Butonları */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Teklifi İncele & Kaydet</span>
            </button>
          </div>
        </form>

        {/* ================= ONAY MODALI (KAYDETMEDEN ÖNCE GÖZDEN GEÇİRME) ================= */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      Teklif Bilgilerini Onaylıyor musunuz?
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Lütfen kaydetmeden önce aşağıdaki bilgileri gözden geçiriniz.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Özet Kartı */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Hedef Müşteri:</span>
                    <span className="font-bold text-foreground text-sm">
                      {customers.find((c: any) => c.id === (fixedCustomerId || customerId))?.companyName ||
                        initialQuote?.customer?.name ||
                        'Seçili Müşteri'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Teklif Veren Firma:</span>
                    <span className="font-bold text-foreground">
                      {companies.find((c: any) => c.id === companyId)?.name || 'Dream Telecom'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Para Birimi:</span>
                    <span className="font-extrabold text-navy-700 dark:text-navy-300">
                      {currency === 'USD' ? '$ Amerikan Doları (USD)' : '₺ Türk Lirası (TRY)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Kalem Sayısı:</span>
                    <span className="font-bold text-foreground">{items.length} Kalem</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Geçerlilik:</span>
                    <span className="font-bold text-foreground">
                      {validUntil ? new Date(validUntil).toLocaleDateString('tr-TR') : '30 Gün'}
                    </span>
                  </div>
                </div>

                {/* Kalemler Mini Tablo */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-1">
                    Girdiğiniz Kalemler:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-[11px]"
                      >
                        <span className="font-medium text-foreground truncate max-w-[220px]">
                          {i + 1}. {it.productName || 'İsimsiz Kalem'}
                        </span>
                        <span className="font-mono font-bold text-navy-700 dark:text-navy-300">
                          {it.quantity} adet &bull; {it.unitPrice} {currency === 'USD' ? '$' : '₺'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toplam */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">KDV Dahil Toplam:</span>
                    <span className="font-bold text-foreground">Ara Toplam: {formatMoney(totals.subTotal, currency)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-navy-700 dark:text-navy-300 text-lg block">
                      {formatMoney(totals.grandTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
                >
                  ← Düzenlemeye Dön
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleFinalConfirm}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <span>Kaydediliyor...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Evet, Bilgiler Doğru - Teklifi Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
