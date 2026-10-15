import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { QuickNav } from './QuickNav';
import { ThemeToggle } from './ThemeToggle';
import { Menu, LayoutDashboard, MapPin, Truck, Users, ChevronRight } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import { NAV_GROUPS, isSubMenu, isPathActive } from '../nav-config';

/* ── Breadcrumb resolver ──────────────────────────────────────────── */

function useBreadcrumb(pathname: string) {
  return useMemo(() => {
    const crumbs: { label: string; path?: string }[] = [];
    if (pathname === '/') return [{ label: 'Trang chủ', path: '/' }];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (isSubMenu(item)) {
          for (const child of item.children) {
            if (isPathActive(child.path, pathname)) {
              crumbs.push({ label: group.label });
              crumbs.push({ label: item.label });
              crumbs.push({ label: child.label, path: child.path });
              return crumbs;
            }
          }
        } else if (isPathActive(item.path, pathname)) {
          crumbs.push({ label: group.label });
          crumbs.push({ label: item.label, path: item.path });
          return crumbs;
        }
      }
    }
    return crumbs;
  }, [pathname]);
}

/* ── Bottom nav (mobile) ──────────────────────────────────────────── */

const BOTTOM_NAV = [
  { path: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/trips', label: 'Chuyến', icon: MapPin },
  { path: '/vehicles', label: 'Xe', icon: Truck },
  { path: '/employees', label: 'Nhân sự', icon: Users },
];

/* ── Layout ────────────────────────────────────────────────────────── */

export function Layout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const breadcrumbs = useBreadcrumb(location.pathname);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0 h-full">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 lg:hidden animate-fade-in" style={{ background: 'rgba(24,24,27,0.45)' }} onClick={closeMobileSidebar} aria-hidden />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-slide-in-left" style={{ boxShadow: 'var(--shadow-pop)' }}>
            <Sidebar mobile onClose={closeMobileSidebar} />
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="topbar">
          <button type="button" onClick={() => setMobileSidebarOpen(true)} className="icon-btn lg:hidden" aria-label="Mở menu">
            <Menu />
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            <Link to="/" className="crumb" style={{ textDecoration: 'none' }}>HT-TMS</Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--faint)' }} />
                <span className={clsx('crumb truncate', crumb.path && 'is-current')} aria-current={crumb.path ? 'page' : undefined}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>

          {/* Quick nav + theme */}
          <QuickNav />
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto min-h-0 flex flex-col">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="bottom-nav lg:hidden" aria-label="Điều hướng nhanh">
          {BOTTOM_NAV.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={clsx('bottom-nav-item', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                <Icon />
                {item.label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMobileSidebarOpen(true)} className="bottom-nav-item">
            <Menu />
            Menu
          </button>
        </nav>
      </div>
    </div>
  );
}
