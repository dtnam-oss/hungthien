/* Thanh thao tác nổi khi chọn nhiều chuyến: gán xe, đổi trạng thái (menu), xuất CSV */

import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Download, Truck, X } from 'lucide-react';
import clsx from 'clsx';
import { STATUS_TONES } from '../../../shared/ui';
import type { TripStatus } from './trip-status-flow';

interface Props {
  count: number;
  busy: boolean;
  /** Trạng thái đích hợp lệ với ít nhất một chuyến đã chọn (theo trip-status-flow) */
  statusTargets: TripStatus[];
  onClear: () => void;
  onAssignVehicle: () => void;
  onChangeStatus: (next: TripStatus) => void;
  onExport: () => void;
}

const ACTION_CLASS = 'btn btn-sm bg-[color-mix(in_srgb,var(--inverse-text)_12%,transparent)] text-[var(--inverse-text)] hover:bg-[color-mix(in_srgb,var(--inverse-text)_22%,transparent)]';

export function BulkActionBar({ count, busy, statusTargets, onClear, onAssignVehicle, onChangeStatus, onExport }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi bấm ngoài hoặc Esc; bắt Esc ở capture để không đóng nhầm drawer
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [menuOpen]);

  // Tập chọn về 0 (bỏ chọn, tải lại) → đóng menu để không giữ listener Esc
  useEffect(() => { if (count === 0) setMenuOpen(false); }, [count]);

  if (count === 0) return null;

  const noTargets = statusTargets.length === 0;

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label="Thao tác hàng loạt"
      className="absolute left-1/2 bottom-6 z-[5] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-[var(--inverse-bg)] py-2 pr-2 pl-4 text-[13px] text-[var(--inverse-text)] shadow-[var(--shadow-float)] animate-slide-up"
    >
      <b className="mr-2">Đã chọn {count} chuyến</b>
      <button type="button" className={ACTION_CLASS} onClick={onAssignVehicle} disabled={busy}><Truck />Gán xe</button>

      <div className="relative">
        <button type="button" className={clsx(ACTION_CLASS, menuOpen && 'bg-[color-mix(in_srgb,var(--inverse-text)_22%,transparent)]')}
          aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} disabled={busy || noTargets}
          title={noTargets ? 'Các chuyến đã chọn không còn chuyển trạng thái nào hợp lệ' : undefined}>
          Đổi trạng thái <ChevronUp className={clsx('transition-transform', !menuOpen && 'rotate-180')} />
        </button>
        {menuOpen && (
          <div role="menu" className="menu absolute bottom-full left-0 mb-2 animate-slide-up" style={{ minWidth: 200 }}>
            {statusTargets.map((s) => (
              <button key={s} type="button" role="menuitem" className="menu-item" onClick={() => { setMenuOpen(false); onChangeStatus(s); }}>
                <i aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: `var(--${STATUS_TONES[s]?.tone ?? 'neutral'}-dot)` }} />
                {STATUS_TONES[s]?.label ?? s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className={ACTION_CLASS} onClick={onExport} disabled={busy}><Download />Xuất CSV</button>
      <button type="button" onClick={onClear} aria-label="Bỏ chọn" className="btn btn-sm w-8 !px-0 text-[var(--inverse-text)] opacity-70 hover:opacity-100">
        <X />
      </button>
    </div>
  );
}
