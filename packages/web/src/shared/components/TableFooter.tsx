import { Pagination } from '../ui/Pagination';

const PAGE_SIZES = [50, 100, 200] as const;

export interface TableFooterProps {
  start: number;
  length: number;
  recordsFiltered: number;
  recordsTotal: number;
  /** Số dòng thực tế của trang hiện tại */
  rowCount: number;
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
  onLength: (length: number) => void;
}

/** Chân bảng: "Hiển thị a đến b / n kết quả", cỡ trang 50/100/200, phân trang Đầu ‹ 1 2 … › Cuối */
export function TableFooter({
  start, length, recordsFiltered, recordsTotal, rowCount, currentPage, totalPages, onPage, onLength,
}: TableFooterProps) {
  const from = recordsFiltered === 0 ? 0 : start + 1;
  const to = recordsFiltered === 0 ? 0 : start + rowCount;
  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const sizes: number[] = PAGE_SIZES.includes(length as (typeof PAGE_SIZES)[number]) ? [...PAGE_SIZES] : [...PAGE_SIZES, length].sort((a, b) => a - b);

  return (
    <div className="foot">
      <span className="foot-range" role="status">
        Hiển thị {fmt(from)} đến {fmt(to)} / {fmt(recordsFiltered)} kết quả
        {recordsFiltered < recordsTotal && <> (lọc từ {fmt(recordsTotal)})</>}
      </span>
      <label className="foot-size">
        <select className="select" value={length} onChange={(e) => onLength(Number(e.target.value))} aria-label="Số dòng mỗi trang">
          {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>dòng / trang</span>
      </label>
      <Pagination page={currentPage} totalPages={totalPages} onChange={onPage} showEdges />
    </div>
  );
}
