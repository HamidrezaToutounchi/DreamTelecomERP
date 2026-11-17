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
  ShieldCheck,
  Warehouse,
  Truck,
  PackagePlus,
  PackageMinus,
  Wrench,
  ClipboardList,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Boxes,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import { DreamLogo } from '@/components/common/DreamLogo';
import { FollowUpNotifications } from '@/components/layout/FollowUpNotifications';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { ExchangeRateBadge } from '@/components/common/ExchangeRateBadge';
import { cn } from '@/lib/utils';

export const AppLayout: React.FC = () => {
  const { user, logout, isManager, can } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Gruplandırılmış Menü Yapısı
  const menuGroups = [
    {
      id: 'crm',
      title: 'CRM MODÜLÜ',
      icon: Briefcase,
      items: [
        { name: 'Potansiyel Müşteriler', href: '/leads', icon: Target, show: can('LEADS', 'view') },
        { name: 'Müşteriler', href: '/customers', icon: Users, show: can('CUSTOMERS', 'view') },
        { name: 'Teklif Yönetimi', href: '/quotes', icon: FileSpreadsheet, show: can('QUOTES', 'view') },
        { name: 'Satış & Faturalar', href: '/sales', icon: BadgeDollarSign, show: can('SALES', 'view') },
        { name: 'Ürün & Hizmetler', href: '/products', icon: Package, show: can('PRODUCTS', 'view') },
        { name: 'Müşteri Kategorileri', href: '/categories', icon: Tags, show: can('CATEGORIES', 'view') },
      ].filter((item) => item.show),
    },
    {
      id: 'stock',
      title: 'STOK & SEVKİYAT',
      icon: Boxes,
      items: [
        { name: 'Mal Kabul (Stok Girişi)', href: '/stock/entries', icon: PackagePlus, show: can('STOCK_ENTRY', 'view') },
        { name: 'Stok Çıkışı (Sevkiyat)', href: '/stock/exits', icon: PackageMinus, show: can('STOCK_EXIT', 'view') },
        { name: 'Arıza & Servis (RMA)', href: '/stock/faults', icon: Wrench, show: can('FAULTS', 'view') },
        { name: 'Stok Raporları', href: '/stock/reports', icon: ClipboardList, show: can('STOCK_VIEW', 'view') || can('REPORTS', 'view') },
        { name: 'Depolar', href: '/warehouses', icon: Warehouse, show: can('WAREHOUSES', 'view') },
        { name: 'Tedarikçiler', href: '/suppliers', icon: Truck, show: can('SUPPLIERS', 'view') },
      ].filter((item) => item.show),
    },
    {
      id: 'admin',
      title: 'YÖNETİM & AYARLAR',
      icon: Settings,
      items: [
        { name: 'Yönetici Raporları', href: '/analytics', icon: BarChart3, show: can('REPORTS', 'view') },
        { name: 'Kullanıcı Yönetimi', href: '/users', icon: UserPlus, show: can('USERS', 'view') },
        { name: 'Roller & Yetkiler', href: '/roles', icon: ShieldCheck, show: can('ROLES', 'view') },
        { name: 'Sevkiyat Onay Akışı', href: '/stock/approval-settings', icon: CheckSquare, show: isManager || Boolean(user?.isSuperAdmin) },
        { name: 'Şirket Profilleri', href: '/companies', icon: Building2, show: can('COMPANIES', 'view') },
        { name: 'İşlem Logları', href: '/audit-logs', icon: Activity, show: can('AUDIT_LOGS', 'view') },
      ].filter((item) => item.show),
    },
  ].filter((group) => group.items.length > 0);

  // Hangi grupların açık olduğu state (varsayılan: tümü açık)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sol Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-card shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200/80 dark:border-slate-800">
          <DreamLogo size="md" />
        </div>

        {/* Menü Linkleri */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
          {/* Bağımsız Üst Link: Ana Sayfa */}
          <div>
            <Link
              to="/dashboard"
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all h-10',
                location.pathname === '/dashboard' || location.pathname === '/'
                  ? 'bg-navy-700 text-white shadow-xs dark:bg-navy-600'
                  : 'text-slate-600 hover:text-navy-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60',
              )}
            >
              <LayoutDashboard className={cn('w-4 h-4 shrink-0', location.pathname === '/dashboard' || location.pathname === '/' ? 'text-white' : 'text-slate-400')} />
              <span>Ana Sayfa</span>
            </Link>
          </div>

          {/* Gruplandırılmış Modüller */}
          {menuGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id] ?? false;
            const hasActiveChild = group.items.some((item) => location.pathname.startsWith(item.href));
            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="space-y-1">
                {/* Grup Başlığı (Açılır/Kapanır) */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer',
                    hasActiveChild
                      ? 'text-navy-700 dark:text-navy-300 bg-slate-100/60 dark:bg-slate-800/40'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="w-3.5 h-3.5" />
                    {group.title}
                  </span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {/* Grup İçi Alt Menü Linkleri */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pl-1.5 border-l-2 border-slate-100 dark:border-slate-800/80 ml-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all h-9',
                            isActive
                              ? 'bg-navy-700 text-white shadow-xs dark:bg-navy-600'
                              : 'text-slate-600 hover:text-navy-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60',
                          )}
                        >
                          <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dream Telecom ERP</span>
              <span className="text-xs text-slate-400 mx-2">•</span>
              <span className="text-xs text-slate-400 font-medium">Satış, Stok & Kurumsal Yönetim Portalı</span>
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
          <div className="lg:hidden bg-card border-b border-slate-200 dark:border-slate-800 p-4 space-y-3 max-h-[80vh] overflow-y-auto">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-navy-700 text-white"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ana Sayfa</span>
            </Link>

            {menuGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  {group.title}
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <item.icon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            ))}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-navy-700 dark:text-navy-300"
              >
                <UserIcon className="w-4 h-4" /> Profilimi Düzenle
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-red-600"
              >
                <LogOut className="w-4 h-4" /> Çıkış Yap
              </button>
            </div>
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
