import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Server,
  Code2,
  Wrench,
  DollarSign,
  TrendingUp,
  Tag,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Upload,
  Pencil,
  ScanBarcode,
  Trash2,
  Star,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  useProductsControllerFindAll,
  useProductsControllerCreate,
  useProductsControllerUpdate,
  useProductsControllerGetProductSalesSummary,
  useProductsControllerAddBarcode,
  useProductsControllerRemoveBarcode,
  useProductsControllerSetDefaultBarcode,
} from '@/api/generated';
import { BarcodeScanInput } from '@/components/stock/BarcodeScanInput';
import { useAuth } from '@/context/AuthContext';
import { CopyableCode } from '@/components/common/CopyableCode';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const COMMON_UNITS = [
  { value: 'ADET', label: 'Adet (Standart Donanım / Cihaz)' },
  { value: 'KUTU', label: 'Kutu' },
  { value: 'KOLI', label: 'Koli' },
  { value: 'PAKET', label: 'Paket' },
  { value: 'METRE', label: 'Metre (Kablo / Hat)' },
  { value: 'KG', label: 'Kilogram (kg)' },
  { value: 'SET', label: 'Set / Takım' },
  { value: 'RULO', label: 'Rulo' },
  { value: 'LITRE', label: 'Litre' },
  { value: 'DIGER', label: 'Diğer (Özel Giriş)' },
];

export interface FormBarcodeItem {
  id?: string;
  barcode: string;
  isDefault: boolean;
}

export const ProductsPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PHYSICAL' | 'SOFTWARE' | 'SERVICE' | 'SALES_REPORT'>('ALL');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'PHYSICAL' | 'SOFTWARE' | 'SERVICE'>('PHYSICAL');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('USD');
  const [unitPrice, setUnitPrice] = useState('100.00');
  const [taxRate, setTaxRate] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

  // Stok & Garanti State
  const [trackSerial, setTrackSerial] = useState(false);
  const [trackMac, setTrackMac] = useState(false);
  const [macRequired, setMacRequired] = useState(false);
  const [customerWarrantyMonths, setCustomerWarrantyMonths] = useState(24);
  const [supplierWarrantyMonths, setSupplierWarrantyMonths] = useState(24);
  const [minStockLevel, setMinStockLevel] = useState('0');
  const [unit, setUnit] = useState('ADET');
  const [customUnit, setCustomUnit] = useState('');

  // Form İçi Barkod Yönetimi State
  const [formBarcodes, setFormBarcodes] = useState<FormBarcodeItem[]>([]);

  // Barkod Modalı State (Tablodan doğrudan açılan)
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<any | null>(null);
  const addBarcodeMutation = useProductsControllerAddBarcode();
  const removeBarcodeMutation = useProductsControllerRemoveBarcode();
  const setDefaultBarcodeMutation = useProductsControllerSetDefaultBarcode();

  // Queries
  const typeFilter = activeTab !== 'ALL' && activeTab !== 'SALES_REPORT' ? activeTab : undefined;

  const { data: productsResponse, isLoading } = useProductsControllerFindAll(
    {
      pageSize: 100,
      search: search || undefined,
      type: typeFilter as any,
    },
    { query: { enabled: activeTab !== 'SALES_REPORT' } },
  );

  const { data: salesReportData, isLoading: isReportLoading } = useProductsControllerGetProductSalesSummary(
    { query: { enabled: activeTab === 'SALES_REPORT' } },
  );

  const createMutation = useProductsControllerCreate();
  const updateMutation = useProductsControllerUpdate();

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setBrand('');
    setModel('');
    setType('PHYSICAL');
    setCode('');
    setDescription('');
    setCurrency('USD');
    setUnitPrice('100.00');
    setTaxRate(20);
    setImageUrl(undefined);
    setTrackSerial(false);
    setTrackMac(false);
    setMacRequired(false);
    setCustomerWarrantyMonths(24);
    setSupplierWarrantyMonths(24);
    setMinStockLevel('0');
    setUnit('ADET');
    setCustomUnit('');
    setFormBarcodes([]);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    setEditingProduct(p);
    setName(p.name || '');
    setBrand(p.brand || '');
    setModel(p.model || '');
    setType(p.type || 'PHYSICAL');
    setCode(p.code || '');
    setDescription(p.description || '');
    setCurrency(p.currency || 'USD');
    setUnitPrice(p.unitPrice ? String(p.unitPrice) : '100.00');
    setTaxRate(p.taxRate ?? 20);
    setImageUrl(p.imageUrl || undefined);
    setTrackSerial(!!p.trackSerial);
    setTrackMac(!!p.trackMac);
    setMacRequired(!!p.macRequired);
    setCustomerWarrantyMonths(p.customerWarrantyMonths ?? 24);
    setSupplierWarrantyMonths(p.supplierWarrantyMonths ?? 24);
    setMinStockLevel(p.minStockLevel ? String(p.minStockLevel) : '0');
    
    // Unit eşleştirmesi
    const currentUnit = p.unit || 'ADET';
    const isStandardUnit = COMMON_UNITS.some((u) => u.value === currentUnit);
    if (isStandardUnit) {
      setUnit(currentUnit);
      setCustomUnit('');
    } else {
      setUnit('DIGER');
      setCustomUnit(currentUnit);
    }

    setFormBarcodes(
      p.barcodes && p.barcodes.length > 0
        ? p.barcodes.map((b: any) => ({ id: b.id, barcode: b.barcode, isDefault: b.isDefault }))
        : []
    );
    setIsFormOpen(true);
  };

  // Form İçinde Barkod Ekleme
  const handleAddBarcodeToForm = async (rawCode: string) => {
    const clean = rawCode.trim().toUpperCase();
    if (!clean) return;

    if (formBarcodes.some((b) => b.barcode.toUpperCase() === clean)) {
      toast.error(`"${clean}" barkodu bu ürüne zaten eklendi.`);
      return;
    }

    if (editingProduct) {
      try {
        const res = await addBarcodeMutation.mutateAsync({
          id: editingProduct.id,
          data: {
            barcode: clean,
            isDefault: formBarcodes.length === 0,
          },
        });
        toast.success(`"${clean}" barkodu ürüne kaydedildi.`);
        queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
        setFormBarcodes((prev) => [
          ...prev,
          { id: (res as any)?.id, barcode: clean, isDefault: prev.length === 0 },
        ]);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Barkod eklenemedi.');
      }
    } else {
      setFormBarcodes((prev) => [
        ...prev,
        { barcode: clean, isDefault: prev.length === 0 },
      ]);
      toast.success(`"${clean}" barkodu eklendi.`);
    }
  };

  // Form İçinde Barkod Silme
  const handleRemoveBarcodeFromForm = async (item: FormBarcodeItem) => {
    if (editingProduct && item.id) {
      try {
        await removeBarcodeMutation.mutateAsync({
          id: editingProduct.id,
          barcodeId: item.id,
        });
        toast.success('Barkod silindi.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
        setFormBarcodes((prev) => prev.filter((b) => b.barcode !== item.barcode));
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Barkod silinemedi.');
      }
    } else {
      setFormBarcodes((prev) => {
        const filtered = prev.filter((b) => b.barcode !== item.barcode);
        if (item.isDefault && filtered.length > 0) {
          filtered[0].isDefault = true;
        }
        return filtered;
      });
      toast.success('Barkod listeden kaldırıldı.');
    }
  };

  // Form İçinde Varsayılan Barkod Belirleme
  const handleSetDefaultBarcodeInForm = async (item: FormBarcodeItem) => {
    if (editingProduct && item.id) {
      try {
        await setDefaultBarcodeMutation.mutateAsync({
          id: editingProduct.id,
          barcodeId: item.id,
        });
        toast.success('Varsayılan barkod güncellendi.');
        queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
        setFormBarcodes((prev) =>
          prev.map((b) => ({ ...b, isDefault: b.barcode === item.barcode }))
        );
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Varsayılan yapılamadı.');
      }
    } else {
      setFormBarcodes((prev) =>
        prev.map((b) => ({ ...b, isDefault: b.barcode === item.barcode }))
      );
      toast.success('Varsayılan barkod belirlendi.');
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/v1/uploads/product-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setImageUrl(res.data.url);
      toast.success('Ürün fotoğrafı yüklendi.');
    } catch {
      toast.error('Fotoğraf yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ürün/Hizmet adı zorunludur.');
      return;
    }

    const effectiveUnit = unit === 'DIGER' ? (customUnit.trim() || 'ADET') : (unit.trim() || 'ADET');

    const payload = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      type,
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      currency,
      unitPrice: (unitPrice || '0').replace(/,/g, '.').replace(/\.+$/, '').trim() || '0',
      taxRate: Number(taxRate) || 20,
      imageUrl,
      trackSerial,
      trackMac,
      macRequired,
      customerWarrantyMonths: Number(customerWarrantyMonths) || 24,
      supplierWarrantyMonths: Number(supplierWarrantyMonths) || 24,
      minStockLevel: (minStockLevel || '0').replace(/,/g, '.').trim(),
      unit: effectiveUnit,
    };

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          data: payload,
        });
        toast.success(`"${name}" ürünü başarıyla güncellendi.`);
      } else {
        const createdProduct: any = await createMutation.mutateAsync({
          data: payload,
        });

        // Yeni oluşturulan ürüne girilen barkodları ekle
        if (createdProduct?.id && formBarcodes.length > 0) {
          for (const b of formBarcodes) {
            try {
              await addBarcodeMutation.mutateAsync({
                id: createdProduct.id,
                data: {
                  barcode: b.barcode,
                  isDefault: b.isDefault,
                },
              });
            } catch (bErr: any) {
              console.warn('Barkod ilişkilendirme uyarısı:', bErr);
            }
          }
        }

        toast.success('Yeni ürün/hizmet kataloğa eklendi.');
      }

      setIsFormOpen(false);
      setEditingProduct(null);
      setName('');
      setBrand('');
      setModel('');
      setCode('');
      setDescription('');
      setCurrency('USD');
      setUnitPrice('100.00');
      setImageUrl(undefined);
      setFormBarcodes([]);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || (editingProduct ? 'Ürün güncellenemedi.' : 'Ürün eklenemedi.'));
    }
  };

  const handleAddBarcode = async (barcodeVal: string) => {
    if (!barcodeModalProduct) return;
    try {
      await addBarcodeMutation.mutateAsync({
        id: barcodeModalProduct.id,
        data: {
          barcode: barcodeVal,
          isDefault: !barcodeModalProduct.barcodes?.length,
        },
      });
      toast.success('Barkod eklendi.');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
      const res = await axios.get(`/api/v1/products/${barcodeModalProduct.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBarcodeModalProduct(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Barkod eklenemedi.');
    }
  };

  const handleRemoveBarcode = async (barcodeId: string) => {
    if (!barcodeModalProduct) return;
    try {
      await removeBarcodeMutation.mutateAsync({
        id: barcodeModalProduct.id,
        barcodeId,
      });
      toast.success('Barkod silindi.');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
      const res = await axios.get(`/api/v1/products/${barcodeModalProduct.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBarcodeModalProduct(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Barkod silinemedi.');
    }
  };

  const handleSetDefaultBarcode = async (barcodeId: string) => {
    if (!barcodeModalProduct) return;
    try {
      await setDefaultBarcodeMutation.mutateAsync({
        id: barcodeModalProduct.id,
        barcodeId,
      });
      toast.success('Varsayılan barkod güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
      const res = await axios.get(`/api/v1/products/${barcodeModalProduct.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBarcodeModalProduct(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Varsayılan yapılamadı.');
    }
  };

  const products = (productsResponse as any)?.data || [];
  const salesStats = (salesReportData as any) || [];

  /* ================= TAM SAYFA FORM: ÜRÜN / HİZMET TANIMLA VEYA DÜZENLE ================= */
  if (isFormOpen) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-2">
        {/* Üst Geri Dön ve Başlık */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(false);
              setEditingProduct(null);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kataloğa Dön</span>
          </button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-foreground">
              {editingProduct ? 'Ürün / Hizmet Bilgilerini Güncelle' : 'Yeni Ürün / Hizmet Tanımla'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingProduct
                ? `${editingProduct.name} (${editingProduct.code || '-'})`
                : 'Mükerrer kaydı önlemek için isim, marka ve model kombinasyonu kontrol edilir.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitProduct} className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Ürün Türü */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Ürün / Hizmet Türü *</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('PHYSICAL')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all',
                  type === 'PHYSICAL'
                    ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950 dark:text-navy-200 ring-2 ring-navy-600'
                    : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50',
                )}
              >
                <Server className="w-4 h-4 text-blue-600" />
                Fiziksel Donanım
              </button>
              <button
                type="button"
                onClick={() => setType('SOFTWARE')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all',
                  type === 'SOFTWARE'
                    ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950 dark:text-navy-200 ring-2 ring-navy-600'
                    : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50',
                )}
              >
                <Code2 className="w-4 h-4 text-purple-600" />
                Yazılım / Lisans
              </button>
              <button
                type="button"
                onClick={() => setType('SERVICE')}
                className={cn(
                  'flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all',
                  type === 'SERVICE'
                    ? 'border-navy-600 bg-navy-50 text-navy-900 dark:bg-navy-950 dark:text-navy-200 ring-2 ring-navy-600'
                    : 'border-slate-200 dark:border-slate-700 text-muted-foreground hover:bg-slate-50',
                )}
              >
                <Wrench className="w-4 h-4 text-emerald-600" />
                Hizmet Paketi
              </button>
            </div>
          </div>

          {/* Temel Bilgiler */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3 space-y-1">
              <label className="text-xs font-bold text-foreground">
                Ürün / Hizmet Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Örn: DreamFiber Kurumsal Router 10G"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Marka</label>
              <input
                type="text"
                placeholder="Örn: Dream Telecom"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Model</label>
              <input
                type="text"
                placeholder="Örn: DF-10G-PRO"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-navy-600"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Ürün Kodu</label>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">⚡ Otomatik</span>
              </div>
              <input
                type="text"
                placeholder="Boş bırakılırsa otomatik üretilir"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-navy-600"
              />
            </div>
          </div>

          {/* Fiyatlandırma & KDV */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Fiyat Para Birimi *</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-bold cursor-pointer text-navy-800 dark:text-navy-200"
              >
                <option value="USD">$ Amerikan Doları (USD)</option>
                <option value="TRY">₺ Türk Lirası (TRY)</option>
                <option value="EUR">€ Euro (EUR)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                Liste Fiyatı ({currency === 'USD' ? '$ USD' : currency === 'EUR' ? '€ EUR' : '₺ TRY'}) *
              </label>
              <input
                type="text"
                required
                placeholder={currency === 'USD' ? '100.00' : '1000.00'}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full h-10 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">KDV Oranı % *</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm font-semibold cursor-pointer"
              >
                <option value={20}>%20 KDV (Genel Standart)</option>
                <option value={10}>%10 KDV</option>
                <option value={1}>%1 KDV</option>
                <option value={0}>%0 KDV (Muaf)</option>
              </select>
            </div>
          </div>

          {/* Stok & Garanti Bilgileri (Fiziksel Ürünler İçin) */}
          {type === 'PHYSICAL' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <ShieldCheck className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                <span>Stok, Seri No ve Garanti Takip Bilgileri</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackSerial}
                    onChange={(e) => setTrackSerial(e.target.checked)}
                    className="rounded border-slate-300 text-navy-700 focus:ring-navy-600"
                  />
                  <span className="text-xs font-medium text-foreground">Seri No Takibi</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackMac}
                    onChange={(e) => setTrackMac(e.target.checked)}
                    className="rounded border-slate-300 text-navy-700 focus:ring-navy-600"
                  />
                  <span className="text-xs font-medium text-foreground">MAC Adresi Takibi</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!trackMac}
                    checked={macRequired}
                    onChange={(e) => setMacRequired(e.target.checked)}
                    className="rounded border-slate-300 text-navy-700 focus:ring-navy-600 disabled:opacity-50"
                  />
                  <span className="text-xs font-medium text-foreground">MAC Adresi Zorunlu</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Birim</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold cursor-pointer"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  {unit === 'DIGER' && (
                    <input
                      type="text"
                      placeholder="Özel Birim (Örn: RULO, VARİL)"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="w-full h-8 px-2.5 mt-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                      required
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Kritik Stok</label>
                  <input
                    type="text"
                    placeholder="Örn: 5"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Müşteri Garanti (Ay)</label>
                  <input
                    type="number"
                    min={0}
                    value={customerWarrantyMonths}
                    onChange={(e) => setCustomerWarrantyMonths(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Tedarikçi Garanti (Ay)</label>
                  <input
                    type="number"
                    min={0}
                    value={supplierWarrantyMonths}
                    onChange={(e) => setSupplierWarrantyMonths(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              {/* Ürün Koli / Ambalaj Barkodları Tanımlama Alanı */}
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanBarcode className="w-4 h-4 text-navy-700 dark:text-navy-400" />
                    <span className="text-xs font-bold text-foreground">
                      Koli / Ambalaj Barkodları ({formBarcodes.length})
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    EAN-13, GS1, Code-128
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Cihaz ambalajı veya kolisi üzerindeki barkodu okutucuyla okutarak veya manuel yazarak ekleyiniz. Mal kabul ve sevkiyatta ürün bu barkodla otomatik olarak tanınır.
                </p>

                {/* Barkod Okutma Girdisi */}
                <BarcodeScanInput
                  placeholder="Ürün barkodunu okutunuz veya yazıp Enter'a basınız..."
                  existingCodes={formBarcodes.map((b) => b.barcode)}
                  onScan={handleAddBarcodeToForm}
                />

                {/* Eklenen Barkodlar Listesi */}
                {formBarcodes.length === 0 ? (
                  <div className="p-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-xs text-muted-foreground">
                    Henüz barkod tanımlanmadı. Barkod okuyucuyla okutarak veya manuel yazarak yukarıdaki alandan ekleyebilirsiniz.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {formBarcodes.map((b, bIdx) => (
                      <div
                        key={b.barcode}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-[10px] font-mono text-muted-foreground">#{bIdx + 1}</span>
                          <span className="font-mono font-bold text-foreground">{b.barcode}</span>
                          {b.isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Varsayılan Barkod
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultBarcodeInForm(b)}
                              className="text-[10px] text-slate-500 hover:text-amber-600 cursor-pointer transition-colors"
                            >
                              Varsayılan Yap
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBarcodeFromForm(b)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                          title="Barkodu Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Açıklama & Fotoğraf */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Kısa Açıklama / Özellikler</label>
              <textarea
                rows={3}
                placeholder="Ürün veya hizmetin temel teknik özellikleri..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:outline-hidden focus:ring-2 focus:ring-navy-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Ürün Fotoğrafı (PDF Teklifinde Görünür)</label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative group w-18 h-18 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                    <img src={imageUrl} alt="Ürün" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(undefined)}
                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity cursor-pointer"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <label className="w-18 h-18 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-navy-500 cursor-pointer shrink-0">
                    <Upload className="w-5 h-5" />
                    <span className="text-[10px] mt-1 font-semibold">Görsel Seç</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
                      }}
                    />
                  </label>
                )}
                <span className="text-xs text-muted-foreground">
                  {imageUrl
                    ? 'Fotoğraf hazır. PDF tekliflerinde ürün yanında basılacaktır.'
                    : 'JPG veya PNG formatında ürün fotoğrafı yükleyebilirsiniz.'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingProduct(null);
              }}
              className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending || isUploading}
              className="px-6 py-2.5 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Kaydediliyor...'
                : editingProduct
                  ? 'Değişiklikleri Kaydet'
                  : 'Ürünü Kataloğa Ekle'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar: Başlık ve Yeni Ekle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            <span>Ürün & Hizmet Yönetimi</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fiziksel donanım, yazılım lisansları, hizmet paketleri ve ürün bazlı satış analizi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer h-10"
        >
          <Plus className="w-4 h-4" />
          Yeni Ürün / Hizmet Ekle
        </button>
      </div>

      {/* Sekmeler */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'ALL'
              ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Package className="w-4 h-4" />
          Tüm Katalog
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PHYSICAL')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'PHYSICAL'
              ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Server className="w-4 h-4 text-blue-600" />
          Fiziksel Donanımlar
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SOFTWARE')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'SOFTWARE'
              ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Code2 className="w-4 h-4 text-purple-600" />
          Yazılım & Lisanslar
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SERVICE')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer',
            activeTab === 'SERVICE'
              ? 'border-navy-700 text-navy-700 dark:border-navy-400 dark:text-navy-300'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <Wrench className="w-4 h-4 text-emerald-600" />
          Hizmet Paketleri
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SALES_REPORT')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ml-auto',
            activeTab === 'SALES_REPORT'
              ? 'border-green-600 text-green-700 dark:border-green-400 dark:text-green-300'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <BarChart3 className="w-4 h-4 text-green-600" />
          Ürün Bazlı Satış Raporu
        </button>
      </div>

      {/* ================= GÖRÜNÜM 1: ÜRÜN BAZLI SATIŞ RAPORU ================= */}
      {activeTab === 'SALES_REPORT' ? (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Ürün ve Hizmet Bazında Satış Dağılımı
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Onaylanıp siparişe dönüşen tekliflerde hangi üründen ne kadar satıldığı ve toplam ciro katkısı.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
              Toplam {salesStats.length} Kalem Satışı
            </span>
          </div>

          {isReportLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">Satış istatistikleri hesaplanıyor...</span>
            </div>
          ) : salesStats.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <BarChart3 className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">Henüz gerçekleşmiş bir ürün satışı bulunmuyor.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Teklifler onaylanıp satışa dönüştürüldükçe ürün bazlı ciro ve adet raporları burada listelenecektir.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Ürün / Hizmet</th>
                    <th className="py-3 px-4">Marka & Model</th>
                    <th className="py-3 px-4">Tür</th>
                    <th className="py-3 px-4 text-center">Toplam Satılan Adet</th>
                    <th className="py-3 px-4 text-center">İşlem Sayısı</th>
                    <th className="py-3 px-4 text-right">Toplam Hasılat (Ciro)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {salesStats.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {item.productName}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {item.brand || item.model ? `${item.brand || '-'} / ${item.model || '-'}` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            item.type === 'PHYSICAL' && 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                            item.type === 'SOFTWARE' && 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                            item.type === 'SERVICE' && 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
                          )}
                        >
                          {item.type === 'PHYSICAL' ? 'Fiziksel' : item.type === 'SOFTWARE' ? 'Yazılım' : 'Hizmet'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                        {item.totalSoldQuantity} adet
                      </td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">
                        {item.salesCount} kez satıldı
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-green-700 dark:text-green-400">
                        {formatMoney(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ================= GÖRÜNÜM 2: ÜRÜN VE HİZMET KATALOĞU ================= */
        <div className="space-y-4">
          {/* Arama Barı */}
          <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün adı, marka, model veya ürün kodu ara..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-navy-600"
              />
            </div>
            <span className="text-xs text-muted-foreground font-semibold px-2">
              {products.length} kayıt listelendi
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-navy-700 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">Katalog yükleniyor...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Package className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">Kayıtlı ürün veya hizmet bulunamadı.</p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-3 text-xs text-navy-600 dark:text-navy-400 font-bold underline cursor-pointer"
              >
                Yeni Ürün Tanımla &rarr;
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Ürün / Hizmet Tanımı</th>
                    <th className="py-3 px-4">Marka & Model</th>
                    <th className="py-3 px-4">Tür</th>
                    <th className="py-3 px-4">Ürün Kodu</th>
                    <th className="py-3 px-4">Barkod & Takip</th>
                    <th className="py-3 px-4 text-right">Liste Fiyatı</th>
                    <th className="py-3 px-4 text-center">KDV %</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-foreground block">{p.name}</span>
                            {p.description && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {p.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {p.brand || p.model ? (
                          <div>
                            <span>{p.brand || '-'}</span>
                            {p.model && <span className="text-muted-foreground text-[11px] block">{p.model}</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                            p.type === 'PHYSICAL' && 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                            p.type === 'SOFTWARE' && 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                            p.type === 'SERVICE' && 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
                          )}
                        >
                          {p.type === 'PHYSICAL' ? 'Fiziksel Donanım' : p.type === 'SOFTWARE' ? 'Yazılım Lisansı' : 'Hizmet Paketi'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.code ? <CopyableCode code={p.code} label="Ürün Kodu" /> : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => setBarcodeModalProduct(p)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            title="Barkodları Yönet"
                          >
                            <ScanBarcode className="w-3 h-3 text-navy-600 dark:text-navy-400" />
                            <span>{p.barcodes?.length ? `${p.barcodes.length} Barkod` : '+ Barkod'}</span>
                          </button>
                          {(p.trackSerial || p.trackMac) && (
                            <div className="flex items-center gap-1">
                              {p.trackSerial && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                                  Seri No
                                </span>
                              )}
                              {p.trackMac && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200">
                                  MAC
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-700 dark:text-navy-300 text-sm">
                        {formatMoney(p.unitPrice, p.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                        %{p.taxRate}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          title="Ürünü Güncelle"
                          className="px-2.5 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 dark:bg-navy-950/60 dark:hover:bg-navy-900 text-navy-700 dark:text-navy-300 border border-navy-200 dark:border-navy-800 transition-colors inline-flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: BARKOD YÖNETİMİ ================= */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ScanBarcode className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                  Ürün Barkodları
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {barcodeModalProduct.name} ({barcodeModalProduct.brand || '-'} {barcodeModalProduct.model || ''})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBarcodeModalProduct(null)}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Yeni Barkod Okutma / Ekleme */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Yeni Barkod Ekle (Okutunuz veya Yazınız)</label>
              <BarcodeScanInput
                placeholder="EAN-13, UPC-A, GTIN-14 barkod okutun..."
                autoFocus
                existingCodes={barcodeModalProduct.barcodes?.map((b: any) => b.barcode) || []}
                onScan={handleAddBarcode}
              />
            </div>

            {/* Mevcut Barkodlar Listesi */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-foreground">Kayıtlı Barkodlar</label>
              {!barcodeModalProduct.barcodes?.length ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Bu ürüne henüz barkod tanımlanmamış.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {barcodeModalProduct.barcodes.map((b: any) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-foreground">{b.barcode}</span>
                        {b.isDefault && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            Varsayılan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!b.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBarcode(b.id)}
                            className="text-[11px] font-semibold text-navy-700 hover:text-navy-900 dark:text-navy-300 dark:hover:text-white px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Varsayılan Yap
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveBarcode(b.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          title="Barkodu Kaldır"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBarcodeModalProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
