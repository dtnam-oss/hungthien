/* Cột + thân bảng chuyến cho ServerDataTable: nhóm 2 cấp (ngày → tuyến) hoặc danh sách phẳng */

import { useEffect, useMemo } from 'react';
import { ChevronDown, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import type { RenderBodyContext } from '../../../shared/components/ServerDataTable';
import type { TripRow } from './types';

export type TripViewMode = 'grouped' | 'flat';

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
  ctx: RenderBodyContext<TripRow>;
  viewMode: TripViewMode;
  /** Chỉ hiện chuyến thỏa điều kiện (lọc phía client trên trang hiện tại) */
  rowFilter?: (row: TripRow) => boolean;
  selectedId: number | null;
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
  /** Báo danh sách dòng của trang hiện tại lên trang cha (rỗng khi thân bảng bị gỡ) */
  onRows: (rows: TripRow[]) => void;
}

/** Các <tr> của bảng chuyến; đặt trong <tbody> do ServerDataTable cung cấp */
export function TripBody({ ctx, viewMode, rowFilter, selectedId, collapsed, onToggleGroup, onRows }: Props) {
  const { rows, columns, startIndex, selected, toggle, onOpen } = ctx;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visible = useMemo(() => (rowFilter ? rows.filter(rowFilter) : rows), [rows, rowFilter]);
  const groups = useMemo(() => (viewMode === 'grouped' ? groupByDayAndRoute(visible) : []), [visible, viewMode]);

  useEffect(() => { onRows(rows); }, [rows, onRows]);
  useEffect(() => () => onRows([]), [onRows]);

  const colSpan = columns.length + 2; // ô chọn + số thứ tự

  // Số thứ tự liên tục theo thứ tự hiển thị
  let rowIndex = startIndex + 1;

  const renderRow = (row: TripRow) => {
    const index = rowIndex++;
    const open = selectedId === row.id;
    const checked = selectedSet.has(row.id);
    return (
      <tr key={row.id} className={clsx((open || checked) && 'is-selected')} onClick={() => onOpen(row)}
        tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(row); }} aria-current={open || undefined}>
        <td className="col-check" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="checkbox" checked={checked} onChange={() => toggle(row.id)} aria-label={`Chọn chuyến ${row.tripCode}`} />
        </td>
        <td className="row-num">{index.toLocaleString('vi-VN')}</td>
        {columns.map((col) => (
          <td key={col.key} className={clsx(col.align === 'right' && 'num', col.align === 'center' && 'center', col.className)}>
            {col.render ? col.render(row, index) : null}
          </td>
        ))}
      </tr>
    );
  };

  const renderRouteGroup = (dateKey: string, group: RouteGroup) => {
    const key = `route:${dateKey}:${group.routeName}`;
    const isCollapsed = collapsed.has(key);
    return [
      <tr key={`rh-${key}`} className="tbl-subgroup-row">
        <td colSpan={colSpan}>
          <button type="button" aria-expanded={!isCollapsed} onClick={() => onToggleGroup(key)}
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
        <td colSpan={colSpan}>
          <button type="button" aria-expanded={!isCollapsed} onClick={() => onToggleGroup(key)}
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

  if (visible.length === 0) {
    return <tr><td colSpan={colSpan} className="tbl-empty"><b className="block text-ink">Không có chuyến cần xử lý trên trang này</b></td></tr>;
  }
  return <>{viewMode === 'flat' ? visible.map(renderRow) : groups.flatMap(renderDayGroup)}</>;
}
