import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, Ref } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useServerTable } from '../hooks/useServerTable';
import type { ServerTableFilterValue } from '../hooks/useServerTable';
import { SearchBox } from '../ui/FormControls';
import { Button } from '../ui/Button';
import { Alert, EmptyState, LoadingBlock } from '../ui/Feedback';
import { StatusRail } from './StatusRail';
import { TableFooter } from './TableFooter';

export type RowId = string | number;
type HideBelow = 'md' | 'lg' | 'xl';

export interface ServerDataColumn<T> {
  key: string;
  label: ReactNode;
  /** Chỉ số cột trong SORTABLE_COLUMNS của module server; bỏ trống = không sort */
  sortIndex?: number;
  width?: number | string;
  minWidth?: number | string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, index: number) => ReactNode;
  /** Class cho cả th và td */
  className?: string;
  /** Ẩn cột khi khung nhìn hẹp hơn md (768) / lg (1024) / xl (1280) */
  hideBelow?: HideBelow;
}

export interface ServerDataTableApi {
  reload: () => void;
}

export interface ServerDataGroup {
  key: string;
  label: ReactNode;
  meta?: ReactNode;
}

export interface ServerDataRail {
  statuses: string[];
  value: string[];
  onChange: (value: string[]) => void;
  labels?: Record<string, string>;
}

export interface RenderBodyContext<T> {
  rows: T[];
  columns: ServerDataColumn<T>[];
  /** Số thứ tự đầu trang (start) — liên tục qua các trang */
  startIndex: number;
  selected: RowId[];
  toggle: (key: RowId) => void;
  onOpen: (row: T) => void;
}

export interface ServerDataTableProps<T extends object> {
  endpoint: string;
  title?: ReactNode;
  columns: ServerDataColumn<T>[];
  filters?: Record<string, ServerTableFilterValue>;
  /** Slot cạnh ô tìm kiếm (bộ lọc) */
  toolbar?: ReactNode;
  /** Slot bên phải toolbar (Lọc / Thêm) */
  actions?: ReactNode;
  rail?: ServerDataRail;
  /** Nhóm 1 cấp phía client trên trang hiện tại */
  groupBy?: (row: T) => ServerDataGroup;
  density?: 'dense' | 'comfortable';
  rowKey?: keyof T & string;
  selectedKey?: RowId | null;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: RowId[];
  onSelectedChange?: (selected: RowId[]) => void;
  emptyTitle?: string;
  rowNumber?: boolean;
  /** Tự vẽ phần <tbody> (ví dụ nhóm 2 cấp) */
  renderBody?: (ctx: RenderBodyContext<T>) => ReactNode;
  searchPlaceholder?: string;
  defaultLength?: number;
  apiRef?: Ref<ServerDataTableApi>;
  /** Panel đặt cạnh card bảng trong cùng .workspace (ví dụ chi tiết inline) */
  aside?: ReactNode;
}

const HIDE_CLASS: Record<HideBelow, string> = { md: 'hide-md', lg: 'hide-lg', xl: 'hide-xl' };

function cellClass<T>(col: ServerDataColumn<T>) {
  return clsx(
    col.align === 'right' && 'num',
    col.align === 'center' && 'center',
    col.hideBelow && HIDE_CLASS[col.hideBelow],
    col.className,
  );
}

function defaultCell(row: object, key: string): ReactNode {
  const v = (row as Record<string, unknown>)[key];
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

interface RowProps<T extends object> {
  row: T;
  index: number;
  startIndex: number;
  columns: ServerDataColumn<T>[];
  rowNumber: boolean;
  selectable: boolean;
  checked: boolean;
  open: boolean;
  clickable: boolean;
  id: RowId;
  onOpen: (row: T) => void;
  onToggle: (id: RowId) => void;
}

function RowInner<T extends object>({ row, index, startIndex, columns, rowNumber, selectable, checked, open, clickable, id, onOpen, onToggle }: RowProps<T>) {
  return (
    <tr
      className={clsx((open || checked) && 'is-selected')}
      tabIndex={clickable ? 0 : undefined}
      aria-current={open || undefined}
      onClick={clickable ? () => onOpen(row) : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(row); } : undefined}
    >
      {selectable && (
        <td className="col-check" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className="checkbox" checked={checked} onChange={() => onToggle(id)} aria-label="Chọn dòng" />
        </td>
      )}
      {rowNumber && <td className="row-num">{(startIndex + index + 1).toLocaleString('vi-VN')}</td>}
      {columns.map((col) => (
        <td key={col.key} className={cellClass(col)}>
          {col.render ? col.render(row, index) : defaultCell(row, col.key)}
        </td>
      ))}
    </tr>
  );
}
const Row = memo(RowInner) as typeof RowInner;

export function ServerDataTable<T extends object>({
  endpoint, title, columns, filters = {}, toolbar, actions, rail, groupBy,
  density = 'dense', rowKey = 'id' as keyof T & string, selectedKey = null, onRowClick,
  selectable, selected = [], onSelectedChange, emptyTitle = 'Không có dữ liệu',
  rowNumber = true, renderBody, searchPlaceholder = 'Tìm kiếm...', defaultLength = 100, apiRef, aside,
}: ServerDataTableProps<T>) {
  const sortFlags = useMemo(() => {
    const max = columns.reduce((m, c) => Math.max(m, c.sortIndex ?? -1), -1);
    const flags = Array.from({ length: max + 1 }, () => ({ sortable: false }));
    for (const c of columns) if (c.sortIndex !== undefined) flags[c.sortIndex] = { sortable: true };
    return flags;
  }, [columns]);

  const table = useServerTable<T>({ endpoint, filters, columns: sortFlags, defaultLength });
  const { reload, setSearch } = table;
  useImperativeHandle(apiRef, () => ({ reload }), [reload]);

  const [searchInput, setSearchInput] = useState('');
  const handleSearch = useCallback((v: string) => { setSearchInput(v); setSearch(v); }, [setSearch]);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const onOpen = useCallback((row: T) => onRowClick?.(row), [onRowClick]);
  const toggle = useCallback((key: RowId) => {
    onSelectedChange?.(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }, [selected, onSelectedChange]);

  const rows = table.data;
  const idOf = useCallback((row: T): RowId => (row as Record<string, unknown>)[rowKey] as RowId, [rowKey]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleIds = useMemo(() => rows.map(idOf), [rows, idOf]);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someChecked = !allChecked && visibleIds.some((id) => selectedSet.has(id));
  const headCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headCheckRef.current) headCheckRef.current.indeterminate = someChecked;
  }, [someChecked]);

  const toggleAllVisible = () => {
    if (!onSelectedChange) return;
    if (allChecked) onSelectedChange(selected.filter((id) => !visibleIds.includes(id)));
    else onSelectedChange([...selected, ...visibleIds.filter((id) => !selectedSet.has(id))]);
  };

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, { group: ServerDataGroup; items: { row: T; index: number }[] }>();
    rows.forEach((row, index) => {
      const g = groupBy(row);
      const entry = map.get(g.key);
      if (entry) entry.items.push({ row, index });
      else map.set(g.key, { group: g, items: [{ row, index }] });
    });
    return [...map.values()];
  }, [rows, groupBy]);

  const colSpan = columns.length + (rowNumber ? 1 : 0) + (selectable ? 1 : 0);
  const isSelectedKey = (id: RowId) => selectedKey !== null && String(selectedKey) === String(id);
  const showInitialLoading = table.loading && rows.length === 0;
  const showEmpty = !table.loading && !table.error && rows.length === 0;

  const renderRow = (row: T, index: number) => {
    const id = idOf(row);
    return (
      <Row<T>
        key={String(id)}
        row={row}
        index={index}
        startIndex={table.start}
        columns={columns}
        rowNumber={rowNumber}
        selectable={!!selectable}
        checked={selectedSet.has(id)}
        open={isSelectedKey(id)}
        clickable={!!onRowClick}
        id={id}
        onOpen={onOpen}
        onToggle={toggle}
      />
    );
  };

  let body: ReactNode;
  if (renderBody) {
    body = renderBody({ rows, columns, startIndex: table.start, selected, toggle, onOpen });
  } else if (groups) {
    body = groups.map(({ group, items }) => {
      const isCollapsed = collapsed.has(group.key);
      return [
        <tr key={`g-${group.key}`} className="tbl-group-row">
          <td colSpan={colSpan}>
            <button type="button" className="tbl-group-toggle" aria-expanded={!isCollapsed} onClick={() => toggleGroup(group.key)}>
              <ChevronDown aria-hidden />
              <span>{group.label}</span>
              <span className="count">{items.length}</span>
              {group.meta && <span className="tbl-group-meta">{group.meta}</span>}
            </button>
          </td>
        </tr>,
        ...(isCollapsed ? [] : items.map(({ row, index }) => renderRow(row, index))),
      ];
    });
  } else {
    body = rows.map(renderRow);
  }

  const handleSortKey = (e: KeyboardEvent<HTMLTableCellElement>, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); table.setSort(idx); }
  };

  return (
    <div className="workspace">
      {rail && (
        <StatusRail
          statuses={rail.statuses}
          value={rail.value}
          onChange={rail.onChange}
          labels={rail.labels}
          stats={table.statusStats}
        />
      )}

      <section className="card workspace-card">
        <div className="toolbar">
          {title && <h2 className="tbl-title">{title}</h2>}
          <SearchBox value={searchInput} onChange={handleSearch} placeholder={searchPlaceholder} width={280} />
          {toolbar}
          {actions && <><div className="toolbar-spacer" />{actions}</>}
        </div>

        {table.error && (
          <div style={{ padding: '12px 16px 0' }}>
            <Alert tone="error">
              <div className="flex items-center gap-2">
                <span className="flex-1">{table.error}</span>
                <Button size="xs" icon={<RefreshCw />} onClick={reload}>Thử lại</Button>
              </div>
            </Alert>
          </div>
        )}

        <div className="tbl-area">
          {table.loading && <div className="tbl-progress" role="progressbar" aria-label="Đang tải" />}
          <div className={clsx('tbl-wrap', table.loading && rows.length > 0 && 'is-loading')} aria-busy={table.loading}>
            <table className={clsx('tbl tbl-zebra tbl-hover', density === 'dense' ? 'tbl-dense' : 'tbl-comfortable', onRowClick && 'tbl-click')}>
              <thead>
                <tr>
                  {selectable && (
                    <th className="col-check">
                      <input
                        ref={headCheckRef}
                        type="checkbox"
                        className="checkbox th-check"
                        checked={allChecked}
                        onChange={toggleAllVisible}
                        disabled={rows.length === 0}
                        aria-label="Chọn tất cả dòng đang hiển thị"
                      />
                    </th>
                  )}
                  {rowNumber && <th className="row-num">#</th>}
                  {columns.map((col) => {
                    const sortable = col.sortIndex !== undefined;
                    const isSorted = sortable && table.orderCol === col.sortIndex;
                    return (
                      <th
                        key={col.key}
                        className={clsx(sortable && 'sortable', cellClass(col))}
                        style={{ width: col.width, minWidth: col.minWidth }}
                        aria-sort={isSorted ? (table.orderDir === 'asc' ? 'ascending' : 'descending') : undefined}
                        tabIndex={sortable ? 0 : undefined}
                        onClick={sortable ? () => table.setSort(col.sortIndex!) : undefined}
                        onKeyDown={sortable ? (e) => handleSortKey(e, col.sortIndex!) : undefined}
                      >
                        <span className="th-inner">
                          {col.label}
                          {sortable && (isSorted
                            ? (table.orderDir === 'asc' ? <ChevronUp /> : <ChevronDown />)
                            : <ChevronsUpDown style={{ opacity: 0.45 }} />)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {showInitialLoading ? (
                  <tr><td colSpan={colSpan} style={{ padding: 0 }}><LoadingBlock minHeight={200} /></td></tr>
                ) : showEmpty ? (
                  <tr><td colSpan={colSpan} style={{ padding: 0 }}><EmptyState compact title={searchInput ? 'Không tìm thấy kết quả' : emptyTitle} /></td></tr>
                ) : body}
              </tbody>
            </table>
          </div>
        </div>

        <TableFooter
          start={table.start}
          length={table.length}
          recordsFiltered={table.recordsFiltered}
          recordsTotal={table.recordsTotal}
          rowCount={rows.length}
          currentPage={table.currentPage}
          totalPages={table.totalPages}
          onPage={table.setPage}
          onLength={table.setLength}
        />
      </section>

      {aside}
    </div>
  );
}
