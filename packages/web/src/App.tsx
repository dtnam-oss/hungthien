import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './shared/auth-context';
import { Layout } from './shared/components/Layout';
import { ComingSoon } from './shared/components/ComingSoon';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { Spinner } from './shared/ui';

/* ── Lazy imports ──────────────────────────────────────────────────── */

const LoginPage = lazy(() => import('./modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const LaunchpadPage = lazy(() => import('./modules/home/LaunchpadPage').then((m) => ({ default: m.LaunchpadPage })));
const DashboardPage = lazy(() => import('./modules/trip/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const EmployeeListPage = lazy(() => import('./modules/employee/EmployeeListPage').then((m) => ({ default: m.EmployeeListPage })));
const VehicleListPage = lazy(() => import('./modules/vehicle/VehicleListPage').then((m) => ({ default: m.VehicleListPage })));
const SupplierListPage = lazy(() => import('./modules/supplier/SupplierListPage').then((m) => ({ default: m.SupplierListPage })));
const PricingListPage = lazy(() => import('./modules/pricing/PricingListPage').then((m) => ({ default: m.PricingListPage })));
const TripListPage = lazy(() => import('./modules/trip/TripListPage').then((m) => ({ default: m.TripListPage })));
const TripPlanListPage = lazy(() => import('./modules/trip-plan/TripPlanListPage').then((m) => ({ default: m.TripPlanListPage })));
const DriverPortalPage = lazy(() => import('./modules/driver/DriverPortalPage').then((m) => ({ default: m.DriverPortalPage })));
const RolesPermissionsPage = lazy(() => import('./modules/role/RolesPermissionsPage').then((m) => ({ default: m.RolesPermissionsPage })));
const PayrollPage = lazy(() => import('./modules/payroll/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const AssignRolesPage = lazy(() => import('./modules/role/AssignRolesPage').then((m) => ({ default: m.AssignRolesPage })));
const CustomerListPage = lazy(() => import('./modules/customer/CustomerListPage').then((m) => ({ default: m.CustomerListPage })));

/* ── Suspense fallback ─────────────────────────────────────────────── */

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ minHeight: 240, color: 'var(--muted)' }} role="status" aria-label="Đang tải">
      <Spinner size={22} />
    </div>
  );
}

/* ── Query client ──────────────────────────────────────────────────── */

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

/* ── Route guards ──────────────────────────────────────────────────── */

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/* ── App routes ────────────────────────────────────────────────────── */

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Cổng tài xế: trang độc lập (không có Layout) để tài xế bị chuyển hướng từ "/" vẫn có nội dung */}
        <Route path="/driver" element={<ProtectedRoute><DriverPortalPage /></ProtectedRoute>} />
        <Route path="/" element={
          <ProtectedRoute>
            {user?.isDriver ? <Navigate to="/driver" replace /> : <Layout />}
          </ProtectedRoute>
        }>
          {/* Home — Launchpad */}
          <Route index element={<LaunchpadPage />} />

          {/* Báo cáo */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reports/pnl" element={<ComingSoon title="Báo cáo lãi lỗ" description="Phân tích lãi lỗ theo kỳ, khách hàng, tuyến" />} />
          <Route path="reports/fleet" element={<ComingSoon title="Hiệu quả đội xe" description="Phân tích hiệu suất và chi phí từng xe" />} />

          {/* Vận hành */}
          <Route path="trips" element={<TripListPage />} />
          <Route path="trip-plans" element={<TripPlanListPage />} />
          <Route path="vehicles" element={<VehicleListPage />} />
          <Route path="fuel" element={<ComingSoon title="Nhiên liệu" description="Nhập xuất, phiếu PLX, chốt dầu theo kỳ" />} />

          {/* Đối tác & Nhân sự */}
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="suppliers" element={<SupplierListPage />} />
          <Route path="employees" element={<EmployeeListPage />} />

          {/* Tài chính */}
          <Route path="pricing" element={<PricingListPage priceType="CUSTOMER" />} />
          <Route path="pricing-supplier" element={<PricingListPage priceType="SUPPLIER" />} />
          <Route path="reconciliation" element={<ComingSoon title="Đối soát KH" description="Đối soát doanh thu với khách hàng" />} />
          <Route path="reconciliation-supplier" element={<ComingSoon title="Đối soát NCC" description="Đối soát chi phí với nhà cung cấp" />} />
          <Route path="debts" element={<ComingSoon title="Công nợ" description="Theo dõi công nợ phải thu, phải trả" />} />
          <Route path="payroll" element={<PayrollPage />} />

          {/* Hệ thống */}
          <Route path="roles" element={<RolesPermissionsPage />} />
          <Route path="assign-roles" element={<AssignRolesPage />} />
          <Route path="audit-log" element={<ComingSoon title="Nhật ký" description="Lịch sử thao tác trong hệ thống" />} />
          <Route path="settings" element={<ComingSoon title="Cấu hình" description="Cài đặt chung hệ thống" />} />

          {/* Tài liệu */}
          <Route path="guide" element={<ComingSoon title="Hướng dẫn sử dụng" description="Tài liệu hướng dẫn cho người dùng mới" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/* ── App ───────────────────────────────────────────────────────────── */

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
