---
title: "Bảng dữ liệu server-side thống nhất theo mẫu NAK"
description: "Một ServerDataTable chung cho 9 trang danh sách (rail đếm trạng thái, toolbar chuẩn, bảng cao theo viewport, phân trang 50/100/200 có Đầu/Cuối), backend /dt DataTables cho mọi module, dropdown tìm nhanh chọn nhiều cho toàn bộ TMS."
status: completed
priority: P1
effort: "6-7d"
tags: [frontend, backend, datatable, design-system, tms]
created: 2026-10-15
blockedBy: []
blocks: []
---

# Bảng dữ liệu server-side thống nhất theo mẫu NAK

## Overview

Hợp đồng đã chốt: [brainstorm-261015-1707-server-datatable-layout.md](../reports/brainstorm-261015-1707-server-datatable-layout.md). Hiện web có 4 cơ chế bảng (DataTable REST, `useServerTable` + markup tự viết, Kế hoạch tự fetch, Bảng lương tự fetch); backend chỉ có `/trips/dt` (kèm `statusStats`) và `/customers/dt`. Mục tiêu: một giao thức DataTables server-side cho mọi module, một component bảng, một component dropdown.

Quyết định người dùng: thêm `/dt` theo mẫu `trips-dt.service.ts`; dòng một hàng ~32px zebra cho bảng danh mục (Chuyến đi giữ 2 dòng); rail đếm trạng thái ở mọi bảng có `status`; bộ lọc là select trong toolbar dạng **dropdown tìm nhanh + checkbox chọn nhiều**, áp dụng cho mọi dropdown trong TMS; footer chọn 50/100/200 dòng.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Một giao thức: `GET /<module>/dt` cho 8 module, cùng tham số, cùng response (`recordsTotal`, `recordsFiltered`, `statusStats`), lọc nhiều giá trị | P1 |
| 2 | Một component `ServerDataTable` + hook, layout theo mẫu, bảng cao theo viewport, co giãn 390→1920px | P1 |
| 3 | 9 trang danh sách chuyển sang component chung; xóa `DataTable` cũ và bảng tự viết | P1 |
| 4 | Một dropdown chung tìm nhanh + chọn nhiều (lọc) / chọn một (form) thay cho `Select`, `FilterSelect`, `SearchableSelect` | P1 |
| 5 | Xác minh network/responsive/ảnh đối chiếu, review, docs, commit | P1 |

## Phases

| # | Phase | Status | Effort | Depends |
|---|-------|--------|--------|---------|
| 1 | [Backend: giao thức /dt cho mọi module](./phase-01-backend-dt-endpoints.md) | Completed | 1.5d | — |
| 2 | [Web nền: ServerDataTable, hook, MultiSelect, CSS](./phase-02-web-foundation.md) | Completed | 1.5d | — (song song với 1, theo contract ở phase 1) |
| 3 | [Chuyển trang danh mục: NV, Xe, NCC, Giá, KH](./phase-03-migrate-catalog-pages.md) | Completed | 1.5d | 1, 2 |
| 4 | [Chuyển Chuyến đi, Kế hoạch, Kỳ lương; xóa cơ chế cũ](./phase-04-migrate-trips-plans-payroll.md) | Completed | 1d | 3 |
| 5 | [Dropdown chung cho form/modal còn lại](./phase-05-dropdowns-everywhere.md) | Completed | 0.5d | 2 |
| 6 | [Xác minh, review, docs, bàn giao](./phase-06-verify-handoff.md) | Completed | 0.5d | 4, 5 |

Phase 1 và 2 làm song song (file khác gói); phase 5 có thể chạy song song với 3–4 (file form/modal khác file trang danh sách).

## Constraints

- Giữ design system v3 (`index.css` token, `.tbl`, dark mode) và panel chi tiết/drawer, quyền, nhóm 2 cấp Chuyến đi.
- Backend: `/dt` thêm mới, **không bỏ** REST `GET /` (dropdown/modal còn dùng). `requirePermission` giống route list. `length` clamp ≤ 500.
- Chỉ số cột sort web ↔ server phải tường minh và có test.
- Không thêm tính năng ngoài hợp đồng (ẩn/hiện cột, lưu bộ lọc, export toàn bộ).
- Repo đã có git (`main`, remote GitHub); mỗi phase một commit conventional, không ghi tên AI.

## Success Criteria

- [x] 8 endpoint `/dt` (trips, customers, employees, vehicles, suppliers, pricing, trip-plans, payroll/periods) cùng giao thức, vitest cho sort-index + lọc nhiều giá trị, `tsc`/build/test server xanh.
- [x] 9 trang dùng `ServerDataTable`; `DataTable.tsx` cũ và bảng tự viết đã xóa (trừ ma trận quyền).
- [x] Bảng cao = viewport − topbar − header trang ở 1280/1440/1920; 390px không cuộn ngang toàn trang; rail thành chip ngang < 1024px.
- [x] Mỗi thao tác tìm/sort/trang/lọc = 1 request `/dt` (kiểm bằng network), không request đôi.
- [x] Rail đếm theo `statusStats` server; footer "Hiển thị a đến b / n kết quả (lọc từ N)" + 50/100/200 + Đầu ‹ 1 2 … › Cuối.
- [x] Mọi dropdown trong TMS dùng component chung (tìm nhanh + checkbox chọn nhiều cho lọc; chọn một cho form).
- [x] `tsc`, `oxlint` 0 error, `vite build` xanh; ảnh đối chiếu Xe và Chuyến đi (light/dark) lưu `docs/design/screenshots/`.

## Open Questions

- Không còn (hai câu hỏi brainstorm đã được trả lời ngày 15/10/2026).

<!-- slug: server-datatable-layout -->
