# Phase 4 — Responsive & accessibility · báo cáo thực thi

Ngày: 2026-10-15 · Plan: `plans/261015-0920-tms-ui-redesign-rollout/` · Phase: `phase-04-responsive-a11y.md`

## Đo đạc

| Hạng mục | Cách đo | Kết quả |
|---|---|---|
| Tương phản token (27 cặp × 2 theme) | script `contrast-check.cjs` (WCAG luminance) trên `index.css` | 3 FAIL ban đầu → 0 FAIL sau sửa |
| Cuộn ngang 390px (13 route, light + dark) | trang tạm `ui-mobile.html` nạp app trong iframe 390px, đo `scrollWidth` + liệt kê phần tử vượt 391px | `scrollW = clientW = 390` ở mọi route; phần tử "vượt" đều nằm trong vùng cuộn hợp lệ (`.tbl-wrap`, `.seg`) |
| Reduced motion | rule `@media (prefers-reduced-motion: reduce)` trong CSS compiled | có |
| Màn hình đọc (NVDA/Narrator) | — | **chưa làm** (cần thao tác tay) |

## Thay đổi

| Nhóm | Chi tiết |
|---|---|
| Token | `--placeholder` light `#8A8B93` (3.4:1), dark `#7E7E88` (4.4:1); dark `--accent` `#D9362B` để chữ trắng trên nút đạt 4.5:1; `.req`, `.icon-btn-brand` dùng `--accent-strong`. |
| Modal (`ModalOverlay`) | Focus control đầu tiên khi mở; Tab/Shift+Tab quay vòng; Esc xử lý trên chính dialog với `stopPropagation` nên drawer/panel bên dưới không bị đóng theo; fallback cấp document khi focus lạc ra ngoài; trả focus về phần tử đã mở; `aria-labelledby`; effect chỉ chạy theo `isOpen` (ref cho `onClose`) để không cướp focus khi gõ. |
| Panel chi tiết (`DetailPanel`) | `isLg` khởi tạo đồng bộ từ `matchMedia` (hết nháy overlay + mất focus trên desktop); focus nút đóng khi mở; overlay `role="dialog"` + inline `role="region"` đều có `aria-labelledby`. |
| Bảng | Hàng bấm được có `tabIndex=0`, Enter mở (chỉ khi focus ở chính hàng, tránh double-fire từ nút/checkbox con), `aria-selected` trên hàng đang mở (DataTable, bảng Chuyến đi, bảng Khách hàng). Nút tuyến trong hàng chuyến `tabIndex=-1` để không nhân đôi tab order. |
| SearchableSelect | Ô tìm có `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; option có id; nút bỏ chọn ra ngoài `listbox`; Esc chỉ đóng dropdown. |

## Kiểm tra

- `tsc` 0 lỗi · `oxlint` 0 error · `vite build` OK.
- Code review vòng 1: 2 High (Esc lan xuống drawer; Esc của select đóng cả modal), 2 Medium, 4 Low → sửa toàn bộ. Vòng 2: 7/8 RESOLVED + 1 PARTIAL (dialog chưa `tabIndex=-1`) → sửa.
- Tester độc lập (dark 390px, tương phản, reduced-motion, ARIA): PASS; thêm 3 điểm → sửa: Shift+Tab khi focus ở chính dialog, Esc khi focus ngoài dialog (fallback chuyển sang capture + `stopPropagation`), drawer chuyến đi focus nút đóng khi mở và trả focus khi đóng (`Button`/`IconButton` nhận `ref` theo React 19).
- Phần tử `/trips` tester cờ "right=1085" là nút header nhóm nằm trong `<td>` của `.tbl-wrap` → vùng cuộn hợp lệ.

## Chưa làm / hạn chế

- Chưa kiểm bằng màn hình đọc thật; chưa bấm thử bằng bàn phím trên trình duyệt thật (headless không mô phỏng được). Đề nghị người dùng thử: Tab qua modal Tạo chuyến, Esc khi dropdown đang mở, Enter trên hàng bảng.
- `.seg` tab Bảng lương ở 390px cuộn ngang trong chính nó (chấp nhận được).

## Câu hỏi chưa chốt

- Có cần hỗ trợ 320px (iPhone SE) không? Hiện chỉ kiểm 390px.
