import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { initSocket, disconnectSocket } from '@/lib/socket';

export interface UserPermissionMap {
  [module: string]: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCancel: boolean;
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: 'SALES_MANAGER' | 'SALES_REP';
  isSuperAdmin?: boolean;
  appRoleId?: string | null;
  appRoleName?: string | null;
  permissions?: UserPermissionMap;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isManager: boolean;
  isSuperAdmin: boolean;
  isRep: boolean;
  can: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'cancel') => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user && token) {
      initSocket(user.id, queryClient);
    } else {
      disconnectSocket();
    }
  }, [user, token, queryClient]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    disconnectSocket();
    queryClient.clear();
    window.location.href = '/login';
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const isManager = user?.role === 'SALES_MANAGER' || isSuperAdmin;
  const isRep = user?.role === 'SALES_REP';

  const can = (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'cancel'): boolean => {
    if (!user) return false;

    const isStock =
      module.startsWith('STOCK_') ||
      module === 'WAREHOUSES' ||
      module === 'SUPPLIERS' ||
      module === 'FAULTS';

    // Stok modüllerinde SİLME yetkisi hiç kimseye (super admin dahil) verilemez
    if (isStock && action === 'delete') {
      return false;
    }

    // Super Admin her yetkiye sahiptir
    if (user.isSuperAdmin) {
      return true;
    }

    // Onay akışı ayarları SADECE Super Admin'e özeldir
    if (module === 'APPROVAL_SETTINGS') {
      return Boolean(user.isSuperAdmin);
    }

    // Kullanıcının atanmış izin matrisi varsa
    if (user.permissions && user.permissions[module]) {
      const p = user.permissions[module];
      switch (action) {
        case 'view':
          return Boolean(p.canView);
        case 'create':
          return Boolean(p.canCreate);
        case 'edit':
          return Boolean(p.canEdit);
        case 'delete':
          return isStock ? false : Boolean(p.canDelete);
        case 'cancel':
          return isStock ? Boolean(p.canCancel) : false;
        default:
          return false;
      }
    }

    // Geriye dönük uyum (appRoleId yoksa veya permissions henüz yüklenmediyse):
    if (user.role === 'SALES_MANAGER') {
      if (module === 'APPROVAL_SETTINGS') return false;
      return true;
    }

    if (user.role === 'SALES_REP') {
      const isCrm = ['LEADS', 'CUSTOMERS', 'QUOTES', 'SALES', 'PRODUCTS'].includes(module);
      if (isCrm && (action === 'view' || action === 'create' || action === 'edit')) {
        return true;
      }
      return false;
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isManager,
        isSuperAdmin,
        isRep,
        can,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
