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
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  useProductsControllerFindAll,
  useProductsControllerCreate,
  useProductsControllerGetProductSalesSummary,
} from '@/api/generated';
import { useAuth } from '@/context/AuthContext';
import { CopyableCode } from '@/components/common/CopyableCode';
import { formatMoney } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const ProductsPage: React.FC = () => {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PHYSICAL' | 'SOFTWARE' | 'SERVICE' | 'SALES_REPORT'>('ALL');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<'PHYSICAL' | 'SOFTWARE' | 'SERVICE'>('PHYSICAL');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('1000.00');
  const [taxRate, setTaxRate] = useState<number>(20);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);

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

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:3000/api/v1/uploads/product-image', formData, {
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Ürün/Hizmet adı zorunludur.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        data: {
          name: name.trim(),
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          type,
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          unitPrice,
          taxRate: Number(taxRate) || 20,
          imageUrl,
        },
      });

      toast.success('Yeni ürün/hizmet kataloğa eklendi.');
      setCreateModalOpen(false);
      setName('');
      setBrand('');
      setModel('');
      setCode('');
      setDescription('');
      setUnitPrice('1000.00');
      setImageUrl(undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/v1/products'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Ürün eklenemedi.');
    }
  };

  const products = (productsResponse as any)?.data || [];
  const salesStats = (salesReportData as any) || [];

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
          onClick={() => setCreateModalOpen(true)}
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
                onClick={() => setCreateModalOpen(true)}
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
                    <th className="py-3 px-4 text-right">Liste Fiyatı</th>
                    <th className="py-3 px-4 text-center">KDV %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {products.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={`http://localhost:3000${p.imageUrl}`}
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
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-navy-700 dark:text-navy-300 text-sm">
                        {formatMoney(p.unitPrice, p.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                        %{p.taxRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: YENİ ÜRÜN / HİZMET TANIMLA ================= */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-navy-700 dark:text-navy-400" />
                  Yeni Ürün / Hizmet Tanımla
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mükerrer veri kaydını önlemek için isim, marka ve model kombinasyonu kontrol edilir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              {/* Ürün Türü */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Ürün / Hizmet Türü *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('PHYSICAL')}
                    className={cn(
                      'p-2.5 rounded-lg border font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      type === 'PHYSICAL'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 text-muted-foreground',
                    )}
                  >
                    <Server className="w-4 h-4" />
                    <span>Fiziksel Donanım</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('SOFTWARE')}
                    className={cn(
                      'p-2.5 rounded-lg border font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      type === 'SOFTWARE'
                        ? 'bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950 dark:text-purple-200'
                        : 'border-slate-200 dark:border-slate-800 text-muted-foreground',
                    )}
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Yazılım / Lisans</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('SERVICE')}
                    className={cn(
                      'p-2.5 rounded-lg border font-bold text-center transition-all cursor-pointer flex flex-col items-center gap-1',
                      type === 'SERVICE'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 text-muted-foreground',
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Hizmet Paketi</span>
                  </button>
                </div>
              </div>

              {/* Ürün Adı */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Ürün / Hizmet Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: DreamFiber Kurumsal Router 10G"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold"
                />
              </div>

              {/* Marka & Model */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Marka (Örn: Dream Telecom)</label>
                  <input
                    type="text"
                    placeholder="Marka adı"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Model (Örn: DF-10G-PRO)</label>
                  <input
                    type="text"
                    placeholder="Model kodu"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
              </div>

              {/* Kod, Birim Fiyat & KDV */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Ürün Kodu</label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">⚡ Otomatik</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Boş bırakılırsa sistem otomatik üretir"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Liste Fiyatı (TRY) *</label>
                  <input
                    type="text"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">KDV Oranı %</label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold cursor-pointer"
                  >
                    <option value={20}>%20</option>
                    <option value={10}>%10</option>
                    <option value={1}>%1</option>
                    <option value={0}>%0</option>
                  </select>
                </div>
              </div>

              {/* Açıklama */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Kısa Açıklama / Özellikler</label>
                <textarea
                  rows={2}
                  placeholder="Ürün veya hizmetin temel teknik özellikleri..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs"
                />
              </div>

              {/* Fotoğraf Yükleme */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Ürün Fotoğrafı (PDF Teklifinde Görünür)</label>
                <div className="flex items-center gap-3">
                  {imageUrl ? (
                    <div className="relative group w-14 h-14 rounded border border-slate-200 overflow-hidden">
                      <img src={`http://localhost:3000${imageUrl}`} alt="Ürün" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl(undefined)}
                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold"
                      >
                        Kaldır
                      </button>
                    </div>
                  ) : (
                    <label className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-navy-500 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px] mt-0.5">Seç</span>
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
                  <span className="text-[11px] text-muted-foreground">
                    {imageUrl ? 'Fotoğraf hazır. PDF tekliflerinde ürün yanında basılacaktır.' : 'JPG, PNG formatında görsel yükleyebilirsiniz.'}
                  </span>
                </div>
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
                  disabled={createMutation.isPending || isUploading}
                  className="px-5 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Kaydediliyor...' : 'Ürünü Kataloğa Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
