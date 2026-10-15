---
phase: 3
title: "Hoàn thiện workspace Chuyến đi"
status: completed
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 3: Hoàn thiện workspace Chuyến đi

## Overview
Nối các nút còn là placeholder trên trang Chuyến đi vào endpoint đã có, ẩn những nút chưa có backend, và chốt hai câu hỏi mở (nhóm tuyến, lọc đơn vị) với người dùng.

## Requirements
- Functional:
  - Nút chính trong drawer đổi trạng thái qua `PATCH /trips/:id/status` theo map: PLANNED→DISPATCHED ("Điều xe"), DISPATCHED→IN_TRANSIT ("Bắt đầu chuyến"), IN_TRANSIT→COMPLETED ("Xác nhận đã giao"), CANCELLED→PLANNED ("Khôi phục chuyến"). COMPLETED: không có hành động chính (ẩn nút, không "Xem chứng từ" vì chưa có chứng từ).
  - Thanh bulk: "Đổi trạng thái" áp dụng cùng chuyển trạng thái cho các chuyến đã chọn (gọi tuần tự `PATCH`, báo kết quả thành công/thất bại từng chuyến); "Gán xe / nhà xe" dùng `PUT /trips/:id` với `vehicleId` qua modal chọn xe (`SearchableSelect`).
  - "Xuất Excel": xuất CSV UTF-8 (BOM) từ các dòng đang hiển thị, tên file `chuyen-di-YYYYMMDD.csv`, cột như bảng. Nếu người dùng cần xuất toàn bộ server-side → ghi là việc backend, không làm ở đây.
  - Ẩn: "In lệnh vận chuyển", nút ⋮ của dòng, "Mở toàn trang" trong drawer (chưa có spec).
- Non-functional: hành động tốn < 1 request/chuyến; lỗi hiển thị bằng `Alert`, không `alert()` mới.

## Architecture
`useTripDetail.ts` đã gom edit/delete/cost; thêm `changeStatus(next)` và `assignVehicle(vehicleId)` vào cùng controller để drawer và bulk bar dùng chung. Bulk bar nhận callback từ `TripListPage`. CSV export là hàm thuần trong `modules/trip/components/export-csv.ts` (không thêm thư viện).

## Related Code Files
- Modify: `packages/web/src/modules/trip/components/useTripDetail.ts`, `TripDetailDrawer.tsx`, `BulkActionBar.tsx`, `TripTable.tsx` (ẩn ⋮), `TripListPage.tsx`
- Create: `packages/web/src/modules/trip/components/export-csv.ts`, `AssignVehicleModal.tsx`
- Read: `packages/server/src/modules/trip/trip.service.ts` (`updateTripStatus` — xem transition hợp lệ và quyền), `trip.routes.ts`

## Implementation Steps
1. Đọc `updateTripStatus` để lấy bảng transition hợp lệ và lỗi trả về; map nhãn nút theo đó, không đoán.
2. Thêm `changeStatus`/`assignVehicle` vào `useTripDetail`; drawer gọi `changeStatus` ở nút chính, `busy` khóa nút, lỗi hiện `Alert` trong drawer, thành công thì `reload()` + cập nhật `detail`.
3. Bulk: `BulkActionBar` nhận `onChangeStatus(next)` và `onAssignVehicle()`; `TripListPage` chạy tuần tự trên `checked`, gom kết quả, hiện `Alert` tóm tắt "x thành công, y lỗi" rồi `reload()` và xóa chọn.
4. `AssignVehicleModal`: tải `/vehicles?pageSize=200`, `SearchableSelect`, gọi `PUT /trips/:id` với `vehicleId` (+ `version` nếu backend yêu cầu optimistic lock — kiểm tra `PUT` handler).
5. `export-csv.ts`: nhận `TripRow[]` → chuỗi CSV; nút "Xuất Excel" tải file. Tên cột tiếng Việt như bảng.
6. Ẩn các nút chưa có backend; xóa `PRIMARY_ACTION` cho COMPLETED.
7. Hỏi người dùng hai câu mở (nhóm tuyến, lọc đơn vị); nếu "có" → tạo phase mới/ticket backend, không làm trong phase này.

## Success Criteria
- [x] Đổi trạng thái từ drawer và từ bulk bar hoạt động trên DB thật, tôn trọng transition (web giữ luật; backend không kiểm).
- [x] Gán xe từ bulk bar cập nhật cột "Xe · Tài xế" sau reload. _(kiểm qua API; chưa bấm trên UI)_
- [ ] Xuất CSV mở được bằng Excel, đúng dấu tiếng Việt. _(BOM + escape đã kiểm bằng script; cần mở thử trên Excel thật)_
- [x] Không còn nút nào bấm mà không làm gì.
- [x] `tsc`, `oxlint`, `vite build` xanh.

## Risk Assessment
- **`updateTripStatus` có rule khác map nhãn dự kiến** (ví dụ cần DELIVERED giữa IN_TRANSIT và COMPLETED, stepper có bước "Đã giao") → tín hiệu: đọc service ở bước 1. Phản ứng: map theo service, cập nhật `TripStepper` nếu thêm bước.
- **Bulk tuần tự chậm với > 50 chuyến** → giới hạn chọn tối đa 50 cho bulk status, hiện cảnh báo; nếu cần hơn thì đề xuất endpoint bulk ở backend.
- **`PUT /trips/:id` ghi đè toàn bộ bản ghi** → đọc handler; nếu PUT yêu cầu đủ trường, gửi `detail` hiện tại + `vehicleId` thay vì patch một trường.
