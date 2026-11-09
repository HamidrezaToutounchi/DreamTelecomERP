import React, { useState } from 'react';
import {
  Tags,
  Plus,
  Trash2,
  FolderPlus,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  useCategoriesControllerFindAll,
  useCategoriesControllerCreate,
  useCategoriesControllerRemove,
} from '@/api/generated';
import { toast } from 'sonner';

export const CategoriesPage: React.FC = () => {
  const { data: categories, isLoading, refetch } = useCategoriesControllerFindAll();
  const createCategoryMutation = useCategoriesControllerCreate();
  const removeCategoryMutation = useCategoriesControllerRemove();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#004A93');

  const colorPresets = [
    { label: 'Navy', value: '#004A93' },
    { label: 'Teal', value: '#006F8D' },
    { label: 'Yeşil', value: '#78C042' },
    { label: 'Mor', value: '#7C3AED' },
    { label: 'Amber', value: '#D97706' },
    { label: 'Kırmızı', value: '#DC2626' },
  ];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Kategori adı zorunludur.');
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        },
      });
      toast.success('Müşteri kategorisi başarıyla eklendi.');
      setName('');
      setDescription('');
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kategori eklenemedi.');
    }
  };

  const handleDelete = async (id: string, catName: string) => {
    if (!confirm(`"${catName}" kategorisini silmek istediğinize emin misiniz?`)) return;

    try {
      await removeCategoryMutation.mutateAsync({ id });
      toast.success('Kategori silindi.');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kategori silinemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık & Buton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tags className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            Müşteri Kategorileri
          </h1>
          <p className="text-sm text-muted-foreground">
            Müşterileri sektörlerine veya büyüklüklerine göre sınıflandırarak analitik raporlarda filtreleyin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Yeni Kategori Ekle
        </button>
      </div>

      {/* Kategori Kartları / Listesi */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground bg-card border rounded-xl">
          Kategoriler yükleniyor...
        </div>
      ) : !categories || (categories as any[]).length === 0 ? (
        <div className="p-12 text-center bg-card border rounded-xl border-dashed">
          <FolderPlus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">Henüz kategori bulunmuyor</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Müşterilerinizi Telekom Operatörü, Kamu, Kurumsal vb. şeklinde gruplamak için ilk kategoriyi oluşturun.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-navy-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Kategori Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(categories as any[]).map((cat) => (
            <div
              key={cat.id}
              className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-navy-300 dark:hover:border-navy-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#004A93' }}
                    />
                    <h3 className="font-bold text-foreground text-base">{cat.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id, cat.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Kategoriyi Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {cat.description || 'Açıklama belirtilmemiş.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
                <span>Bağlı Müşteriler</span>
                <span className="font-bold text-navy-700 dark:text-navy-400 font-mono">
                  {cat._count?.customers ?? 0} Müşteri
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Kategori Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Tags className="w-4 h-4 text-navy-700" />
                Yeni Müşteri Kategorisi
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Kategori Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Telekom Operatörü, Kamu Kurumu, KOBİ..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  placeholder="Bu kategori kapsamındaki müşterilerin tanımı..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">Etiket Rengi</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer border-2"
                      style={{
                        backgroundColor: preset.value,
                        borderColor: color === preset.value ? '#1e293b' : 'transparent',
                      }}
                      title={preset.label}
                    >
                      {color === preset.value && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded-md cursor-pointer border p-0"
                    title="Özel Renk Seç"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createCategoryMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
