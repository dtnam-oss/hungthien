---
title: "Redesign HT-TMS: phase 1 xác minh với dữ liệu thật"
date: 2026-10-15
summary: "Duyệt 14 route với DB thật (Docker ht-tms-postgres), 0 lỗi console; sửa lỗi màu chữ toàn hệ thống do rule ngoài @layer, sort Khách hàng lệch cột, sort toggle dưới StrictMode"
---

# Redesign HT-TMS: phase 1 xác minh với dữ liệu thật

## What happened
- Postgres chỉ có trong Docker (`ht-tms-postgres`, postgres:16-alpine); phải bật Docker Desktop rồi `docker start`. Backend :3001, web :5174.
- Chụp 14 route bằng Chrome headless qua trang trampoline tạm nạp token vào localStorage; console 0 lỗi; light + dark.
- Tester API: 24 endpoint web gọi đều đúng shape; CRUD qua API cho 6 module OK.
- Lỗi lớn tìm được: rule `button, input, select, textarea { color: inherit }` đặt ngoài `@layer` thắng mọi rule màu trong `@layer components` → chữ nút primary/ô lọc active bị tối. Phát hiện nhờ `getComputedStyle` trong iframe (dump-dom), không nhìn ra ở ảnh thu nhỏ.
- Lỗi khác: sort cột Khách hàng lệch index server (thêm `sortIndex`), cột "Loại" bảng giá xuống dòng; reviewer tìm thêm `setSort` gọi setState lồng trong updater (StrictMode chạy 2 lần → không đổi hướng).

## Decision
- Mọi rule phần tử (`button`, `h1-h4`, `p`) chuyển vào `@layer base`; chỉ `*:focus-visible` và token ở ngoài layer.
- Phase 1 đánh dấu completed; 1 tiêu chí (dọn dữ liệu test) chờ người dùng: nhân viên `ZZTEST-1792048074` INACTIVE, API chỉ soft-delete.

## Next steps
- Phase 3: nối `PATCH /trips/:id/status` (backend chưa kiểm quyền/transition — ghi cho backend).
- Phase 4: 390px + a11y; `/driver` chưa duyệt.
- Backend: `DELETE /vehicles/:id` có tham chiếu trả 500 thay vì 409; `pageSize` clamp 100 làm dropdown tài xế thiếu khi > 100 NV.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
