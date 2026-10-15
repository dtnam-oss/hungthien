---
title: Brainstorm — Thiết kế lại layout toàn bộ bảng dữ liệu TMS (DataTable server-side theo mẫu NAK)
date: 2026-10-15
status: accepted
related:
  - plans/reports/brainstorm-261015-0854-tms-ui-redesign-nak-layout.md
  - docs/design/ui-design-system.md
  - packages/server/src/modules/trip/trips-dt.service.ts
  - packages/web/src/shared/hooks/useServerTable.ts
---

## Tóm tắt

Mẫu tham chiếu: app.nakvn.com/vehicles (ảnh 15/10/2026). Khác biệt chính so với HT-TMS: bảng chiếm trọn chiều cao màn hình (header/footer dính, cuộn trong bảng), rail đếm trạng thái ở mọi bảng, toolbar chuẩn (tiêu đề · tìm · Lọc · Thêm), dòng một hàng ~32px zebra có nhóm, footer "Hiển thị a đến b / n (lọc từ N)" + Đầu ‹ 1 › Cuối, và toàn bộ dữ liệu theo giao thức DataTables server-side.

Hiện trạng web có **4 cơ chế bảng**: `DataTable` (REST `page/pageSize/sortBy`: NV, Xe, NCC, Giá), `useServerTable` (DataTables `/dt`: Chuyến, KH) với markup tự viết, Kế hoạch tự fetch, Bảng lương tự fetch. Backend mới có `/trips/dt` (kèm `statusStats`, `customerStats`) và `/customers/dt` (không stats).

## Hợp đồng

- **Outcome:** 9 trang danh sách (Chuyến đi, Kế hoạch, Xe, Khách hàng, Nhà cung cấp, Nhân viên, Giá KH, Giá NCC, Kỳ lương) dùng **một** component `ServerDataTable` + một hook, layout theo mẫu: rail đếm trạng thái · card toolbar chuẩn · bảng chiếm hết không gian còn lại, header + footer dính · phân trang số có Đầu/Cuối và "lọc từ tổng" · tìm/sort/lọc/phân trang đều server-side.
- **Constraints:** design system v3 (token, `.tbl`, dark mode); giữ panel chi tiết/drawer, quyền, nhóm 2 cấp ở Chuyến đi; backend thêm `/dt` theo đúng khuôn `trips-dt.service.ts` (clamp `length` ≤ 500, `recordsTotal/recordsFiltered`, `statusStats`), giữ nguyên REST cũ cho dropdown/modal.
- **Non-goals:** ẩn/hiện cột, lưu bộ lọc, export toàn bộ, đổi form tạo/sửa, đổi nghiệp vụ, kéo thả cột.
- **Acceptance:**
  - 9 trang dùng `ServerDataTable`; không còn `DataTable` cũ và bảng tự viết (trừ ma trận quyền).
  - Bảng cao = viewport − topbar − page header ở 1280/1440/1920; 390px không cuộn ngang toàn trang; rail thành chip ngang dưới 1024px.
  - Network: mỗi thao tác tìm/sort/trang/lọc = 1 request `/dt` (debounce tìm 300ms), không request đôi.
  - Rail đếm = `statusStats` server (đúng khi > 100 dòng); footer hiện `recordsFiltered` và `recordsTotal`.
  - Backend: 6 endpoint `/dt` mới có vitest cho mapping cột sort + lọc; `tsc`, build, test xanh cả 2 gói.
  - Ảnh chụp đối chiếu với mẫu cho Xe và Chuyến đi (light/dark).

## Quyết định của người dùng (15/10/2026)

| Quyết định | Chọn |
|---|---|
| Backend | Thêm `/dt` cho NV, Xe, NCC, Giá, Kế hoạch, Kỳ lương theo mẫu trips-dt |
| Mật độ | Một dòng ~32px, zebra cho bảng danh mục; Chuyến đi giữ 2 dòng |
| Rail đếm trạng thái | Mọi bảng có trường `status` (schema: Employee, Vehicle, Supplier, Customer, PricingRow, Trip, PayrollPeriod, TripPlan via `isActive`) |

## Phương án đã so sánh

| # | Hướng | Giả định chính | Thất bại đầu tiên khi |
|---|---|---|---|
| 1 | **Backend `/dt` mọi module + 1 hook + 1 component (chọn)** | Được sửa backend | Backend bị khóa (đã xác nhận: không) |
| 2 | Chỉ web: hook thích ứng 2 giao thức | Không cần số đếm server | > 100 dòng → rail/“lọc từ tổng” sai |
| 3 | Lai: component chung trước, `/dt` sau | Chấp nhận 2 giao thức tạm | Nợ giao thức kéo dài |

## Thiết kế mục tiêu (đầu vào cho plan)

**Backend** — `shared/datatable.ts`: parse `DTParams` (draw/start/length/search[value]/order[0][column]/order[0][dir] + filter tùy module), helper `buildDTResponse`. Mỗi module: `<module>-dt.service.ts` với `SORTABLE_COLUMNS` tường minh (web phải khớp chỉ số), `where` tìm kiếm theo cột văn bản, `groupBy status` → `statusStats`. Route `GET /<module>/dt` cùng `requirePermission` với list hiện tại. Kỳ lương: lọc `year`, `type`; Kế hoạch: `isActive`, `customerId`.

**Web** — `shared/hooks/useServerTable.ts` (giữ, thêm `recordsTotal` vào footer, hỗ trợ `length` thay đổi); `shared/components/ServerDataTable.tsx` thay `DataTable`:
- props: `endpoint`, `columns[{key,label,sortIndex?,width?,align?,render}]`, `filters`, `toolbar` (slot), `actions` (slot), `groupBy?(row)→{key,label}`, `rowKey`, `selectedKey`, `onRowClick`, `density: 'compact'|'comfortable'`, `rail?: { field:'status', labels }`, `emptyTitle`.
- layout: `.workspace` = flex row (rail 228px | card flex-1), card = flex column: `.toolbar` · `.tbl-wrap` flex-1 overflow auto (thead sticky) · `.foot` dính; `.page-fill` cho trang → bảng cao theo viewport.
- CSS mới: `.tbl-zebra`, `.tbl-dense` (td 6px/10px, 13px), `.tbl-group-row` dùng lại, `.workspace`, `.rail` (tái sử dụng `.filter-rail/.rail-stat`), footer "Hiển thị a đến b / n kết quả (lọc từ N)" + `Pagination` thêm Đầu/Cuối.
- Trips: `TripTable` chuyển sang `ServerDataTable` với `groupBy` 2 cấp (ngày → tuyến) hoặc giữ `TripTable` nhưng dùng cùng khung/footer — quyết ở plan.

## Rủi ro

- Chỉ số cột sort web ↔ server lệch (đã từng xảy ra ở Khách hàng) → test vitest cho từng `SORTABLE_COLUMNS` + hằng chia sẻ qua comment.
- Zebra + `is-selected` + hover trong dark mode cần token riêng (`--row-alt`).
- Bảng cao theo viewport làm panel chi tiết inline (480px) cần cùng chiều cao; drawer overlay ở Chuyến đi không ảnh hưởng.

## Quyết định bổ sung (15/10/2026, sau khi xem ảnh dropdown mẫu)

- **Bộ lọc = select ngay trong toolbar**, mỗi select là **dropdown có ô tìm nhanh + danh sách checkbox, chọn nhiều giá trị** (ảnh mẫu: "Tên tuyến" với checkbox HÀ NỘI - PHÚ THỌ…). Áp dụng cho **mọi dropdown trong TMS**: thay `FilterSelect`/`Select` danh sách dài bằng component chung `SearchableMultiSelect`; `SearchableSelect` (chọn một) dùng cùng khung UI nhưng chọn một (form tạo/sửa, trường chỉ nhận một giá trị). Backend `/dt` nhận nhiều giá trị cho một bộ lọc (`status=PLANNED,DISPATCHED` hoặc `status[]=`), rail đếm trạng thái cũng toggle nhiều.
- **Kích thước trang chọn được ở footer: 50 / 100 / 200** (mặc định 100; `/dt` clamp ≤ 500 giữ nguyên).

## Câu hỏi chưa chốt

- Không còn.
