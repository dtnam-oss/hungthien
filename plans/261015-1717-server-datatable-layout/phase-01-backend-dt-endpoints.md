---
phase: 1
title: "Backend: giao thức /dt cho mọi module"
status: completed
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 1: Backend — giao thức /dt cho mọi module

## Overview
Thêm `GET /<module>/dt` theo giao thức DataTables server-side cho Nhân viên, Xe, NCC, Bảng giá, Kế hoạch, Kỳ lương; nâng `/customers/dt` và `/trips/dt` lên cùng chuẩn (statusStats, lọc nhiều giá trị). Tách phần dùng chung vào `shared/datatable.ts`.

## Requirements
- Functional:
  - Tham số: `draw`, `start`, `length` (clamp 1–500), `search[value]`, `order[0][column]`, `order[0][dir]`, cộng bộ lọc riêng module; **mọi bộ lọc nhận nhiều giá trị** dạng `status=PLANNED,DISPATCHED` (CSV) — parse chung.
  - Response: `{ draw, recordsTotal, recordsFiltered, data[], statusStats[{status,count}], ...statsKhác }`. `statusStats` tính trên tập **sau tìm kiếm + các bộ lọc khác, trước lọc status** (như `/trips/dt` hiện tại) để rail không mất số khi đang lọc.
  - Sort: `SORTABLE_COLUMNS` tường minh mỗi module; cột ngoài danh sách → fallback mặc định, không 500.
  - Tìm kiếm: `contains` không phân biệt hoa thường trên các cột văn bản chính + quan hệ tên (ví dụ xe: biển số, hãng, tên tài xế).
- Non-functional: cùng `requirePermission` với route list; 1 lần `Promise.all` cho data + 2 count + groupBy (mẫu trips-dt); không N+1.

## Architecture
```
shared/datatable.ts
  parseDTParams(req.query, { defaultLength: 100 }) → { draw, start, length, search, orderCol, orderDir }
  parseMulti(req.query.status) → string[] | undefined        // "A,B" | ["A","B"] | undefined
  buildDTResponse({ draw, recordsTotal, recordsFiltered, data, statusStats, extra })
modules/<m>/<m>-dt.service.ts
  SORTABLE_COLUMNS (export, để test), buildWhere(search, filters), list(params, filters)
modules/<m>/<m>.routes.ts
  router.get('/dt', requirePermission(...), handler) — đặt TRƯỚC router.get('/:id')
```
Bộ lọc theo module (giữ tên tham số đang có ở REST):

| Module | Lọc | Sort columns (thứ tự = index web) |
|---|---|---|
| employees | status, isDriver, department | code, fullName, phone, position, department, status |
| vehicles | status, ownerType, vehicleType, primaryDriverId, supplierId | plateNumber, vehicleType, brand, loadCapacity, ownerType, status |
| suppliers | status | code, name, taxCode, phone, status |
| pricing | priceType (bắt buộc), status, customerId, routeId | customerName, routeName, tripType, unitPrice, validFrom, status |
| trip-plans | isActive, customerId, vehicleId, driverId | customerName, routeName, plateNumber, isActive |
| payroll/periods | year, type, status, regionId | year, month, type, status |
| customers (nâng) | status | code, name, taxCode, email, phone, status (giữ) + thêm `statusStats` |
| trips (nâng) | status (nhiều), customerId, driverId, supplierId, dateFrom/To | giữ nguyên |

## Related Code Files
- Create: `packages/server/src/shared/datatable.ts`, `packages/server/src/modules/employee/employee-dt.service.ts`, `vehicle/vehicle-dt.service.ts`, `supplier/supplier-dt.service.ts`, `pricing/pricing-dt.service.ts`, `trip-plan/trip-plan-dt.service.ts`, `payroll/payroll-period-dt.service.ts`
- Create: `packages/server/tests/shared/datatable.test.ts` (parse CSV/array/undefined, clamp length), `packages/server/tests/<m>/<m>-dt.test.ts` (SORTABLE_COLUMNS khớp bảng trên; `buildWhere` với status nhiều giá trị → `in`)
- Modify: 6 file `*.routes.ts` tương ứng (thêm `/dt`), `pricing/customer.routes.ts` (`/dt` dùng helper + statusStats), `trip/trips-dt.service.ts` (status nhiều giá trị qua `parseMulti`)
- Read: `trip/trips-dt.service.ts` (mẫu), `shared/pagination.ts`

## Implementation Steps
1. Viết `shared/datatable.ts` + test; `parseMulti` chấp nhận CSV, mảng (`status[]`), và chuỗi đơn.
2. Refactor `trips-dt.service.ts` dùng helper (không đổi output) và nhận `status` nhiều giá trị. Chạy test hiện có.
3. Viết `*-dt.service.ts` cho 6 module theo cùng khuôn (copy cấu trúc trips-dt: where → `Promise.all([findMany, count filtered, count total, groupBy status])`). `select` chỉ các cột trang danh sách cần (xem `DTRow` hiện tại của từng trang web).
4. Đăng ký route `/dt` trước `/:id` ở từng `*.routes.ts`; `customers/dt` chuyển sang helper và thêm `statusStats`.
5. Test vitest: mỗi module 1 file kiểm `SORTABLE_COLUMNS` (đúng mảng như bảng trên) và `buildWhere` (search + lọc nhiều giá trị). Không cần DB thật.
6. Smoke bằng curl trên server dev với token admin: 8 endpoint trả 200, `recordsTotal ≥ recordsFiltered`, `statusStats` cộng lại = recordsFiltered khi không lọc status.
7. Commit `feat(server): endpoint /dt DataTables cho mọi module`.

## Success Criteria
- [x] 8 endpoint `/dt` trả cùng shape; lọc nhiều giá trị hoạt động (`status=A,B`).
- [x] `SORTABLE_COLUMNS` của 8 module được export và có test khớp bảng trên.
- [x] `npm run test --workspace=packages/server` xanh, `tsc`/`build` server xanh.
- [x] REST `GET /` cũ không đổi (dropdown/modal vẫn chạy).

## Risk Assessment
- **Thứ tự route**: `/dt` đặt sau `/:id` sẽ bị bắt nhầm là id → tín hiệu: 400/404 "id không hợp lệ"; đặt `/dt` trước.
- **Pricing cần `priceType`**: nếu web gọi thiếu → trả cả hai loại; quyết định: trả 400 nếu thiếu, web luôn gửi.
- **Kỳ lương `status` mapping** (DRAFT/CONFIRMED/PAID) khác enum chung → `statusStats` trả key thô, web map nhãn qua `STATUS_TONES` (đã có).
- **Hiệu năng groupBy trên Trip lớn**: đã dùng ở `/trips/dt`; nếu > 300ms, thêm index `(status)` — đo bằng log morgan trước khi quyết.
