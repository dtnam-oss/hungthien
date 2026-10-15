---
phase: 4
title: "Chuyển Chuyến đi, Kế hoạch, Kỳ lương; xóa cơ chế cũ"
status: pending
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: Chuyến đi, Kế hoạch, Kỳ lương + xóa cơ chế bảng cũ

## Overview
Đưa ba trang còn lại về `ServerDataTable`: Chuyến đi giữ nhóm 2 cấp và dòng 2 hàng qua `renderBody` tùy biến; Kế hoạch và Kỳ lương bỏ fetch tay. Xóa `DataTable.tsx`, `TripFilterRail`, footer/pager tự viết.

## Requirements
- Functional:
  - **Chuyến đi**: rail trạng thái = `StatusRail` (chọn nhiều); lọc KH/nhà xe/tài xế = `SearchableMultiSelect`; toolbar giữ khoảng ngày + toggle "Theo ngày/Danh sách"; bảng dùng `ServerDataTable` với `density="comfortable"` và `renderBody` để giữ nhóm ngày → tuyến, checkbox chọn nhiều, drawer, bulk bar, CSV. Footer chuẩn (50/100/200, Đầu/Cuối, "lọc từ tổng").
  - **Kế hoạch**: `/trip-plans/dt`; cột KH, tuyến, biển số, tài xế, lịch chạy (chip ngày), cấu hình, trạng thái (`isActive`); rail Hoạt động/Ngừng; lọc KH/xe/tài xế multi; panel + modal giữ.
  - **Kỳ lương** (tab "Quản lý kỳ"): `/payroll/periods/dt`; cột kỳ (tháng/năm), loại, khu vực, trạng thái, số NV, tổng; rail trạng thái DRAFT/CONFIRMED/PAID; lọc năm/loại/khu vực multi; hành động dòng giữ (tính lại/duyệt/chi/xóa với confirm). Các tab khác (Tổng hợp, Chi tiết, Thưởng/phạt) giữ nguyên trong phase này.
  - Xóa: `shared/components/DataTable.tsx`, `modules/trip/components/TripFilterRail.tsx` (thay `StatusRail` + multi-select), pager/footer tự viết ở Khách hàng/Kế hoạch; `FilterSelect` chỉ còn nếu vẫn có chỗ dùng (kiểm grep), nếu không thì xóa khỏi `FormControls`.
- Non-functional: `TripTable` giảm còn phần render thân bảng; không request đôi; tsc/lint xanh.

## Architecture
`ServerDataTable` nhận `renderBody?: (ctx: { rows, columns, selected, toggle, onOpen, startIndex }) => ReactNode` — Chuyến đi truyền hàm từ `TripTable` (đổi thành hàm/hook `renderTripBody`). Lọc nhiều trạng thái gửi `status=A,B`; `attnFilter` (cần xử lý) vẫn lọc client-side trên trang hiện tại (ghi chú trong UI: "trên trang này").

## Related Code Files
- Modify: `packages/web/src/modules/trip/TripListPage.tsx`, `modules/trip/components/TripTable.tsx`, `modules/trip-plan/TripPlanListPage.tsx`, `modules/payroll/PayrollPage.tsx`
- Delete: `shared/components/DataTable.tsx`, `modules/trip/components/TripFilterRail.tsx`
- Modify: `shared/components/ServerDataTable.tsx` (`renderBody`, `density`), `shared/ui/FormControls.tsx` (bỏ `FilterSelect` nếu không còn dùng), `shared/ui/index.ts`

## Implementation Steps
1. Thêm `renderBody` + `density` vào `ServerDataTable` (nếu phase 2 chưa có).
2. Chuyến đi: thay rail/filters/footer; giữ `useTripDetail`, bulk, CSV; chụp đối chiếu ảnh mẫu `/trips`.
3. Kế hoạch: bỏ `fetchList` tay, dùng `/trip-plans/dt`; panel/modal giữ.
4. Kỳ lương: tab kỳ dùng `ServerDataTable`; giữ `action()` + confirm.
5. Xóa file cũ, grep xác nhận 0 import; `tsc`/lint/build.
6. Commit `refactor(web): Chuyến đi, Kế hoạch, Kỳ lương dùng ServerDataTable; xóa DataTable cũ`.

## Success Criteria
- [ ] 3 trang dùng `ServerDataTable` + `/dt`; Chuyến đi vẫn nhóm 2 cấp, drawer, bulk, CSV hoạt động.
- [ ] `DataTable.tsx`, `TripFilterRail.tsx` đã xóa; grep `DataTable\b` ngoài `ServerDataTable` = 0.
- [ ] Không request đôi; footer chuẩn ở cả 3 trang.
- [ ] `tsc`, `oxlint` 0 error, build xanh.

## Risk Assessment
- **`renderBody` tùy biến làm mất zebra/sticky** → thân bảng Chuyến đi vẫn dùng `.tbl` markup chuẩn; chỉ thay thứ tự hàng/nhóm.
- **Bulk selection với trang 200 dòng** → `BULK_LIMIT` 50 giữ; cảnh báo khi chọn quá.
- **Kỳ lương `/dt` trả `_count` nhân viên/tổng** cần `include` — nếu chậm, bỏ cột tổng khỏi bảng và giữ ở tab Tổng hợp (quyết khi đo).
