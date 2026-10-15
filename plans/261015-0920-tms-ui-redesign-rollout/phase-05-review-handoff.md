---
phase: 5
title: "Review, tài liệu, bàn giao"
status: completed
priority: P1
effort: "0.5d"
dependencies: [2, 3, 4]
---

# Phase 5: Review, tài liệu, bàn giao

## Overview
Review toàn bộ thay đổi của redesign, chốt danh sách warning lint, cập nhật tài liệu, tạo git baseline và bàn giao cho người dùng.

## Requirements
- Functional: không còn finding P1 sau review; mọi quyết định (giữ/bỏ warning lint, xóa backup) được ghi lại.
- Non-functional: repo có lịch sử git để các thay đổi sau này có thể rollback; tài liệu đủ cho người mới chạy local trong < 15 phút.

## Architecture
Không đổi code ngoài sửa finding review. Git: khởi tạo tại gốc monorepo, `.gitignore` đã có (kiểm tra bao gồm `node_modules`, `dist`, `.env`, `*.xlsx` ở gốc nếu là dữ liệu nội bộ).

## Related Code Files
- Review: `packages/web/src/**` (ưu tiên `shared/**`, `modules/trip/**`, `modules/supplier/SupplierListPage.tsx`, `modules/customer/CustomerListPage.tsx`)
- Modify: `README.md` gốc (hoặc tạo nếu chưa có), `docs/design/ui-design-system.md`, `.gitignore`
- Create: `plans/261015-0920-tms-ui-redesign-rollout/reports/code-review-*.md`, journal entry

## Implementation Steps
1. Chạy `/ak:code-review` trên `packages/web/src` (chế độ codebase scan, tập trung regression, lỗi logic, a11y, hiệu năng render bảng 100 dòng). Sửa P1/P2; ghi P3 vào báo cáo.
2. Quyết định với người dùng về 15+ warning `react/set-state-in-effect` và `exhaustive-deps` tồn tại từ trước: sửa ngay (ước 0.5d) hay để ticket riêng. Mặc định đề xuất: ticket riêng, không chặn bàn giao.
3. Cập nhật `README.md`: cách chạy local (Postgres → `npm run dev:server` → `npm run dev:web`), tài khoản seed, dark mode, `Ctrl K`, liên kết design system và plan này.
4. Kiểm tra `.gitignore`; hỏi người dùng rồi `git init` + commit baseline `feat(web): redesign giao diện theo design system v3` (không ghi tên AI theo rule repo). Nếu người dùng không muốn git, ghi rõ trong báo cáo.
5. Sau khi phase 1 xác nhận không cần rollback: xóa bản sao `src-before-redesign` trong scratchpad (hỏi trước).
6. Viết journal (`/ak:journal`) và đóng plan (`ak plan close`).

## Success Criteria
- [x] Báo cáo code review có 0 finding P1 mở (5 P1 đã sửa; 8 P2/P3 ghi ticket trong reports/cook-261015-1602-phase-05-review-handoff.md).
- [x] README chạy được từ máy sạch theo hướng dẫn. _(README gốc + docs/getting-started.md; chưa thử trên máy sạch thật)_
- [x] Git baseline tồn tại: git init + commit + push lên github.com/dtnam-oss/hungthien (kết quả push ghi ở báo cáo phase).
- [x] Plan đóng, journal ghi xong.

## Risk Assessment
- **Review phát hiện lỗi logic ở trang do subagent viết (ví dụ PUT gửi cả `id/version`)** → tín hiệu: finding P1. Phản ứng: sửa trong phase này nếu ≤ 2h, ngược lại mở phase mới, không bàn giao với P1 mở.
- **File `.xlsx` ở gốc repo chứa dữ liệu khách hàng/xe** → thêm vào `.gitignore` trước commit; hỏi người dùng nếu họ muốn version các file đó.
