import type { ReactNode, CSSProperties } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle, Inbox } from 'lucide-react';
import clsx from 'clsx';

/* ── Alert ─────────────────────────────────────────────────────────── */

export type AlertTone = 'error' | 'warn' | 'success' | 'info' | 'neutral';

const ALERT_ICON: Record<AlertTone, ReactNode> = {
  error: <XCircle />,
  warn: <AlertTriangle />,
  success: <CheckCircle2 />,
  info: <Info />,
  neutral: <Info />,
};

export function Alert({ tone = 'neutral', icon, className, children }: { tone?: AlertTone; icon?: ReactNode | null; className?: string; children: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={clsx('alert', tone !== 'neutral' && `alert-${tone}`, className)}>
      {icon === null ? null : (icon ?? ALERT_ICON[tone])}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ── Spinner / loading ─────────────────────────────────────────────── */

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return <Loader2 className={clsx('spinner', className)} style={{ width: size, height: size }} aria-hidden />;
}

export function LoadingBlock({ label = 'Đang tải…', className, minHeight = 160 }: { label?: string; className?: string; minHeight?: number }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2', className)} style={{ minHeight, color: 'var(--muted)', fontSize: 13 }} role="status">
      <Spinner size={16} />
      {label}
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14, className, style }: { width?: number | string; height?: number | string; className?: string; style?: CSSProperties }) {
  return <span className={clsx('skeleton block', className)} style={{ width, height, ...style }} aria-hidden />;
}

/* ── EmptyState ────────────────────────────────────────────────────── */

export function EmptyState({ icon, title, description, action, className, compact }: {
  icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; compact?: boolean;
}) {
  return (
    <div className={clsx('empty', className)} style={compact ? { padding: '28px 16px' } : undefined}>
      <div className="empty-icon">{icon ?? <Inbox />}</div>
      <div className="empty-title">{title}</div>
      {description && <div className="empty-desc">{description}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

/* ── StatCard ──────────────────────────────────────────────────────── */

export type StatTone = 'default' | 'success' | 'danger' | 'warn' | 'info';

const STAT_TONE_COLOR: Record<StatTone, string | undefined> = {
  default: undefined,
  success: 'var(--success-text)',
  danger: 'var(--accent-strong)',
  warn: 'var(--warn-accent)',
  info: 'var(--info-text)',
};

export function StatCard({ label, value, sub, icon, tone = 'default', className }: {
  label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: StatTone; className?: string;
}) {
  return (
    <div className={clsx('stat-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="stat-label">{label}</div>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value" style={{ color: STAT_TONE_COLOR[tone] }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
