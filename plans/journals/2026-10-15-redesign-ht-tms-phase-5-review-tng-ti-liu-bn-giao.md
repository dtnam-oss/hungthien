---
title: "Redesign HT-TMS: phase 5 review tổng, tài liệu, bàn giao"
date: 2026-10-15
summary: "Code review toàn bộ web: sửa 5 P1 + 7 P2, ticket phần còn lại; README gốc, .gitignore, backup DB + dọn dữ liệu test; server test 41/41; chuẩn bị git baseline + push"
---

# Redesign HT-TMS: phase 5 review tổng, tài liệu, bàn giao

## What happened
- Review codebase scan tìm 5 P1 thật: lưu ma trận quyền xóa quyền payroll; 401 đăng nhập sai bị reload; cổng tài xế trắng trang (route lồng); giá NCC lưu nhầm customerId; chi lương không confirm. Đã sửa cả 5.
- 7 P2 sửa (reset trang khi đổi filter, request đôi khi tải, auto-fill tài xế sai shape, catch rỗng, canDelete, isDriver param, confirm xóa chi phí + select trạng thái theo transition). 8 P2/P3 + 27 warning lint + 32 lỗi type backend → ticket.
- Tách `tests/**` khỏi build server (rootDir) → lộ 32 lỗi type có sẵn (28 là `userId` undefined vs null ở audit log).
- README gốc, .gitignore (xlsx/lnk/backups), backup `backups/ht_tms-20261015.sql`, xóa nhân viên test, xóa backup scratchpad.

## Decision
- Chặn tạo giá NCC thay vì sửa server (schema chưa có cột supplier).
- Lint warnings và lỗi type backend để ticket riêng (người dùng chọn).

## Next steps
- Push lên github.com/dtnam-oss/hungthien (cần auth trên máy).
- Deploy: web Vercel cần `vercel.json` rewrite `/api`; backend nên Railway/Render với DATABASE_URL + JWT_SECRET.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
