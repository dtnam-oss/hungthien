import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronDown, PanelLeftClose, PanelLeft, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../auth-context';
import { NAV_GROUPS, isSubMenu, isPathActive } from '../nav-config';
import type { NavItem, NavSubMenu, NavGroup } from '../nav-config';
import { Avatar, NewTag } from '../ui';

/* ── Constants ─────────────────────────────────────────────────────── */

const COLLAPSED_KEY = 'sidebar-collapsed';

/* ── Sidebar ───────────────────────────────────────────────────────── */

export function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { hasPermission, isLoading, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (mobile) return false;
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (isSubMenu(item) && item.children.some((c) => isPathActive(c.path, location.pathname))) set.add(item.key);
      }
    }
    return set;
  });

  useEffect(() => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const group of NAV_GROUPS) {
        for (const item of group.items) {
          if (isSubMenu(item) && item.children.some((c) => isPathActive(c.path, location.pathname))) {
            if (!next.has(item.key)) { next.add(item.key); changed = true; }
          }
        }
      }
      return changed ? next : prev;
    });
  }, [location.pathname]);

  const toggleMenu = useCallback((key: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const filteredGroups = useMemo(() => {
    if (isLoading) return NAV_GROUPS;
    return NAV_GROUPS
      .map((group) => ({
        ...group,
        items: group.items
          .map((item) => {
            if (isSubMenu(item)) {
              const visibleChildren = item.children.filter((c) => hasPermission(c.module, 'canView'));
              if (visibleChildren.length === 0) return null;
              return { ...item, children: visibleChildren };
            }
            return hasPermission(item.module, 'canView') ? item : null;
          })
          .filter(Boolean) as (NavItem | NavSubMenu)[],
      }))
      .filter((group) => group.items.length > 0);
  }, [hasPermission, isLoading]);

  const handleItemClick = useCallback(() => { if (mobile && onClose) onClose(); }, [mobile, onClose]);
  const handleLogout = useCallback(() => { logout(); navigate('/login'); }, [logout, navigate]);

  const isCollapsed = collapsed && !mobile;

  return (
    <div className={clsx('sidebar', isCollapsed && 'is-collapsed')}>
      {/* Brand */}
      <div className="sidebar-brand">
        <Link to="/" onClick={handleItemClick} className="flex items-center gap-3 min-w-0" style={{ textDecoration: 'none' }} aria-label="HT-TMS — Trang chủ">
          <span className="brand-mark">H</span>
          {!isCollapsed && <span className="brand-name">HT-TMS</span>}
        </Link>
        {!mobile && (
          <button type="button" onClick={toggleCollapsed} className="icon-btn" aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
            {collapsed ? <PanelLeft /> : <PanelLeftClose />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" aria-label="Điều hướng chính">
        {filteredGroups.map((group) => (
          <NavGroupSection
            key={group.key}
            group={group}
            collapsed={isCollapsed}
            currentPath={location.pathname}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
            onItemClick={handleItemClick}
          />
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <Avatar name={user?.username} />
        {!isCollapsed && (
          <div className="min-w-0 flex-1" style={{ lineHeight: 1.25 }}>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
            <div className="truncate" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{user?.roleName || 'Người dùng'}</div>
          </div>
        )}
        <button type="button" onClick={handleLogout} className="icon-btn" aria-label="Đăng xuất" title="Đăng xuất"><LogOut /></button>
      </div>
    </div>
  );
}

/* ── NavGroup Section ──────────────────────────────────────────────── */

function NavGroupSection({ group, collapsed, currentPath, openMenus, toggleMenu, onItemClick }: {
  group: NavGroup; collapsed: boolean; currentPath: string;
  openMenus: Set<string>; toggleMenu: (key: string) => void; onItemClick: () => void;
}) {
  return (
    <div className="nav-group">
      {collapsed ? <div className="nav-group-rule" aria-hidden /> : <p className="nav-group-label">{group.label}</p>}
      <div className="flex flex-col" style={{ gap: 2 }}>
        {group.items.map((item) =>
          isSubMenu(item) ? (
            <SubMenuSection key={item.key} menu={item} collapsed={collapsed} currentPath={currentPath}
              isOpen={openMenus.has(item.key)} toggle={() => toggleMenu(item.key)} onItemClick={onItemClick} />
          ) : (
            <NavLink key={item.key} item={item} collapsed={collapsed}
              isActive={isPathActive(item.path, currentPath)} onClick={onItemClick} />
          ),
        )}
      </div>
    </div>
  );
}

/* ── SubMenu ───────────────────────────────────────────────────────── */

function SubMenuSection({ menu, collapsed, currentPath, isOpen, toggle, onItemClick }: {
  menu: NavSubMenu; collapsed: boolean; currentPath: string;
  isOpen: boolean; toggle: () => void; onItemClick: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) setHeight(contentRef.current.scrollHeight);
  }, [menu.children.length]);

  const hasActive = menu.children.some((c) => isPathActive(c.path, currentPath));
  const Icon = menu.icon;

  if (collapsed) {
    const firstChild = menu.children[0];
    return (
      <Link to={firstChild?.path || '#'} onClick={onItemClick} aria-label={menu.label}
        className={clsx('nav-link is-collapsed group', hasActive && 'is-active')}>
        <Icon className="nav-icon" />
        <Tooltip>{menu.label}</Tooltip>
      </Link>
    );
  }

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={isOpen} className={clsx('nav-link w-full', hasActive && 'is-parent-active')}>
        <Icon className="nav-icon" />
        <span className="flex-1 truncate text-left">{menu.label}</span>
        <ChevronDown className="nav-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      <div style={{ overflow: 'hidden', transition: 'max-height 0.2s ease-in-out', maxHeight: isOpen ? (height ?? 500) : 0 }}>
        <div ref={contentRef} className="nav-children">
          {menu.children.map((child) => (
            <NavLink key={child.key} item={child} collapsed={false}
              isActive={isPathActive(child.path, currentPath)} onClick={onItemClick} nested />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Single nav link ───────────────────────────────────────────────── */

function NavLink({ item, collapsed, isActive, onClick, nested }: {
  item: NavItem; collapsed: boolean; isActive: boolean; onClick: () => void; nested?: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link to={item.path} onClick={onClick} aria-label={item.label} aria-current={isActive ? 'page' : undefined}
        className={clsx('nav-link is-collapsed group', isActive && 'is-active')}>
        <Icon className="nav-icon" />
        <Tooltip>{item.label}</Tooltip>
      </Link>
    );
  }

  return (
    <Link to={item.path} onClick={onClick} aria-current={isActive ? 'page' : undefined}
      className={clsx('nav-link', nested && 'is-nested', isActive && 'is-active')}>
      {nested ? <span className="nav-dot" aria-hidden /> : <Icon className="nav-icon" />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.isNew && <NewTag />}
    </Link>
  );
}

/* ── Tooltip (collapsed mode) ──────────────────────────────────────── */

function Tooltip({ children }: { children: ReactNode }) {
  return <span className="nav-tooltip group-hover:opacity-100" role="tooltip">{children}</span>;
}
