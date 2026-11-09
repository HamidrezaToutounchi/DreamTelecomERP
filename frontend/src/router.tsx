import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Navigate,
} from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { LeadsPage } from '@/pages/Leads';
import { LeadDetailPage } from '@/pages/LeadDetail';
import { CustomersPage } from '@/pages/Customers';
import { CustomerDetailPage } from '@/pages/CustomerDetail';
import { QuotesPage } from '@/pages/Quotes';
import { SalesPage } from '@/pages/Sales';
import { ProductsPage } from '@/pages/Products';
import { AnalyticsPage } from '@/pages/Analytics';
import { UsersPage } from '@/pages/Users';
import { CategoriesPage } from '@/pages/Categories';
import { AuditLogsPage } from '@/pages/AuditLogs';
import { CompaniesPage } from '@/pages/Companies';

// 1. Root Route
const rootRoute = createRootRoute();

// 2. Login Route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    const token = localStorage.getItem('token');
    if (token) {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// 3. Authenticated Layout Route
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppLayout,
  beforeLoad: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
});

// 4. Index / Redirect to Dashboard
const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" />,
});

// 5. Dashboard
const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  component: DashboardPage,
});

// 6. Leads
const leadsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/leads',
  component: LeadsPage,
});

// 6b. Lead Detail & Activity
const leadDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/leads/$leadId',
  component: LeadDetailPage,
});

// 7. Customers
const customersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/customers',
  component: CustomersPage,
});

// 8. Customer Detail
const customerDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/customers/$customerId',
  component: CustomerDetailPage,
});

// 9. Quotes
const quotesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/quotes',
  component: QuotesPage,
});

// 10. Sales
const salesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/sales',
  component: SalesPage,
});

// 10b. Products & Services
const productsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/products',
  component: ProductsPage,
});

// 11. Analytics (SALES_MANAGER Only)
const analyticsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/analytics',
  component: AnalyticsPage,
  beforeLoad: () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (user?.role !== 'SALES_MANAGER') {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// 12. Users (SALES_MANAGER Only)
const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users',
  component: UsersPage,
  beforeLoad: () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (user?.role !== 'SALES_MANAGER') {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// 13. Categories (SALES_MANAGER Only)
const categoriesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/categories',
  component: CategoriesPage,
  beforeLoad: () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (user?.role !== 'SALES_MANAGER') {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// 14. Audit Logs (SALES_MANAGER Only)
const auditLogsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/audit-logs',
  component: AuditLogsPage,
  beforeLoad: () => {
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (user?.role !== 'SALES_MANAGER') {
      throw redirect({ to: '/dashboard' });
    }
  },
});

// 15. Companies (Şirket Profilleri & Antetler)
const companiesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/companies',
  component: CompaniesPage,
});

// Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  appLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    leadsRoute,
    leadDetailRoute,
    customersRoute,
    customerDetailRoute,
    quotesRoute,
    salesRoute,
    productsRoute,
    analyticsRoute,
    usersRoute,
    categoriesRoute,
    auditLogsRoute,
    companiesRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
