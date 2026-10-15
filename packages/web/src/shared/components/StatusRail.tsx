import clsx from 'clsx';
import { SectionTitle, STATUS_TONES } from '../ui';

export interface StatusRailProps {
  /** Thứ tự hiển thị các trạng thái */
  statuses: string[];
  /** Trạng thái đang lọc ([] = tất cả) */
  value: string[];
  onChange: (value: string[]) => void;
  /** Đếm theo trạng thái từ `statusStats` của server */
  stats: { status: string; count: number }[];
  /** Nhãn ghi đè; mặc định lấy từ STATUS_TONES */
  labels?: Record<string, string>;
  title?: string;
  totalLabel?: string;
  ariaLabel?: string;
}

/** Rail đếm trạng thái: bấm để bật/tắt từng trạng thái (chọn nhiều), "Tổng" = bỏ lọc. Dưới 1024px thành hàng chip ngang. */
export function StatusRail({
  statuses, value, onChange, stats, labels, title = 'Trạng thái', totalLabel = 'Tổng', ariaLabel = 'Lọc theo trạng thái',
}: StatusRailProps) {
  const countOf = (key: string) => stats.find((s) => s.status === key)?.count ?? 0;
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  };

  return (
    <aside className="filter-rail rail-chips" aria-label={ariaLabel}>
      <div className="rail-section">
        <SectionTitle>{title}</SectionTitle>
        <div className="rail-stats" role="group" aria-label={ariaLabel}>
          <button type="button" className={clsx('rail-stat', value.length === 0 && 'is-active')} aria-pressed={value.length === 0} onClick={() => onChange([])}>
            <span className="label">{totalLabel}</span>
            <span className="count">{total.toLocaleString('vi-VN')}</span>
          </button>
          {statuses.map((key) => {
            const tone = STATUS_TONES[key];
            const pressed = value.includes(key);
            return (
              <button
                key={key}
                type="button"
                data-tone={tone?.tone ?? 'neutral'}
                className={clsx('rail-stat', pressed && 'is-active')}
                aria-pressed={pressed}
                onClick={() => toggle(key)}
              >
                <span className="label">{labels?.[key] ?? tone?.label ?? key}</span>
                <span className="count">{countOf(key).toLocaleString('vi-VN')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
