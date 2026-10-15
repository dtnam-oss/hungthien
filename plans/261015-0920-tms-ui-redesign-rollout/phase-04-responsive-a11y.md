---
phase: 4
title: "Responsive & accessibility"
status: completed
priority: P2
effort: "1d"
dependencies: [1]
---

# Phase 4: Responsive & accessibility

## Overview
Đảm bảo mọi trang dùng được ở 390px và bằng bàn phím, pill/nút đạt tương phản AA ở cả hai theme, giảm chuyển động khi người dùng yêu cầu.

## Requirements
- Functional: ở ≤ 1023px panel chi tiết thành drawer overlay toàn màn, sidebar thành menu trượt, rail lọc Chuyến đi xếp ngang/cuộn; bảng rộng cuộn ngang bên trong card, trang không cuộn ngang.
- Non-functional: WCAG 2.1 AA cho chữ trong pill/alert/nút (≥ 4.5:1); focus-visible rõ; `Esc` đóng modal/drawer; tab order hợp lý; `prefers-reduced-motion` tắt animation (đã có rule, cần kiểm tra).

## Architecture
Chủ yếu CSS trong `index.css` (media query, token tương phản) và một số thuộc tính aria/focus trong component dùng chung (`ModalOverlay`, `DetailPanel`, `SearchableSelect`, `QuickNav`, `Sidebar`). Không đổi cấu trúc trang.

## Related Code Files
- Modify: `packages/web/src/index.css` (tone dark cho `--*-text` nếu không đạt AA; `.filter-rail` mobile; `.page` padding; `.tbl-wrap`)
- Modify: `packages/web/src/shared/components/ModalOverlay.tsx` (focus trap + trả focus về nút mở), `DetailPanel.tsx` (focus vào nút đóng khi mở; `aria-labelledby`), `SearchableSelect.tsx` (aria-activedescendant), `QuickNav.tsx`, `Sidebar.tsx` (tooltip collapsed có `aria-label` — đã có), `Layout.tsx` (bottom nav `aria-current`)
- Modify (nếu lỗi): `modules/trip/components/TripFilterRail.tsx`, `TripTable.tsx`, các trang có `aside` 480px (ẩn dưới lg — đã có `isLg`)

## Implementation Steps
1. Đo tương phản tất cả cặp `--*-bg`/`--*-text` ở light và dark (script nhỏ hoặc công cụ WebAIM); sửa token chưa đạt, ghi bảng kết quả vào báo cáo phase.
2. Duyệt 390px (DevTools device mode) các trang phase 1 đã liệt kê; sửa tràn ngang: thường là `min-w-[1080px]` của bảng phải nằm trong `.tbl-wrap` có `overflow:auto`, toolbar `flex-wrap`, `page-actions` wrap.
3. Rail lọc Chuyến đi ở mobile: `.rail-stats` thành hàng ngang cuộn; xác nhận select 100% rộng.
4. Bàn phím: Tab qua topbar → sidebar → trang; `Ctrl K` mở tìm nhanh, mũi tên/Enter chọn; modal giữ focus bên trong và trả focus khi đóng; drawer `Esc` đóng; bảng `tbl-click` có dòng là `<tr onClick>` → thêm nút "Mở" ẩn-trực-quan hoặc `tabIndex=0` + Enter để mở bằng bàn phím.
5. Kiểm tra `prefers-reduced-motion`: bật trong DevTools, xác nhận không còn slide/scale.
6. Kiểm tra màn hình đọc cơ bản (NVDA hoặc Narrator) trên trang Chuyến đi và một modal: tiêu đề, tab, trạng thái pill đọc được.

## Success Criteria
- [x] 0 trang cuộn ngang ở 390px (13 route, light + dark, đo qua iframe).
- [x] Bảng tương phản: 27 cặp token × 2 theme, 0 fail (script contrast-check).
- [x] Modal/drawer: focus trap, Esc, trả focus; bảng mở được bằng bàn phím. _(xác minh bằng code review 2 vòng; chưa bấm tay trên trình duyệt)_
- [x] `tsc`, `oxlint`, `vite build` xanh.

## Risk Assessment
- **Màu tone dark hiện tại (ví dụ `--warn-text #FDB022` trên `#2E2210`) không đạt AA** → tín hiệu: bước 1. Phản ứng: tăng độ sáng chữ hoặc tối nền; không đổi màu light đã khớp spec.
- **Focus trap làm hỏng `SearchableSelect` trong modal** → test trực tiếp modal Tạo chuyến; nếu xung đột, trap theo `dialog` root và cho phép portal con.
