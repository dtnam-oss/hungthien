/* Hàm định dạng dùng chung — tiền, số, ngày giờ theo chuẩn VN */

const VND = new Intl.NumberFormat('vi-VN');

/** 5000000 → "5.000.000 đ"; null/undefined → "—" */
export function formatMoney(value: number | string | null | undefined, dash = '—'): string {
  if (value === null || value === undefined || value === '') return dash;
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return dash;
  return `${VND.format(n)} đ`;
}

/** 1234.5 → "1.234,5" */
export function formatNumber(value: number | string | null | undefined, dash = '—'): string {
  if (value === null || value === undefined || value === '') return dash;
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return dash;
  return VND.format(n);
}

/** ISO/Date → "dd/MM/yyyy" */
export function formatDate(value: string | Date | null | undefined, dash = '—'): string {
  if (!value) return dash;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return dash;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** ISO/Date → "HH:mm" */
export function formatTime(value: string | Date | null | undefined, dash = '—'): string {
  if (!value) return dash;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return dash;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** ISO/Date → "dd/MM/yyyy HH:mm" */
export function formatDateTime(value: string | Date | null | undefined, dash = '—'): string {
  if (!value) return dash;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return dash;
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** ISO → "yyyy-MM-dd" cho input[type=date] */
export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Hôm nay dạng "yyyy-MM-dd" (giờ máy) */
export function todayInputDate(): string {
  return toInputDate(new Date());
}

/** Lấy thông điệp lỗi từ axios error / Error / string */
export function errorMessage(err: unknown, fallback = 'Có lỗi xảy ra'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  const e = err as { response?: { data?: { error?: { message?: string } | string; message?: string } }; message?: string };
  const apiErr = e.response?.data?.error;
  if (typeof apiErr === 'string') return apiErr;
  if (apiErr?.message) return apiErr.message;
  if (e.response?.data?.message) return e.response.data.message;
  return e.message || fallback;
}
