import React, { useState } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Target,
  Users,
  FileSpreadsheet,
  BadgeDollarSign,
  Package,
  BarChart3,
  UserPlus,
  Tags,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  Activity,
  Building2,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { DreamLogo } from '@/components/common/DreamLogo';
import { FollowUpNotifications } from '@/components/layout/FollowUpNotifications';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { ExchangeRateBadge } from '@/components/common/ExchangeRateBadge';
import { cn } from '@/lib/utils';

export const AppLayout: React.FC = () => {
  const { user, logout, isManager } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const navigation = [
    { name: 'Ana Sayfa', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Potansiyel Müşteriler (Leads)', href: '/leads', icon: Target },
    { name: 'Müşteriler', href: '/customers', icon: Users },
    { name: 'Teklif Yönetimi', href: '/quotes', icon: FileSpreadsheet },
    { name: 'Satış & Faturalar', href: '/sales', icon: BadgeDollarSign },
    { name: 'Ürün & Hizmetler', href: '/products', icon: Package },
    ...(isManager
      ? [
          { name: 'Yönetici Raporları', href: '/analytics', icon: BarChart3 },
          { name: 'Kullanıcı Yönetimi', href: '/users', icon: UserPlus },
          { name: 'Şirket Profilleri', href: '/companies', icon: Building2 },
          { name: 'Müşteri Kategorileri', href: '/categories', icon: Tags },
          { name: 'İşlem Logları', href: '/audit-logs', icon: Activity },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sol Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-card shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800">
          <DreamLogo size="md" />
        </div>

        {/* Menü Linkleri */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all h-11',
                  isActive
                    ? 'bg-navy-700 text-white shadow-xs dark:bg-navy-600'
                    : 'text-slate-600 hover:text-navy-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Kullanıcı ve Alt Kısım */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
          {/* Profilim Butonu */}
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer"
            title="Profilimi Düzenle"
          >
            <div className="flex flex-col truncate pr-2">
              <span className="text-xs font-bold truncate text-foreground group-hover:text-navy-700 dark:group-hover:text-navy-300">
                {user?.fullName}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">{user?.email}</span>
            </div>
            <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-navy-700 dark:group-hover:text-navy-300 shrink-0" />
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
            {/* Tema Seçici */}
            <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn('p-1 rounded cursor-pointer', theme === 'light' && 'bg-white dark:bg-slate-700 shadow-xs text-navy-700')}
                title="Açık Tema"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn('p-1 rounded cursor-pointer', theme === 'dark' && 'bg-white dark:bg-slate-700 shadow-xs text-navy-300')}
                title="Koyu Tema"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Ana İçerik */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Üst Bar (Desktop & Mobil) */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-card">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <DreamLogo size="sm" />
            </div>
            <div className="hidden lg:block">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dream Telecom CRM</span>
              <span className="text-xs text-slate-400 mx-2">•</span>
              <span className="text-xs text-slate-400 font-medium">Müşteri İlişkileri & Satış Portalı</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ExchangeRateBadge />
            <FollowUpNotifications />

            {/* Kullanıcı Profil Butonu */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
              title="Profilimi Düzenle"
            >
              <div className="w-6 h-6 rounded-full bg-navy-100 dark:bg-navy-900 text-navy-800 dark:text-navy-200 flex items-center justify-center font-bold text-[10px] uppercase">
                {user?.fullName?.slice(0, 2) || 'DT'}
              </div>
              <span className="hidden sm:inline font-bold text-foreground">{user?.fullName}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700"
              title="Menü"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-card border-b border-slate-200 dark:border-slate-800 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setProfileModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-navy-700 dark:text-navy-300"
            >
              <UserIcon className="w-4 h-4" /> Profilimi Düzenle
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600"
            >
              <LogOut className="w-4 h-4" /> Çıkış Yap
            </button>
          </div>
        )}

        {/* Sayfa Gövdesi */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Profil Düzenleme Modal'ı */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
};
