---
phase: 1
title: "Xác minh với dữ liệu thật"
status: completed
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Xác minh với dữ liệu thật

## Overview
Chạy backend + web với Postgres thật, duyệt toàn bộ 20 route ở light/dark, 1440px và 390px, ghi nhận và sửa mọi lỗi hiển thị hoặc regression nghiệp vụ do redesign gây ra.

## Requirements
- Functional: mọi luồng CRUD hoạt động như trước redesign (tạo/sửa/xóa, lọc, tìm, phân trang, panel chi tiết, modal).
- Non-functional: không lỗi console, không request lặp vô hạn, trang nặng nhất (Chuyến đi 100 dòng) render < 1s sau khi có dữ liệu.

## Architecture
Không đổi kiến trúc. Dùng `npm run dev:server` (port 3001, cần `DATABASE_URL` trong `packages/server/.env`) và `npm run dev:web` (port 5174, proxy `/api`). Chụp ảnh bằng Chrome headless khi cần đối chiếu (xem memory `ht-tms-local-verification`: headless Chrome có chiều rộng tối thiểu ~500px, 390px phải dùng DevTools device mode thủ công).

## Related Code Files
- Modify (chỉ khi có lỗi): `packages/web/src/index.css`, `packages/web/src/shared/**`, `packages/web/src/modules/**`
- Create: `plans/261015-0920-tms-ui-redesign-rollout/reports/verify-261015-live-walkthrough.md` (bảng lỗi)

## Implementation Steps
1. Bật Postgres (service hoặc Docker), xác nhận `netstat -ano | findstr :5432`; chạy `npm run dev:server`, kiểm tra `GET /api/auth/me` trả 401 (server sống).
2. Chạy `npm run dev:web`; đăng nhập admin; bật dark mode một lần để kiểm tra lưu `localStorage['ht-theme']`.
3. Duyệt theo checklist, mỗi route ở light + dark, 1440 + 390:
   `/`, `/dashboard`, `/trips`, `/trip-plans`, `/driver` (tài khoản tài xế), `/vehicles`, `/customers`, `/suppliers`, `/employees`, `/pricing`, `/pricing-supplier`, `/payroll`, `/roles`, `/assign-roles`, và 6 trang ComingSoon.
4. Ở mỗi trang danh sách: tìm kiếm, lọc, sắp xếp, sang trang, mở panel chi tiết, sửa + lưu, tạo mới qua modal, xóa (trên bản ghi test). Ghi lỗi theo mẫu: route · thao tác · kỳ vọng · thực tế · ảnh.
5. Trang Chuyến đi: rail lọc đổi số đếm đúng khi tìm kiếm; nhóm ngày → tuyến thu/mở; chọn tất cả chỉ áp dụng dòng đang hiển thị; drawer sửa/xóa/chi phí; bộ lọc "cần xử lý".
6. Sửa lỗi tìm được theo nguyên tắc: lỗi token/CSS sửa ở `index.css`; lỗi layout sửa ở trang; không hard-code màu. Sau mỗi nhóm sửa chạy `npx tsc -p tsconfig.app.json --noEmit` và `npx oxlint src`.
7. Chụp lại ảnh các màn chính (trips, vehicle, payroll, login) ở light/dark lưu vào `docs/design/screenshots/` để làm chuẩn đối chiếu về sau.

## Success Criteria
- [x] Bảng lỗi có 0 mục trạng thái "open".
- [x] 20 route không có lỗi console (ngoài 404 của endpoint ComingSoon nếu có).
- [x] CRUD trên 7 module hoạt động, dữ liệu test được dọn (ZZTEST xóa sau backup, phase 5).
- [x] `tsc` 0 lỗi, `oxlint` 0 error, `vite build` xanh.
- [x] Ảnh chuẩn light/dark cho 4 màn chính được lưu trong docs.

## Risk Assessment
- **Postgres không có sẵn / không có dump dữ liệu** → tín hiệu: `:5432` không listen hoặc bảng trống. Phản ứng: dùng `npm run seed` của server; nếu seed thiếu dữ liệu chuyến, tạo tay 10–20 chuyến qua UI. Nếu vẫn không có DB, dừng phase và hỏi người dùng, không giả lập.
- **Lỗi phát hiện quá nhiều ở một trang (ví dụ Supplier từng gọi sai `/api/api`)** → nếu > 10 lỗi cùng trang, mở phase con hoặc giao subagent cho trang đó thay vì sửa lẻ tẻ.
- **Tooling chụp mobile không tin cậy** → dùng DevTools device toolbar thủ công, không dựa vào headless.
