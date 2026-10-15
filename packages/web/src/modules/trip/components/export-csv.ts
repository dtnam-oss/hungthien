/* Xuất danh sách chuyến đang hiển thị ra CSV (UTF-8 có BOM để Excel đọc đúng dấu) */

import { STATUS_TONES } from '../../../shared/ui';
import { formatDate } from '../../../shared/format';
import type { TripRow } from './types';

const HEADERS = ['Mã chuyến', 'Ngày', 'Điểm đi', 'Điểm đến', 'Tuyến', 'Khách hàng', 'Mã KH', 'Biển số', 'Tài xế chính', 'Tài xế phụ', 'Nhà xe', 'SL (tấn)', 'Trạng thái', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Ghi chú'];

/** Chống formula injection: ô bắt đầu bằng = + @ tab CR (hoặc - không phải số) được thêm dấu ' phía trước */
function guardFormula(s: string): string {
  if (/^[=+@\t\r]/.test(s)) return `'${s}`;
  if (/^-/.test(s) && !/^-\d/.test(s)) return `'${s}`;
  return s;
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = guardFormula(String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tripsToCsv(rows: TripRow[]): string {
  const lines = rows.map((r) => [
    r.tripCode,
    formatDate(r.tripDate, ''),
    r.Route?.origin,
    r.Route?.destination,
    r.Route?.name,
    r.Customer?.name,
    r.Customer?.code,
    r.Vehicle?.plateNumber,
    r.primaryDriver?.fullName,
    r.secondaryDriver?.fullName,
    r.Vehicle?.Supplier?.name,
    r.cargoWeight,
    STATUS_TONES[r.status]?.label ?? r.status,
    r.revenue,
    r.totalCost,
    r.profit,
    r.notes,
  ].map(cell).join(','));
  // Không thêm dòng "sep=,": Excel có thể bỏ qua BOM khi gặp nó và làm mất dấu tiếng Việt.
  // Nếu Excel gộp một cột, dùng Data › From Text/CSV.
  return '﻿' + [HEADERS.join(','), ...lines].join('\r\n');
}

/** Tải file CSV về máy, tên `chuyen-di-YYYYMMDD.csv` */
export function downloadTripsCsv(rows: TripRow[]) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const blob = new Blob([tripsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chuyen-di-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
