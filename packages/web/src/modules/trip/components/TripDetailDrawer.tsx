/* Trip detail drawer — overlay bên phải, gồm header + stepper + 3 tab + footer hành động theo trạng thái */

import { useEffect, useRef, useState } from 'react';
import { Pencil, X, Trash2, History } from 'lucide-react';
import { Alert, Button, EmptyState, IconButton, StatusPill, UnderlineTabs } from '../../../shared/ui';
import { formatDate } from '../../../shared/format';
import { TripStepper } from './TripStepper';
import { TripInfoTab } from './TripInfoTab';
import { TripCostTab } from './TripCostTab';
import { PRIMARY_TRANSITION } from './trip-status-flow';
import type { TripStatus } from './trip-status-flow';
import type { TripDetailController } from './useTripDetail';

const DRAWER_TABS = [
  { key: 'info', label: 'Thông tin' },
  { key: 'cost', label: 'Chi phí' },
  { key: 'hist', label: 'Lịch sử' },
];

interface Props {
  ctl: TripDetailController;
  canEdit: boolean;
  canDelete: boolean;
}

export function TripDetailDrawer({ ctl, canEdit, canDelete }: Props) {
  const { detail, isEditing, editForm, busy, actionError, close } = ctl;
  const [tab, setTab] = useState('info');
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  // Mở drawer: focus nút đóng; đóng (unmount): trả focus về hàng/nút đã mở
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => { opener?.focus?.(); };
  }, []);

  if (!detail) return null;

  const editable = canEdit && !detail.isLocked;
  const transition = PRIMARY_TRANSITION[detail.status as TripStatus];
  const tripDay = detail.tripDate
    ? new Date(detail.tripDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

  return (
    <div
      className="drawer animate-slide-in-right absolute top-0 right-0 bottom-0 z-[6] w-[var(--drawer-w)] max-w-full border-l border-line shadow-[var(--shadow-drawer)]"
      role="dialog"
      aria-label={`Chi tiết chuyến ${detail.tripCode}`}
    >
      <div className="drawer-head">
        <div className="drawer-title">
          <div className="info">
            <div className="flex items-center gap-2.5">
              <span className="mono text-[18px] font-semibold">{detail.tripCode}</span>
              <StatusPill status={detail.status} />
            </div>
            <h3>{detail.Route?.origin || '—'} <span className="text-muted">→</span> {detail.Route?.destination || '—'}</h3>
            <div className="sub">{detail.Customer?.name || '—'} · {tripDay}</div>
          </div>
          <div className="actions">
            {editable && (
              <IconButton label={isEditing ? 'Hủy sửa' : 'Sửa'} tone={isEditing ? 'brand' : 'default'} onClick={ctl.toggleEdit}>
                <Pencil />
              </IconButton>
            )}
            <IconButton ref={closeBtnRef} label="Đóng" onClick={close}><X /></IconButton>
          </div>
        </div>

        <TripStepper status={detail.status} />
        <UnderlineTabs tabs={DRAWER_TABS} active={tab} onChange={setTab} ariaLabel="Chi tiết chuyến" className="!border-b-0 !p-0" />
      </div>

      <div className="drawer-body">
        {actionError && <Alert tone="error">{actionError}</Alert>}
        {tab === 'info' && <TripInfoTab detail={detail} isEditing={isEditing} editForm={editForm} onPatch={ctl.patchForm} />}
        {tab === 'cost' && <TripCostTab detail={detail} editable={editable} onAdd={ctl.addCost} onDelete={ctl.deleteCost} />}
        {tab === 'hist' && (
          <section className="sub-card">
            <EmptyState
              compact
              icon={<History />}
              title="Chưa có nhật ký thao tác"
              description={`Lịch sử thay đổi được ghi ở máy chủ nhưng chưa có API đọc. Chuyến chạy ngày ${formatDate(detail.tripDate)}.`}
            />
          </section>
        )}
      </div>

      <div className="drawer-foot">
        {isEditing ? (
          <>
            <Button onClick={ctl.toggleEdit} disabled={busy}>Hủy</Button>
            <Button variant="primary" loading={busy} onClick={ctl.save}>Lưu thay đổi</Button>
          </>
        ) : (
          <>
            {canDelete && (
              <IconButton label="Xóa chuyến" tone="danger" outline loading={busy} onClick={ctl.remove}
                className="!h-[42px] !w-[42px] !rounded-lg text-brand-strong">
                <Trash2 />
              </IconButton>
            )}
            {editable && transition ? (
              <Button variant="primary" loading={busy} onClick={() => ctl.changeStatus(transition.next)}>{transition.label}</Button>
            ) : (
              <span className="flex-1 self-center text-center text-[13px] text-muted">
                {detail.isLocked ? 'Kỳ kế toán đã khóa' : detail.status === 'COMPLETED' ? 'Chuyến đã hoàn thành' : 'Không có hành động'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
