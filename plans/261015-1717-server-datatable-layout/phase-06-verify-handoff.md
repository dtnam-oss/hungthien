---
phase: 6
title: "Xác minh, review, docs, bàn giao"
status: pending
priority: P1
effort: "0.5d"
dependencies: [4, 5]
---

# Phase 6: Xác minh, review, docs, bàn giao

## Overview
Chứng minh toàn bộ tiêu chí nghiệm thu của plan bằng đo đạc (network, viewport, tương phản, ảnh đối chiếu), review code, cập nhật docs, commit và bàn giao.

## Requirements
- Functional: 9 trang dùng `ServerDataTable`; 8 endpoint `/dt`; dropdown chung ở mọi nơi.
- Non-functional: không request đôi; bảng cao theo viewport ở 1280/1440/1920; 390px không cuộn ngang; tương phản zebra/row-alt đạt AA ở 2 theme; `tsc`/lint/build/test xanh cả 2 gói.

## Architecture
Không đổi code ngoài sửa finding review. Dùng lại bộ công cụ đã có: trang trampoline/iframe tạm để chụp headless, `contrast-check.cjs`, tester API, code-reviewer.

## Related Code Files
- Modify (nếu review ra lỗi): file trong phase 1–5
- Modify: `docs/design/ui-design-system.md` (mục Bảng dữ liệu, Dropdown, Rail), `docs/getting-started.md` (giao thức `/dt`), `README.md` (một dòng)
- Create: `plans/261015-1717-server-datatable-layout/reports/verify-*.md`, ảnh `docs/design/screenshots/{vehicles,trips}-{light,dark}.png` (ghi đè bản cũ)

## Implementation Steps
1. Network: với DB thật, mỗi trang thực hiện tìm/sort/trang/đổi kích thước trang/lọc multi → ghi số request `/dt` (kỳ vọng 1); tester subagent gọi 8 endpoint với `status=A,B` và `length=200`.
2. Viewport: chụp 1280/1440/1920 cho Xe và Chuyến đi; 390/768 qua iframe; dark mode cho Xe.
3. Tương phản: chạy script trên token mới (`--row-alt`, chip rail, multi-select).
4. Code review (codebase scan phase 1–5): sort-index, lọc nhiều giá trị, quyền `/dt`, hiệu năng groupBy, a11y dropdown/bảng; sửa P1/P2.
5. Docs + README; commit `docs: bảng dữ liệu server-side và dropdown chung`; push.
6. Journal; `ak plan close`.

## Success Criteria
- [ ] Bảng network: 9 trang × 5 thao tác = 1 request mỗi ô.
- [ ] Ảnh đối chiếu Xe/Chuyến đi (light/dark) lưu docs; bảng cao theo viewport ở 3 độ rộng; 390px không cuộn ngang.
- [ ] Review: 0 P1 mở; tương phản 0 fail.
- [ ] `tsc`, `oxlint`, build, vitest xanh cả 2 gói; commit đã push.

## Risk Assessment
- **DB mẫu ít dòng (2 chuyến) không kiểm được "lọc từ tổng"/phân trang 200** → tester tạo 250 chuyến test qua API rồi xóa (hoặc dùng bảng Xe 67 dòng + Khách hàng 46 với `length=50`).
- **Headless không click được dropdown** → kiểm tay 3 dropdown trên trình duyệt thật; ghi rõ trong báo cáo phần chưa tự động hóa.
