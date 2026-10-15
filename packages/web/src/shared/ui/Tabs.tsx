import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

/* ── Segmented tabs (nền xám, tab chọn nổi trắng) ─────────────────── */

export interface SegmentedTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function SegmentedTabs({ tabs, active, onChange, size = 'md', className, ariaLabel }: SegmentedTabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('seg', size === 'sm' && 'seg-sm', className)}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button key={t.key} role="tab" aria-selected={on} className="seg-tab" onClick={() => onChange(t.key)}>
            {t.icon}
            {t.label}
            {t.count !== undefined && <span className="seg-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ── Underline tabs (gạch đỏ dưới, dùng trong drawer / chi tiết) ──── */

export interface UnderlineTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function UnderlineTabs({ tabs, active, onChange, className, ariaLabel }: UnderlineTabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={clsx('tabs', className)}>
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={t.key === active} onClick={() => onChange(t.key)}>
          {t.icon}
          {t.label}
          {t.count !== undefined && <span className="seg-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
