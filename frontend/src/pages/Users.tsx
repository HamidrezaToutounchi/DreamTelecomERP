import React, { useState, useEffect } from 'react';
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
  Phone,
  Pencil,
  Shield,
  ShieldCheck,
  Package,
  Wrench,
  Boxes,
} from 'lucide-react';
import {
  useUsersControllerFindAll,
  useUsersControllerCreate,
  useUsersControllerUpdate,
  useRolesControllerFindAll,
} from '@/api/generated';
import { CreateUserDtoRole as Role } from '@/api/model';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export const UsersPage: React.FC = () => {
  const { data: users, isLoading, refetch } = useUsersControllerFindAll();
  const { data: roles } = useRolesControllerFindAll();
  const createUserMutation = useUsersControllerCreate();
  const updateUserMutation = useUsersControllerUpdate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [appRoleId, setAppRoleId] = useState<string>('');

  // Düzenleme Modalı State'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAppRoleId, setEditAppRoleId] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Roller yüklendiğinde varsayılan rolü ata
  useEffect(() => {
    if (roles && roles.length > 0 && !appRoleId) {
      const defaultRole = roles.find((r) => r.name === 'Depo Sorumlusu') || roles[0];
      setAppRoleId(defaultRole.id);
    }
  }, [roles, appRoleId]);

  const handleOpenCreateModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    const defaultRole = roles?.find((r) => r.name === 'Depo Sorumlusu') || roles?.[0];
    setAppRoleId(defaultRole ? defaultRole.id : '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: any) => {
    setSelectedUser(u);
    setEditFullName(u.fullName || '');
    setEditEmail(u.email || '');
    setEditPhone(u.phone || '');
    setEditPassword('');

    // Eğer kullanıcının appRoleId'si varsa onu kullan, yoksa rol adından eşleştir
    let initialRoleId = u.appRoleId || '';
    if (!initialRoleId && roles) {
      const match = roles.find((r) =>
        u.role === Role.SALES_MANAGER
          ? r.name === 'Satış Müdürü' || r.name === 'Yönetici'
          : r.name === 'Satış Temsilcisi'
      );
      if (match) initialRoleId = match.id;
    }

    setEditAppRoleId(initialRoleId);
    setEditIsActive(u.isActive !== false);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editFullName.trim() || !editEmail.trim()) {
      toast.error('Ad Soyad ve E-posta alanları zorunludur.');
      return;
    }

    if (!editAppRoleId) {
      toast.error('Lütfen bir kullanıcı rolü seçiniz.');
      return;
    }

    const selectedRole = roles?.find((r) => r.id === editAppRoleId);
    const isManager =
      selectedRole?.name === 'Satış Müdürü' ||
      selectedRole?.name === 'Yönetici' ||
      selectedRole?.name.includes('Müdür');
    const derivedRole = isManager ? Role.SALES_MANAGER : Role.SALES_REP;

    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          fullName: editFullName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || undefined,
          role: derivedRole,
          appRoleId: editAppRoleId || null,
          isActive: editIsActive,
          ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
        },
      });
      toast.success('Kullanıcı bilgileri başarıyla güncellendi.');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kullanıcı bilgileri güncellenemedi.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    if (!appRoleId) {
      toast.error('Lütfen bir kullanıcı rolü seçiniz.');
      return;
    }

    const selectedRole = roles?.find((r) => r.id === appRoleId);
    const isManager =
      selectedRole?.name === 'Satış Müdürü' ||
      selectedRole?.name === 'Yönetici' ||
      selectedRole?.name.includes('Müdür');
    const derivedRole = isManager ? Role.SALES_MANAGER : Role.SALES_REP;

    try {
      await createUserMutation.mutateAsync({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          role: derivedRole,
          appRoleId: appRoleId || undefined,
        },
      });
      toast.success('Kullanıcı başarıyla oluşturuldu.');
      setIsModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
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
          onClick={handleOpenCreateModal}
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
                  <th className="px-4 py-3">Telefon</th>
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
                    <td className="px-4 py-3 text-muted-foreground font-mono">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs">
                            <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            Süper Admin
                          </span>
                        ) : u.appRole ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-xs',
                              u.appRole.name.includes('Depo')
                                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : u.appRole.name.includes('Teknik') || u.appRole.name.includes('Servis')
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : u.appRole.name.includes('Müdür') || u.appRole.name.includes('Yönetici')
                                ? 'bg-navy-50 text-navy-800 dark:bg-navy-950/40 dark:text-navy-300 border-navy-200 dark:border-navy-800'
                                : u.appRole.name.includes('Muhasebe')
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                            )}
                          >
                            {u.appRole.name.includes('Depo') ? (
                              <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            ) : u.appRole.name.includes('Teknik') || u.appRole.name.includes('Servis') ? (
                              <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            ) : u.appRole.name.includes('Müdür') || u.appRole.name.includes('Yönetici') ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-navy-600 dark:text-navy-400" />
                            ) : (
                              <Shield className="w-3.5 h-3.5" />
                            )}
                            {u.appRole.name}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-xs',
                              u.role === Role.SALES_MANAGER
                                ? 'bg-navy-50 text-navy-800 dark:bg-navy-950/40 dark:text-navy-300 border-navy-200 dark:border-navy-800'
                                : 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                            )}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {u.role === Role.SALES_MANAGER ? 'Satış Müdürü' : 'Satış Temsilcisi'}
                          </span>
                        )}
                      </div>
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Kullanıcı Bilgilerini Güncelle"
                        >
                          <Pencil className="w-3.5 h-3.5 text-navy-700 dark:text-navy-400" />
                          <span>Düzenle</span>
                        </button>

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
                      </div>
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
                  Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Örn: 0555 123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                  Kullanıcı Rolü & Yetki Profili <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={appRoleId}
                  onChange={(e) => setAppRoleId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-semibold cursor-pointer"
                >
                  <option value="" disabled>
                    Lütfen Kullanıcı Rolü Seçiniz...
                  </option>
                  {roles?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.description ? `(${r.description})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Kullanıcının sisteme giriş yaptığında erişeceği modülleri (Depo & Stok, Satış & Müşteri CRM, Teknik Servis & Arıza, Muhasebe vb.) belirler.
                </p>
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

      {/* Kullanıcı Düzenleme Modalı */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-navy-700" />
                  Kullanıcı Bilgilerini Güncelle
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedUser.fullName} ({selectedUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-slate-400 hover:text-foreground text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-medium"
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
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Telefon Numarası
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Örn: 0555 123 45 67"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Kullanıcı Rolü & Yetkisi <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editAppRoleId}
                    onChange={(e) => setEditAppRoleId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-semibold cursor-pointer"
                  >
                    <option value="" disabled>
                      Rol Seçiniz...
                    </option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Hesap Durumu <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editIsActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs focus:outline-hidden focus:ring-2 focus:ring-navy-600 font-semibold cursor-pointer"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-foreground">
                    Yeni Parola
                  </label>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Değiştirmek istemiyorsanız boş bırakın)
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Yeni parola belirle (Opsiyonel)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-navy-700 text-white text-xs font-semibold hover:bg-navy-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateUserMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
