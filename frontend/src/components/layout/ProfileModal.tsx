import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, X, Shield, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAuthControllerUpdateProfile } from '@/api/generated';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const updateProfileMutation = useAuthControllerUpdateProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Ad Soyad alanı boş bırakılamaz.');
      return;
    }

    if (!email.trim()) {
      toast.error('E-posta alanı boş bırakılamaz.');
      return;
    }

    if (changePassword) {
      if (!currentPassword) {
        toast.error('Parolanızı değiştirmek için mevcut parolanızı girmelisiniz.');
        return;
      }
      if (newPassword.length < 6) {
        toast.error('Yeni parola en az 6 karakter olmalıdır.');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('Yeni parolalar birbiriyle uyuşmuyor.');
        return;
      }
    }

    try {
      const updated = await updateProfileMutation.mutateAsync({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase(),
          currentPassword: changePassword ? currentPassword : undefined,
          newPassword: changePassword ? newPassword : undefined,
        },
      });

      updateUser({
        fullName: updated.fullName,
        phone: (updated.phone as unknown as string) || null,
        email: updated.email,
      });

      toast.success('Profil bilgileriniz başarıyla güncellendi.');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Profil güncellenirken bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-navy-100 dark:bg-navy-900/60 text-navy-700 dark:text-navy-300 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Profilimi Düzenle</h2>
              <p className="text-xs text-muted-foreground">Kişisel iletişim ve giriş bilgilerinizi güncelleyin.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Sistem Rolü Bilgisi */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-navy-700 dark:text-navy-400" />
              <span className="font-semibold">Sistem Yetkisi:</span>
            </div>
            <span className="font-bold text-navy-800 dark:text-navy-200 bg-navy-100/70 dark:bg-navy-950 px-2.5 py-0.5 rounded border border-navy-200 dark:border-navy-800">
              {user?.role === 'SALES_MANAGER' ? 'Sistem Yöneticisi (Müdür)' : 'Satış Temsilcisi'}
            </span>
          </div>

          {/* Ad Soyad */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Ad Soyad *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground focus:ring-1 focus:ring-navy-600 outline-none"
            />
          </div>

          {/* Telefon Numarası */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              Telefon Numarası (Teklif PDF'inde yer alır)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Örn: 0555 123 45 67"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground focus:ring-1 focus:ring-navy-600 outline-none"
            />
          </div>

          {/* E-posta */}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              E-posta Adresi *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-foreground focus:ring-1 focus:ring-navy-600 outline-none"
            />
          </div>

          {/* Parola Değiştirme Akordiyonu */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setChangePassword(!changePassword)}
              className="flex items-center gap-2 text-xs font-bold text-navy-700 dark:text-navy-300 hover:underline cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{changePassword ? 'Parola Değiştirmeyi Kapat' : 'Parolamı Değiştirmek İstiyorum'}</span>
            </button>

            {changePassword && (
              <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Mevcut Parola *
                  </label>
                  <input
                    type="password"
                    required={changePassword}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Şu anki geçerli parolanız"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Yeni Parola *</label>
                    <input
                      type="password"
                      required={changePassword}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="En az 6 karakter"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Yeni Parola (Tekrar) *</label>
                    <input
                      type="password"
                      required={changePassword}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Yeni parolayı onaylayın"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
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
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-700 hover:bg-navy-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
