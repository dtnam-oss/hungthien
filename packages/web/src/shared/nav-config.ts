import type { ComponentType, SVGProps } from 'react';
import {
  DashboardIcon, ReportPnlIcon, FleetReportIcon,
  TripIcon, DriverPortalIcon, VehicleIcon, FuelPumpIcon,
  CustomerIcon, SupplierIcon, EmployeeIcon,
  PricingIcon, ReconcileIcon, DebtIcon,
  RoleIcon, AuditLogIcon, SettingsIcon,
  GuideIcon, CalendarPlanIcon, AssignRoleIcon, PayrollIcon,
} from './icons';

/* ── Types ─────────────────────────────────────────────────────────── */

export interface NavItem {
  key: string;
  label: string;
  description: string;
  path: string;
  module: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isNew?: boolean;
}

export interface NavSubMenu {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: NavItem[];
}

export interface NavGroup {
  key: string;
  label: string;
  items: (NavItem | NavSubMenu)[];
}

export function isSubMenu(item: NavItem | NavSubMenu): item is NavSubMenu {
  return 'children' in item;
}

/* ── Config ────────────────────────────────────────────────────────── */

export const NAV_GROUPS: NavGroup[] = [
  /* ─ 1. Báo cáo ───────────────────────────────────────────────── */
  {
    key: 'reports',
    label: 'Báo cáo',
    items: [
      { key: 'dashboard', label: 'Dashboard', description: 'Tổng quan chuyến đi và doanh thu', path: '/dashboard', module: 'trip', icon: DashboardIcon },
      { key: 'report-pnl', label: 'Lãi lỗ', description: 'Báo cáo lãi lỗ theo kỳ, khách hàng, tuyến', path: '/reports/pnl', module: 'trip', icon: ReportPnlIcon, isNew: true },
      { key: 'report-fleet', label: 'Hiệu quả đội xe', description: 'Phân tích hiệu suất và chi phí từng xe', path: '/reports/fleet', module: 'vehicle', icon: FleetReportIcon, isNew: true },
    ],
  },

  /* ─ 2. Vận hành ──────────────────────────────────────────────── */
  {
    key: 'operations',
    label: 'Vận hành',
    items: [
      {
        key: 'trip-menu',
        label: 'Chuyến đi',
        icon: TripIcon,
        children: [
          { key: 'trip-list', label: 'Danh sách chuyến', description: 'Quản lý chuyến đi — tạo, sửa, theo dõi trạng thái', path: '/trips', module: 'trip', icon: TripIcon },
          { key: 'trip-plan', label: 'Kế hoạch', description: 'Kế hoạch chuyến cố định — tự tạo chuyến theo lịch hàng tuần', path: '/trip-plans', module: 'trip', icon: CalendarPlanIcon, isNew: true },
          { key: 'driver-portal', label: 'Cổng tài xế', description: 'Giao diện dành cho tài xế — nhận chuyến, cập nhật tiến trình', path: '/driver', module: 'trip', icon: DriverPortalIcon },
        ],
      },
      { key: 'vehicles', label: 'Phương tiện', description: 'Danh sách xe, thông tin kỹ thuật, tài xế gắn xe', path: '/vehicles', module: 'vehicle', icon: VehicleIcon },
      { key: 'fuel', label: 'Nhiên liệu', description: 'Nhập xuất, phiếu PLX, chốt dầu theo kỳ', path: '/fuel', module: 'vehicle', icon: FuelPumpIcon, isNew: true },
    ],
  },

  /* ─ 3. Đối tác & Nhân sự ─────────────────────────────────────── */
  {
    key: 'partners',
    label: 'Đối tác & Nhân sự',
    items: [
      { key: 'customers', label: 'Khách hàng', description: 'Danh mục khách hàng — mã, tên, liên hệ', path: '/customers', module: 'customer', icon: CustomerIcon, isNew: true },
      { key: 'suppliers', label: 'Nhà cung cấp', description: 'Nhà xe, đối tác vận tải bên ngoài', path: '/suppliers', module: 'supplier', icon: SupplierIcon },
      { key: 'employees', label: 'Nhân viên', description: 'Quản lý nhân sự, chức danh, tài khoản đăng nhập', path: '/employees', module: 'employee', icon: EmployeeIcon },
    ],
  },

  /* ─ 4. Tài chính ─────────────────────────────────────────────── */
  {
    key: 'finance',
    label: 'Tài chính',
    items: [
      {
        key: 'pricing-menu',
        label: 'Bảng giá',
        icon: PricingIcon,
        children: [
          { key: 'pricing', label: 'Giá KH', description: 'Giá nhận từ khách hàng theo tuyến, loại xe', path: '/pricing', module: 'pricing', icon: PricingIcon },
          { key: 'pricing-supplier', label: 'Giá bán NCC', description: 'Giá bán lại cho nhà thầu phụ', path: '/pricing-supplier', module: 'pricing', icon: PricingIcon },
        ],
      },
      {
        key: 'reconciliation-menu',
        label: 'Đối soát',
        icon: ReconcileIcon,
        children: [
          { key: 'reconciliation', label: 'Đối soát KH', description: 'Đối soát doanh thu với khách hàng', path: '/reconciliation', module: 'pricing', icon: ReconcileIcon },
          { key: 'reconciliation-supplier', label: 'Đối soát NCC', description: 'Đối soát chi phí với nhà cung cấp', path: '/reconciliation-supplier', module: 'pricing', icon: ReconcileIcon },
        ],
      },
      { key: 'debts', label: 'Công nợ', description: 'Theo dõi công nợ phải thu, phải trả', path: '/debts', module: 'pricing', icon: DebtIcon, isNew: true },
      { key: 'payroll', label: 'Bảng lương', description: 'Tính lương tài xế và nhân viên văn phòng', path: '/payroll', module: 'payroll', icon: PayrollIcon },
    ],
  },

  /* ─ 5. Hệ thống ─────────────────────────────────────────────── */
  {
    key: 'system',
    label: 'Hệ thống',
    items: [
      { key: 'roles', label: 'Vai trò & Quyền', description: 'Ma trận phân quyền theo vai trò', path: '/roles', module: 'role', icon: RoleIcon },
      { key: 'assign-roles', label: 'Gán quyền NV', description: 'Gán vai trò cho nhân viên', path: '/assign-roles', module: 'role', icon: AssignRoleIcon },
      { key: 'audit-log', label: 'Nhật ký', description: 'Lịch sử thao tác trong hệ thống', path: '/audit-log', module: 'role', icon: AuditLogIcon, isNew: true },
      { key: 'settings', label: 'Cấu hình', description: 'Cài đặt chung hệ thống', path: '/settings', module: 'role', icon: SettingsIcon, isNew: true },
    ],
  },

  /* ─ 6. Tài liệu ─────────────────────────────────────────────── */
  {
    key: 'docs',
    label: 'Tài liệu',
    items: [
      { key: 'guide', label: 'Hướng dẫn sử dụng', description: 'Tài liệu hướng dẫn cho người dùng mới', path: '/guide', module: 'role', icon: GuideIcon },
    ],
  },
];

/* ── Flat list of all leaf items (for launchpad, search) ──────────── */

export function getAllNavItems(): NavItem[] {
  const items: NavItem[] = [];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isSubMenu(item)) {
        items.push(...item.children);
      } else {
        items.push(item);
      }
    }
  }
  return items;
}

/* ── Check if a path matches a nav item (for active state) ────────── */

export function isPathActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}
