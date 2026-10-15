import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../auth-context';
import { getAllNavItems } from '../nav-config';

/**
 * Ô tìm nhanh chức năng trên topbar (Ctrl/⌘ + K).
 * Lọc theo nhãn / mô tả / đường dẫn của các mục menu người dùng có quyền xem.
 */
export function QuickNav() {
  const { hasPermission, isLoading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const all = getAllNavItems();
    return isLoading ? all : all.filter((i) => hasPermission(i.module, 'canView'));
  }, [hasPermission, isLoading]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items
      .filter((i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.path.includes(q))
      .slice(0, 8);
  }, [items, query]);

  // Ctrl/⌘ + K → focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click ngoài → đóng
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = useCallback((path: string) => {
    navigate(path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  }, [navigate]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { const r = results[highlight]; if (r) go(r.path); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div ref={rootRef} className="relative hidden md:block" style={{ width: 320 }}>
      <div className="search" style={{ width: '100%' }}>
        <Search />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm nhanh chức năng…"
          aria-label="Tìm nhanh chức năng"
          aria-expanded={open}
          aria-controls="quicknav-list"
          role="combobox"
        />
        <kbd>Ctrl K</kbd>
      </div>

      {open && results.length > 0 && (
        <div id="quicknav-list" role="listbox" className="menu absolute left-0 right-0 mt-1 z-50 animate-slide-up">
          {results.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={r.key}
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => go(r.path)}
                className={clsx('menu-item', i === highlight && 'is-active')}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{r.label}</span>
                  <span className="block truncate" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.description}</span>
                </span>
                {i === highlight && <CornerDownLeft style={{ width: 13, height: 13 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
