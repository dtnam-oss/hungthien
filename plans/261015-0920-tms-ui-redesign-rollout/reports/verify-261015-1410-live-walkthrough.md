# Phase 1 — Xác minh với dữ liệu thật · báo cáo

Ngày: 2026-10-15 · Plan: `plans/261015-0920-tms-ui-redesign-rollout/` · Phase: `phase-01-live-verification.md`

## Môi trường

- Postgres: Docker container `ht-tms-postgres` (postgres:16-alpine), phải bật Docker Desktop rồi `docker start`. DB `ht_tms` có dữ liệu thật (67 xe, 46 KH, 5 NV, 2 chuyến, 2 kế hoạch, 0 kỳ lương).
- Backend `npm run dev:server` :3001 · Web Vite :5174.
- Cách chụp: đăng nhập qua API lấy token → trang trampoline tạm `ui-auth.html` nạp token + theme vào localStorage rồi chuyển route → Chrome headless 1440×900, `--enable-logging=stderr` để bắt console. Trang `ui-inspect.html` (iframe + `getComputedStyle`) dùng để truy nguyên lỗi màu. Cả hai file tạm đã xóa.

## Kết quả duyệt

| Route | Light | Dark | Console | Ghi chú |
|---|---|---|---|---|
| `/` Launchpad | OK | — | 0 | |
| `/dashboard` | OK | — | 0 | 0 chuyến trong kỳ (chuyến mẫu ngày 06/09) |
| `/trips` | OK sau sửa | OK | 0 | Lỗi #1 |
| `/trip-plans` | OK | — | 0 | |
| `/vehicles` | OK | OK | 0 | 67 xe, phân trang 100 |
| `/customers` | OK | — | 0 | Lỗi #2 (sort) |
| `/suppliers` | OK | — | 0 | Trước redesign gọi `/api/api/...` — đã sửa ở phase rewrite |
| `/employees` | OK | — | 0 | |
| `/pricing`, `/pricing-supplier` | OK | — | 0 | Lỗi #3 |
| `/payroll` | OK | — | 0 | Không có kỳ lương → empty state |
| `/roles`, `/assign-roles` | OK | — | 0 | |
| 6 trang ComingSoon (`/fuel`…) | OK | — | 0 | Cùng component |
| `/driver` | chưa | — | — | Cần tài khoản tài xế (user `driver` có, chưa đăng nhập) |

## Lỗi tìm được và cách sửa

| # | Mức | Mô tả | Nguyên nhân | Sửa |
|---|---|---|---|---|
| 1 | **Cao** | Chữ trong nút primary, ô lọc active, seg-tab… nhận màu kế thừa (chữ đen trên nền đỏ/đen) ở **mọi trang** | Rule gốc `button, input, select, textarea { color: inherit }` đặt ngoài `@layer` nên thắng mọi rule màu trong `@layer components` | Bỏ `color: inherit` khỏi rule đó (preflight Tailwind đã có trong layer base). Computed color `.btn-primary` #18181B → #FFFFFF |
| 2 | Trung | Sắp xếp cột ở Khách hàng lệch: bấm "Tên" sắp theo MST, "SĐT"/"Trạng thái" rơi về name | Web gửi index cột hiển thị (có cột `#`, địa chỉ, người LH); server `SORTABLE_COLUMNS` = code,name,taxCode,email,phone,status | Thêm `sortIndex` cho từng cột, `SERVER_COLUMNS` 6 phần tử đúng thứ tự server |
| 3 | Thấp | Cột "Loại" ở Bảng giá xuống 2 dòng | thiếu nowrap | `w-28 whitespace-nowrap` |
| 4 | Trung (có sẵn, reviewer phát hiện) | Bấm lại header đang sắp xếp không đổi asc/desc trên dev server | `setSort` gọi `setOrderDir` trong updater của `setOrderCol`; StrictMode chạy updater 2 lần | Tính hướng mới ngoài updater (`useServerTable.ts`) |
| 5 | Thấp (phòng ngừa) | Rule phần tử `h1-h4`, `p`, `button` nằm ngoài layer nên utility `mb-2`… không ghi đè được | — | Bọc vào `@layer base` |

Tester API (subagent): 24 endpoint web gọi đều trả 200 đúng shape; CRUD tạo→đọc→sửa→xóa qua API thành công cho NV, xe, NCC, KH, bảng giá, kế hoạch. Phát hiện thêm (ngoài web, ghi lại cho backend): `DELETE /vehicles/:id` có kế hoạch tham chiếu trả 500 thay vì 409; `PATCH /trips/:id/status` không kiểm tra quyền và transition; `/employees?pageSize=200` bị clamp 100 (dropdown tài xế sẽ thiếu khi > 100 NV).

## Kiểm tra sau sửa

- `tsc` 0 lỗi · `oxlint` 0 error · `vite build` OK.
- Ảnh chuẩn lưu tại `docs/design/screenshots/` (login, home, trips light/dark, vehicles light/dark).

## Chưa làm / hạn chế

- Chưa bấm thử modal tạo/sửa trên UI (headless CLI không click được); CRUD mới kiểm qua API. Đề xuất người dùng thử nhanh 1 modal trên trình duyệt thật.
- 390px chưa kiểm (headless tối thiểu ~500px) → phase 4.
- `/driver` chưa duyệt.

## Dữ liệu test còn sót

- Nhân viên `ZZTEST-1792048074` (id 6) trạng thái INACTIVE do API chỉ soft-delete. Cần người dùng quyết: xóa bằng SQL (sau khi backup) hay giữ.

## Câu hỏi chưa chốt

- Có xóa bản ghi nhân viên test ở trên bằng SQL không?
- Có cần tạo kỳ lương mẫu để duyệt 4 tab còn lại của Bảng lương không?
