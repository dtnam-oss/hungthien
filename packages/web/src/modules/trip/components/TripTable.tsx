/* Bảng chuyến: nhóm 2 cấp (ngày → tuyến) hoặc danh sách phẳng, số thứ tự, chọn nhiều, mở drawer */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { Checkbox, Plate, StatusPill } from '../../../shared/ui';
import type { TripRow } from './types';

export type TripViewMode = 'grouped' | 'flat';

const COLUMN_COUNT = 8;
const dayKey = (r: TripRow) => (r.tripDate || '').split('T')[0];
const routeKey = (r: TripRow) => r.Route?.name || r.Route?.code || 'Chưa có tuyến';

interface RouteGroup { routeName: string; rows: TripRow[] }
interface DayGroup { dateKey: string; rows: TripRow[]; routes: RouteGroup[] }

/** Nhóm theo ngày (mới nhất trước) → tuyến (A→Z); trong tuyến xếp theo khách hàng */
function groupByDayAndRoute(rows: TripRow[]): DayGroup[] {
  const sorted = [...rows].sort((a, b) => {
    const da = dayKey(a);
    const db = dayKey(b);
    if (da !== db) return db.localeCompare(da);
    const ra = routeKey(a).localeCompare(routeKey(b));
    if (ra !== 0) return ra;
    return (a.Customer?.name || '').localeCompare(b.Customer?.name || '');
  });
  const days: DayGroup[] = [];
  for (const row of sorted) {
    const key = dayKey(row);
    let day = days[days.length - 1];
    if (!day || day.dateKey !== key) { day = { dateKey: key, rows: [], routes: [] }; days.push(day); }
    day.rows.push(row);
    const rKey = routeKey(row);
    const route = day.routes[day.routes.length - 1];
    if (route && route.routeName === rKey) route.rows.push(row);
    else day.routes.push({ routeName: rKey, rows: [row] });
  }
  return days;
}

function relativeDayLabel(date: Date): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const t = date.getTime();
  if (t === today.getTime()) return 'Hôm nay';
  if (t === tomorrow.getTime()) return 'Ngày mai';
  return date.toLocaleDateString('vi-VN', { weekday: 'long' });
}

interface Props {
  rows: TripRow[];
  loading: boolean;
  error: string | null;
  viewMode: TripViewMode;
  selectedId: number | null;
  checked: Set<number>;
  /** Số thứ tự của dòng đầu tiên (theo phân trang) */
  startIndex?: number;
  onOpen: (id: number) => void;
  onToggleCheck: (id: number) => void;
  onToggleCheckAll: () => void;
}

export function TripTable({ rows, loading, error, viewMode, selectedId, checked, startIndex = 1, onOpen, onToggleCheck, onToggleCheckAll }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groups = useMemo(() => (viewMode === 'grouped' ? groupByDayAndRoute(rows) : []), [rows, viewMode]);

  const toggleGroup = (key: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Số thứ tự liên tục theo thứ tự hiển thị
  let rowIndex = startIndex;

  const renderRow = (row: TripRow) => {
    const index = rowIndex++;
    return (
      <tr key={row.id} className={clsx(selectedId === row.id && 'is-selected')} onClick={() => onOpen(row.id)}
        tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(row.id); }} aria-selected={selectedId === row.id || undefined}>
        <td className="center" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={checked.has(row.id)} onChange={() => onToggleCheck(row.id)} aria-label={`Chọn chuyến ${row.tripCode}`} />
        </td>
        <td className="row-num">{index}</td>
        <td>
          <button type="button" tabIndex={-1} className="flex flex-col items-start gap-0.5 border-0 bg-transparent p-0 text-left text-ink">
            <span className="cell-title">
              {row.Route?.origin || '—'} <span className="text-muted">→</span> {row.Route?.destination || '—'}
            </span>
            <span className="flex gap-2 text-xs text-muted">
              <span className="mono text-ink-3">{row.tripCode}</span>
              <span>·</span>
              <span>Nhận {row.departureTime || '—'}</span>
            </span>
          </button>
        </td>
        <td>
          <div className="max-w-[220px] truncate">{row.Customer?.name || '—'}</div>
          <div className="cell-sub mono">{row.Customer?.code || ''}</div>
        </td>
        <td>
          <div className="flex flex-col items-start gap-0.5">
            {row.Vehicle?.plateNumber
              ? <Plate>{row.Vehicle.plateNumber}</Plate>
              : <span className="text-xs font-semibold text-warn">Chưa gán xe</span>}
            <span className="text-xs text-muted">{row.primaryDriver?.fullName || 'Chưa gán tài xế'}</span>
          </div>
        </td>
        <td className="num">
          {row.cargoWeight ? <>{Number(row.cargoWeight)} <span className="text-muted">tấn</span></> : '—'}
        </td>
        <td><StatusPill status={row.status} size="sm" /></td>
        <td>{row.Vehicle?.Supplier?.name || '—'}</td>
      </tr>
    );
  };

  const renderRouteGroup = (dateKey: string, group: RouteGroup) => {
    const key = `route:${dateKey}:${group.routeName}`;
    const isCollapsed = collapsed.has(key);
    return [
      <tr key={`rh-${key}`} className="tbl-subgroup-row">
        <td colSpan={COLUMN_COUNT}>
          <button type="button" aria-expanded={!isCollapsed} onClick={() => toggleGroup(key)}
            className="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left text-ink-3">
            <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', isCollapsed && '-rotate-90')} />
            <FolderOpen className="h-3.5 w-3.5 text-muted" />
            <span>{group.routeName}</span>
            <span className="count">{group.rows.length}</span>
          </button>
        </td>
      </tr>,
      ...(isCollapsed ? [] : group.rows.map(renderRow)),
    ];
  };

  const renderDayGroup = ({ dateKey, rows: dayRows, routes }: DayGroup) => {
    const key = `date:${dateKey}`;
    const isCollapsed = collapsed.has(key);
    const d = new Date(`${dateKey}T00:00:00`);
    const active = dayRows.filter((r) => r.status !== 'CANCELLED');
    const transit = active.filter((r) => r.status === 'IN_TRANSIT').length;
    const tons = active.reduce((a, r) => a + (Number(r.cargoWeight) || 0), 0);
    return [
      <tr key={`dh-${dateKey}`} className="tbl-group-row">
        <td colSpan={COLUMN_COUNT}>
          <button type="button" aria-expanded={!isCollapsed} onClick={() => toggleGroup(key)}
            className="flex w-full items-center gap-2.5 border-0 bg-transparent p-0 text-left text-[13px] text-ink">
            <ChevronDown className={clsx('h-4 w-4 transition-transform', isCollapsed && '-rotate-90')} />
            <strong>{relativeDayLabel(d)}</strong>
            <span className="font-normal text-muted">
              {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
            <span className="count">{dayRows.length} chuyến</span>
            <span className="flex-1" />
            <span className="text-xs font-normal text-muted">
              {transit > 0 && `${transit} đang chạy · `}{tons > 0 && `${tons} tấn`}
            </span>
          </button>
        </td>
      </tr>,
      ...(isCollapsed ? [] : routes.flatMap((g) => renderRouteGroup(dateKey, g))),
    ];
  };

  const placeholder = (content: ReactNode) => (
    <tbody><tr><td colSpan={COLUMN_COUNT} className="tbl-empty">{content}</td></tr></tbody>
  );

  let body: ReactNode;
  if (loading && rows.length === 0) {
    body = placeholder(<span>Đang tải…</span>);
  } else if (error && rows.length === 0) {
    body = placeholder(<span className="text-danger">{error}</span>);
  } else if (rows.length === 0) {
    body = placeholder(<><b className="block text-ink">Không có chuyến phù hợp</b><span className="text-[13px]">Thử xoá bộ lọc hoặc thay đổi khoảng thời gian</span></>);
  } else {
    body = <tbody>{viewMode === 'flat' ? rows.map(renderRow) : groups.flatMap(renderDayGroup)}</tbody>;
  }

  return (
    <div className="tbl-wrap">
      <table className="tbl tbl-hover tbl-click min-w-[1080px]">
        <thead>
          <tr>
            <th className="w-10 center">
              <Checkbox checked={rows.length > 0 && checked.size === rows.length} onChange={onToggleCheckAll} aria-label="Chọn tất cả" />
            </th>
            <th className="row-num">#</th>
            <th>Chuyến / Tuyến</th>
            <th>Khách hàng</th>
            <th>Xe · Tài xế</th>
            <th className="num">SL</th>
            <th>Trạng thái</th>
            <th>Nhà xe</th>
          </tr>
        </thead>
        {body}
      </table>
    </div>
  );
}
