import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Số trang hiện mỗi bên trang hiện tại */
  siblings?: number;
  /** Thêm nút Đầu / Cuối */
  showEdges?: boolean;
}

/** Danh sách số trang có dấu "…": 1 … 4 5 6 … 366 */
function pageItems(page: number, total: number, siblings: number): (number | 'gap')[] {
  if (total <= 5 + siblings * 2) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, page - siblings);
  const end = Math.min(total - 1, page + siblings);
  if (start > 2) items.push('gap');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('gap');
  items.push(total);
  return items;
}

/** Phân trang số trang, dùng trong `.foot` */
export function Pagination({ page, totalPages, onChange, siblings = 1, showEdges }: PaginationProps) {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), total);
  return (
    <nav className="pager" aria-label="Phân trang">
      {showEdges && <button type="button" aria-label="Trang đầu" className="pager-edge" onClick={() => onChange(1)} disabled={current <= 1}>Đầu</button>}
      <button type="button" aria-label="Trang trước" onClick={() => onChange(current - 1)} disabled={current <= 1}><ChevronLeft /></button>
      {pageItems(current, total, siblings).map((item, i) =>
        item === 'gap'
          ? <button key={`gap-${i}`} type="button" disabled aria-hidden>…</button>
          : <button key={item} type="button" onClick={() => onChange(item)} aria-current={item === current ? 'page' : undefined}>{item}</button>,
      )}
      <button type="button" aria-label="Trang sau" onClick={() => onChange(current + 1)} disabled={current >= total}><ChevronRight /></button>
      {showEdges && <button type="button" aria-label="Trang cuối" className="pager-edge" onClick={() => onChange(total)} disabled={current >= total}>Cuối</button>}
    </nav>
  );
}
