---
phase: 3
title: "Chuyển trang danh mục: NV, Xe, NCC, Giá, KH"
status: completed
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: Chuyển trang danh mục sang ServerDataTable

## Overview
Thay `DataTable` (REST) ở Nhân viên, Xe, NCC, Giá KH/NCC và bảng tự viết ở Khách hàng bằng `ServerDataTable` + `/dt`; bộ lọc trong toolbar thành `SearchableMultiSelect`; rail đếm trạng thái ở cả 5 trang. Giữ panel chi tiết, modal tạo, quyền.

## Requirements
- Functional (mỗi trang):
  - Layout `.page page-fill` → `.workspace` (rail | card) · panel chi tiết inline 480px bên phải khi ≥ lg (như nay), overlay dưới lg.
  - Cột theo bảng `SORTABLE_COLUMNS` phase 1 (`sortIndex` đúng chỉ số); cột phụ `hideBelow`.
  - Dòng một hàng ~32px: Xe (biển số `Plate`, loại, hãng, tải, sở hữu pill, tài xế 1, trạng thái), NV (mã, tên, SĐT, chức danh, phòng ban, TX, trạng thái), NCC (mã, tên, MST, SĐT, liên hệ, số xe, trạng thái), Giá (KH/NCC, tuyến, loại, đơn giá, hiệu lực, trạng thái), KH (mã, tên, MST, địa chỉ, người LH, SĐT, trạng thái).
  - Bộ lọc: Xe = trạng thái (rail) + sở hữu + loại xe + tài xế (multi); NV = trạng thái (rail) + tài xế/không + phòng ban; NCC = trạng thái (rail); Giá = trạng thái (rail) + KH + tuyến; KH = trạng thái (rail). Rail và select trạng thái là **một** state.
  - Sau tạo/sửa/xóa: `table.reload()` giữ trang/sort/search (không remount `key`).
  - Nhóm 1 cấp tùy chọn: Xe theo hãng (như mẫu), Giá theo KH — bật qua `groupBy`, có toggle "Nhóm" trong toolbar; mặc định tắt trừ Xe.
- Non-functional: không request đôi; `tsc`/lint xanh; không còn import `DataTable`.

## Architecture
Mỗi trang: `TABLE_COLUMNS` (với `sortIndex`) + `filters` state → `<ServerDataTable endpoint="/<m>/dt" rail={…} toolbar={<SearchableMultiSelect …/>} actions={<Button Thêm/>} selectedKey onRowClick />`; panel/modal giữ nguyên. `useServerTable` nằm trong `ServerDataTable`; trang cần `reload` → nhận qua `ref`/`onReady(api)` (`ServerDataTable` expose `{ reload }` bằng `useImperativeHandle`).

## Related Code Files
- Modify: `packages/web/src/modules/employee/EmployeeListPage.tsx`, `vehicle/VehicleListPage.tsx`, `supplier/SupplierListPage.tsx`, `pricing/PricingListPage.tsx`, `customer/CustomerListPage.tsx`
- Modify: `shared/components/ServerDataTable.tsx` (expose `reload`, nếu phase 2 chưa có)
- Read: `plans/261015-1717-server-datatable-layout/phase-01-backend-dt-endpoints.md` (bảng cột), `docs/design/ui-design-system.md`

## Implementation Steps
1. Xe trước (gần mẫu nhất): chuyển sang `ServerDataTable`, `groupBy` hãng, rail trạng thái, multi-select sở hữu/loại/tài xế; chụp đối chiếu với ảnh mẫu `/vehicles` ở 1440.
2. Nhân viên, NCC (đơn giản) theo cùng khuôn.
3. Giá KH/NCC: `priceType` gửi cố định trong `filters`; lọc KH/tuyến multi; NCC vẫn chặn tạo (phase 5 plan cũ).
4. Khách hàng: thay toàn bộ bảng tự viết + footer riêng; giữ panel kéo giãn (resizable) hiện có; chip đếm trạng thái → rail.
5. Mỗi trang: kiểm network (1 request/thao tác), sort từng cột đúng (so với server), rail đếm khớp footer.
6. Xóa import `DataTable`/`FilterSelect` khỏi 5 trang; commit `refactor(web): trang danh mục dùng ServerDataTable`.

## Success Criteria
- [x] 5 trang dùng `ServerDataTable` + `/dt`; không request đôi; sort mọi cột đúng.
- [x] Rail đếm = `statusStats`; footer có "lọc từ tổng", 50/100/200, Đầu/Cuối.
- [x] Bảng cao theo viewport ở 1280/1440/1920; 390px không cuộn ngang trang.
- [x] Panel chi tiết, modal tạo, sửa/xóa hoạt động như trước. _(kiểm bằng code review + reload sau mutation; chưa bấm tay trên trình duyệt)_

## Risk Assessment
- **Sort index lệch** (từng xảy ra ở KH) → test phase 1 + kiểm tay sort 1 cột cuối (`status`) mỗi trang; tín hiệu: sắp xếp theo cột khác → sửa `sortIndex`.
- **Khách hàng mất tính năng kéo giãn panel** → giữ `PANEL_STORAGE_KEY` và handle kéo hiện có bên ngoài `ServerDataTable`.
- **`priceType` thiếu → 400** → `filters` luôn có `priceType`; `ServerDataTable` hiện lỗi server bằng `Alert`.
