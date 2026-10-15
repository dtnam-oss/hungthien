/* Luồng chuyển trạng thái chuyến do web giữ (backend chỉ kiểm enum + khóa kỳ) */

export const TRIP_STATUSES = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatus = typeof TRIP_STATUSES[number];

/** Hành động chính trong drawer: trạng thái hiện tại → (nhãn nút, trạng thái kế tiếp). COMPLETED không có. */
export const PRIMARY_TRANSITION: Partial<Record<TripStatus, { label: string; next: TripStatus }>> = {
  PLANNED: { label: 'Điều xe', next: 'DISPATCHED' },
  DISPATCHED: { label: 'Bắt đầu chuyến', next: 'IN_TRANSIT' },
  IN_TRANSIT: { label: 'Xác nhận đã giao', next: 'COMPLETED' },
  CANCELLED: { label: 'Khôi phục chuyến', next: 'PLANNED' },
};

/** Mọi chuyển trạng thái hợp lệ (dùng cho đổi hàng loạt): từ → danh sách đích */
export const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'PLANNED', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED', 'DISPATCHED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['PLANNED'],
};

export function canTransition(from: string, to: TripStatus): boolean {
  return (ALLOWED_TRANSITIONS[from as TripStatus] ?? []).includes(to);
}

/** Giới hạn số chuyến xử lý hàng loạt (gọi tuần tự từng endpoint) */
export const BULK_LIMIT = 50;
