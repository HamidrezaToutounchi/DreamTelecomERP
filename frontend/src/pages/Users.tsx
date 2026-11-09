import React, { useState } from 'react';
import {
  UserPlus,
  Users as UsersIcon,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  XCircle,
  Plus,
  KeyRound,
  Mail,
  User,
} from 'lucide-react';
import {
  useUsersControllerFindAll,
  useUsersControllerCreate,
  useUsersControllerUpdate,
} from '@/api/generated';
import { CreateUserDtoRole as Role } from '@/api/model';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const UsersPage: React.FC = () => {
  const { data: users, isLoading, refetch } = useUsersControllerFindAll();
  const createUserMutation = useUsersControllerCreate();
  const updateUserMutation = useUsersControllerUpdate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.SALES_REP);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        data: {
          fullName,
          email,
          password,
          role,
        },
      });
      toast.success('Kullanıcı başarıyla oluşturuldu.');
      setIsModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole(Role.SALES_REP);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı oluşturulamadı.');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean, userName: string) => {
    const nextStatus = !currentStatus;
    if (
      !confirm(
        `"${userName}" kullanıcısının durumunu ${nextStatus ? 'Aktif' : 'Pasif'} yapmak istediğinize emin misiniz?`,
      )
    )
      return;

    try {
      await updateUserMutation.mutateAsync({
        id: userId,
        data: {
          isActive: nextStatus,
        },
      });
      toast.success('Kullanıcı durumu güncellendi.');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı durumu güncellenemedi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık ve Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-navy-700 dark:text-navy-400" />
            Kullanıcı & Temsilci Yönetimi
          </h1>
          <p className="text-sm text-muted-foreground">
            Satış temsilcileri ve satış müdürlerini yönetin, yeni ekip arkadaşları ekleyin ve yetkilendirin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Kullanıcı Listesi Tablosu */}
      <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Kullanıcılar yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-muted-foreground uppercase text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3">Kullanıcı Adı</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users && (users as any[]).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-navy-100 dark:bg-navy-950 text-navy-700 dark:text-navy-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.fullName?.charAt(0) || 'U'}
                      </div>
                      {u.fullName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          u.role === Role.SALES_MANAGER
                            ? 'bg-navy-100 text-navy-800 dark:bg-navy-950 dark:text-navy-300 border border-navy-200 dark:border-navy-800'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
                        )}
                      >
                        {u.role === Role.SALES_MANAGER ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        {u.role === Role.SALES_MANAGER ? 'Satış Müdürü' : 'Satış Temsilcisi'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold',
                          u.isActive !== false ? 'text-green-700 dark:text-green-400' : 'text-slate-400',
                        )}
                      >
                        {u.isActive !== false ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {u.isActive !== false ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">
                      {formatDate(u.createdAt, 'dd.MM.yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u.id, u.isActive !== false, u.fullName)}
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-md border transition-colors cursor-pointer',
                          u.isActive !== false
                            ? 'border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                            : 'border-green-200 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40',
                        )}
                      >
                        {u.isActive !== false ? 'Pasife Al' : 'Aktif Et'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yeni Kullanıcı Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-navy-700" />
                Yeni Kullanıcı Ekle
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Örn: Caner Korkmaz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  E-posta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="ornek@dreamtelecom.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Geçici Parola <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="En az 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Sistem Rolü & Yetkisi <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-semibold"
                >
                  <option value={Role.SALES_REP}>Satış Temsilcisi (Yalnızca kendi portföyünü görür)</option>
                  <option value={Role.SALES_MANAGER}>Satış Müdürü (Tüm ekibi, raporları ve havuzu yönetir)</option>
                </select>
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
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Ekleniyor...' : 'Kullanıcıyı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
