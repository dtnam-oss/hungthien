---
title: "Hoàn thiện & bàn giao redesign giao diện HT-TMS"
description: "Đưa design system v3 (đã code, tsc/build xanh) từ 'xác minh tĩnh' sang 'xác minh với dữ liệu thật, dọn dẹp, hoàn thiện Chuyến đi, responsive/a11y, review, bàn giao'."
status: completed
priority: P1
effort: "4-5d"
tags: [frontend, design-system, ui-redesign, tms]
created: 2026-10-15
blockedBy: []
blocks: []
---

# Hoàn thiện & bàn giao redesign giao diện HT-TMS

## Overview

Redesign đã được triển khai trong phiên 14–15/10/2026: design system v3 (`packages/web/src/index.css`, `shared/ui/`), app shell mới, 14 trang module chuyển sang token, trang Chuyến đi theo layout NAK (rail lọc · bảng dày 2 cấp · drawer), dark mode. Trạng thái hiện tại: `tsc` 0 lỗi, `vite build` xanh, 0 màu Tailwind cứng; **chưa** duyệt bằng dữ liệu thật vì Postgres không chạy.

Kế hoạch này gồm phần còn lại để đưa redesign vào sử dụng. Quyết định thiết kế đã chốt: [brainstorm 15/10](../reports/brainstorm-261015-0854-tms-ui-redesign-nak-layout.md). Quy ước: [docs/design/ui-design-system.md](../../docs/design/ui-design-system.md).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Mọi trang chạy đúng với dữ liệu thật ở light/dark, 1440 & 390px, không regression nghiệp vụ | P1 |
| 2 | Codebase sạch: không còn trang chết, status map tập trung, docs khớp code | P2 |
| 3 | Trang Chuyến đi: nút hành động dùng endpoint có sẵn, không còn nút giả | P1 |
| 4 | Đạt chuẩn responsive + a11y cơ bản (bàn phím, aria, tương phản) | P2 |
| 5 | Review xong, có git baseline, bàn giao rõ ràng | P1 |

## Phases

| # | Phase | Status | Effort | Depends |
|---|-------|--------|--------|---------|
| 1 | [Xác minh với dữ liệu thật](./phase-01-live-verification.md) | Completed | 1d | — |
| 2 | [Dọn dẹp & nhất quán](./phase-02-cleanup-consistency.md) | Completed | 0.5d | — |
| 3 | [Hoàn thiện workspace Chuyến đi](./phase-03-trips-workspace.md) | Completed | 1d | 1 |
| 4 | [Responsive & accessibility](./phase-04-responsive-a11y.md) | Completed | 1d | 1 |
| 5 | [Review, tài liệu, bàn giao](./phase-05-review-handoff.md) | Completed | 0.5d | 2, 3, 4 |

Phase 1 và 2 chạy song song được (file khác nhau). Phase 3 và 4 cần kết quả phase 1 (danh sách lỗi thật).

## Constraints

- Không đổi backend contract; chỉ dùng endpoint đã có (`PATCH /trips/:id/status`, `PUT /trips/:id`, `/trips/:id/costs`).
- Không thêm tính năng của NAK không có trong HT-TMS (VETC, OCR, Google Maps, chấm công).
- Giữ brand đỏ, bảng dày, rail lọc, dark mode theo quyết định đã chốt.
- Thư mục chưa có git; mọi thay đổi phá hủy phải hỏi trước. Bản sao `src` trước redesign nằm ở scratchpad phiên 14/10.

## Success Criteria

- [ ] 20 route trong `App.tsx` duyệt thủ công với DB thật, không lỗi console, không regression CRUD (tạo/sửa/xóa ở Nhân viên, KH, Xe, NCC, Bảng giá, Kế hoạch, Chuyến).
- [ ] `tsc`, `oxlint` (0 error), `vite build` xanh sau mọi phase.
- [ ] Không còn file không được route; `STATUS_TONES` là nơi duy nhất map trạng thái → màu.
- [ ] Trang Chuyến đi: nút hành động theo trạng thái gọi API thật; nút chưa có endpoint bị ẩn.
- [ ] 390px: không cuộn ngang toàn trang; modal/drawer dùng được bằng bàn phím; pill đạt tương phản AA ở cả hai theme.
- [ ] Code review không còn finding P1; docs cập nhật; git baseline commit (nếu người dùng đồng ý).

## Open Questions

- Nhóm cấp 2 ở bảng Chuyến đi đang dùng `Route.name`. Có cần "nhóm tuyến" (route group) như NAK không? Nếu có, backend cần thêm trường.
- Bộ lọc "Đơn vị: Nội bộ / NCC" của NAK chưa có ở chuyến (xe có `ownerType`). Có muốn lọc chuyến theo loại xe không?
- "Xuất Excel": chấp nhận xuất CSV client-side từ trang hiện tại, hay cần endpoint server xuất toàn bộ?

<!-- slug: tms-ui-redesign-rollout -->
