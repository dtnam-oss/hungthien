---
title: Brainstorm — Redesign giao diện HT-TMS theo layout mẫu NAK TMS
date: 2026-10-15
status: accepted
related:
  - docs/design/ui-design-system.md
  - docs/design/ht-tms-trips-handoff/DESIGN_SPEC.md
  - plans/reports/ui-redesign-261014-1728-*.md
---

## Tóm tắt

Mẫu tham chiếu: app.nakvn.com/trips (ảnh chụp 14/10/2026). Nav HT-TMS đã cùng cấu trúc với mẫu. Khác biệt chính: mẫu dùng workspace 3 cột (rail lọc trái · bảng dày · panel chi tiết), header bảng navy, nhóm 2 cấp, KV ngang, dark mode, brand xanh.

## Hợp đồng

- **Outcome:** Toàn bộ HT-TMS dùng một hệ giao diện hiện đại, thống nhất, mượn kiến trúc thông tin của NAK TMS để nhân viên vận hành logistics quen tay và quét dữ liệu nhanh.
- **Constraints:** Giữ API, nghiệp vụ, phân quyền. React 19 + Tailwind v4. Xuất phát từ design system v3 (`index.css` + `shared/ui`) đã dựng, không làm lại.
- **Non-goals:** Không thêm tính năng của mẫu (VETC, OCR tem, Google Maps, chấm công, khu vực). Không đổi backend.
- **Acceptance:** Mọi trang dùng token, không còn màu Tailwind cứng; `tsc` 0 lỗi; `vite build` chạy; trang Chuyến đi có rail lọc, bảng nhóm 2 cấp có số thứ tự, panel chi tiết KV ngang; dark mode bật/tắt được trên topbar; 390px không cuộn ngang toàn trang.

## Phương án đã so sánh

| # | Hướng | Ưu | Nhược / thất bại đầu tiên khi |
|---|---|---|---|
| 1 | Giữ spec cũ, chỉ mượn chi tiết | Rẻ nhất, khớp handoff | Mục tiêu thật là "nhìn giống NAK" |
| 2 | Bám sát mẫu (xanh, navy, dark mode) | Quen nhất với người đã dùng NAK | Ngược spec handoff; dark mode tăng khối lượng |
| 3 | **Lai (chọn)** — giữ token v3, lấy kiến trúc thông tin của mẫu | Rẻ, đổi brand chỉ là 1 biến | Giả định nhân viên ưu tiên mật độ; sửa bằng token nếu sai |

## Quyết định của người dùng (15/10/2026)

| Quyết định | Chọn |
|---|---|
| Brand | Giữ đỏ `--accent #D92D20` |
| Bộ lọc trạng thái Chuyến đi | Rail dọc bên trái (đếm theo trạng thái + KH + nhà xe + tài xế) |
| Mật độ bảng | Dày như mẫu: header navy, 100 dòng/trang, cột số thứ tự |
| Dark mode | Làm luôn (token `[data-theme=dark]`, nút trên topbar, nhớ localStorage, theo OS khi chưa chọn) |

## Tác động triển khai

- CSS: `--thead-*`, `--inverse-*`, `--backdrop`; bộ token dark; `.tbl` dày; `.kv` ngang; `.filter-rail`/`.rail-stat`; `.tbl-subgroup-row`; `.row-num`.
- UI: `Pagination` (số trang có …), `ThemeToggle`, `shared/theme.ts`; `DataTable` thêm cột # và pageSize 100.
- Trips: `TripFilterRail`, `TripTable` nhóm ngày → tuyến, `TripListPage` bố cục rail + card.

## Câu hỏi chưa chốt

- Nhóm cấp 2 dùng `Route.name`; nếu nghiệp vụ muốn nhóm theo "nhóm tuyến" (route group) như NAK thì backend cần thêm trường.
- "Đơn vị: Tất cả / Nội bộ / NCC" của mẫu chưa có trong HT-TMS (xe có `ownerType`, chuyến thì chưa) — chưa làm.
