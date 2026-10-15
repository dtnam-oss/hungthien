import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, SearchX } from 'lucide-react';
import clsx from 'clsx';
import api from '../api';
import { SearchBox } from '../ui/FormControls';
import { EmptyState, Spinner } from '../ui/Feedback';
import { Pagination } from '../ui/Pagination';

export interface Column<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  /** Class cho cả th và td (ví dụ "num", "hidden md:table-cell", "w-24") */
  className?: string;
  /** Căn phải số */
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  endpoint: string;
  columns: Column<T>[];
  searchPlaceholder?: string;
  filters?: Record<string, string | undefined>;
  onRowClick?: (row: T) => void;
  rowKey?: keyof T & string;
  /** Hàng đang được chọn (highlight) */
  selectedKey?: string | number | null;
  extraParams?: Record<string, string>;
  /** Bộ lọc / nút đặt cạnh ô tìm kiếm trong toolbar */
  toolbar?: ReactNode;
  /** Nội dung bên phải toolbar */
  toolbarEnd?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Mặc định 100 dòng/trang (bảng dày theo mẫu vận hành) */
  pageSize?: number;
  compact?: boolean;
  /** Ẩn cột số thứ tự */
  hideRowNumber?: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function DataTable<T extends object>({
  endpoint,
  columns,
  searchPlaceholder = 'Tìm kiếm...',
  filters = {},
  onRowClick,
  rowKey = 'id' as keyof T & string,
  selectedKey = null,
  extraParams = {},
  toolbar,
  toolbarEnd,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  pageSize = 100,
  compact,
  hideRowNumber,
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const filtersKey = JSON.stringify(filters);
  const extraParamsKey = JSON.stringify(extraParams);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const parsedExtra = JSON.parse(extraParamsKey) as Record<string, string>;
      const params: Record<string, string | number> = { page, pageSize, ...parsedExtra };
      if (search) params.search = search;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }
      const parsedFilters = JSON.parse(filtersKey) as Record<string, string>;
      for (const [key, value] of Object.entries(parsedFilters)) {
        if (value !== undefined && value !== '') params[key] = value;
      }
      const res = await api.get<PaginatedResponse<T>>(endpoint, { params });
      setData(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('DataTable fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, search, sortBy, sortOrder, filtersKey, extraParamsKey]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset về trang 1 khi đổi bộ lọc
  useEffect(() => { setPage(1); }, [filtersKey]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasActiveSearch = search !== '';
  const colSpan = columns.length + (hideRowNumber ? 0 : 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="toolbar">
        <SearchBox value={searchInput} onChange={setSearchInput} onSubmit={handleSearch} placeholder={searchPlaceholder} />
        {toolbar}
        {toolbarEnd && <><div className="toolbar-spacer" />{toolbarEnd}</>}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0 relative">
        <table className={clsx('tbl tbl-hover', onRowClick && 'tbl-click', compact && 'tbl-compact')}>
          <thead>
            <tr>
              {!hideRowNumber && <th className="row-num">#</th>}
              {columns.map((col) => {
                const isSorted = col.sortable && sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    className={clsx(col.sortable && 'sortable', col.align === 'right' && 'num', col.align === 'center' && 'center', col.className)}
                    onClick={() => col.sortable && handleSort(col.key)}
                    aria-sort={isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="th-inner">
                      {col.label}
                      {col.sortable && (
                        isSorted
                          ? (sortOrder === 'asc' ? <ChevronUp /> : <ChevronDown />)
                          : <ChevronsUpDown style={{ opacity: 0.45 }} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr><td colSpan={colSpan} className="tbl-empty"><span className="inline-flex items-center gap-2"><Spinner size={16} />Đang tải…</span></td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colSpan} style={{ padding: 0 }}>
                  <EmptyState
                    compact
                    icon={hasActiveSearch ? <SearchX /> : undefined}
                    title={hasActiveSearch ? 'Không tìm thấy kết quả' : emptyTitle}
                    description={hasActiveSearch ? `Không có bản ghi nào khớp với "${search}".` : emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const record = row as Record<string, unknown>;
                const key = String(record[rowKey]);
                const selected = selectedKey !== null && String(selectedKey) === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row); } : undefined}
                    className={clsx(selected && 'is-selected')}
                    aria-selected={selected || undefined}
                  >
                    {!hideRowNumber && <td className="row-num">{from + index}</td>}
                    {columns.map((col) => (
                      <td key={col.key} className={clsx(col.align === 'right' && 'num', col.align === 'center' && 'center', col.className)}>
                        {col.render ? col.render(row) : String(record[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {loading && data.length > 0 && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden" aria-hidden>
            <div className="h-full w-1/3 animate-pulse" style={{ background: 'var(--accent)' }} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="foot">
        <span>Hiển thị <strong style={{ color: 'var(--text-2)' }}>{from}–{to}</strong> / {total} bản ghi</span>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
