import type { ReactNode } from 'react';
import clsx from 'clsx';

export type PillTone = 'info' | 'violet' | 'warn' | 'success' | 'neutral' | 'danger' | 'brand' | 'outline';

export interface PillProps {
  tone?: PillTone;
  /** Hiện chấm màu trước nhãn */
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}

/** Nhãn trạng thái dạng viên thuốc */
export function Pill({ tone = 'neutral', dot, size = 'md', className, children }: PillProps) {
  return (
    <span className={clsx('pill', `pill-${tone}`, size === 'sm' && 'pill-sm', className)}>
      {dot && <i aria-hidden />}
      {children}
    </span>
  );
}

/** Biển số xe (mono, viền) */
export function Plate({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('plate', className)}>{children}</span>;
}

/** Nhãn "Mới" nhỏ */
export function NewTag() {
  return <span className="tag-new">Mới</span>;
}

/** Avatar chữ cái đầu */
export function Avatar({ name, size = 'md', soft, className }: { name?: string | null; size?: 'sm' | 'md'; soft?: boolean; className?: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return <span className={clsx('avatar', size === 'sm' && 'avatar-sm', soft && 'avatar-soft', className)} aria-hidden>{initial}</span>;
}

/**
 * Map trạng thái → tone + nhãn, dùng chung cho các module.
 * Thêm key mới ở đây thay vì hard-code màu trong trang.
 */
export const STATUS_TONES: Record<string, { label: string; tone: PillTone }> = {
  // Chung
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng', tone: 'neutral' },
  SUSPENDED: { label: 'Tạm ngưng', tone: 'danger' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'warn' },
  DISPOSED: { label: 'Đã thanh lý', tone: 'danger' },
  // Chuyến đi
  PLANNED: { label: 'Kế hoạch', tone: 'info' },
  DISPATCHED: { label: 'Đã điều xe', tone: 'violet' },
  IN_TRANSIT: { label: 'Đang chạy', tone: 'warn' },
  DELIVERED: { label: 'Đã giao', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  // Kỳ / bảng lương
  OPEN: { label: 'Đang mở', tone: 'info' },
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  CALCULATED: { label: 'Đã tính', tone: 'violet' },
  CONFIRMED: { label: 'Đã duyệt', tone: 'info' },
  PAID: { label: 'Đã chi', tone: 'success' },
  LOCKED: { label: 'Đã khóa', tone: 'neutral' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
  // Kết quả kiểm định xe
  PASS: { label: 'Đạt', tone: 'success' },
  FAIL: { label: 'Không đạt', tone: 'danger' },
  CONDITIONAL: { label: 'Có điều kiện', tone: 'warn' },
};

/** Pill trạng thái dùng STATUS_TONES; có thể override nhãn */
export function StatusPill({ status, label, dot = true, size }: { status: string; label?: string; dot?: boolean; size?: 'sm' | 'md' }) {
  const s = STATUS_TONES[status];
  return <Pill tone={s?.tone ?? 'neutral'} dot={dot} size={size}>{label ?? s?.label ?? status}</Pill>;
}
