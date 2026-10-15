---
title: "Redesign HT-TMS: phase 4 responsive & a11y"
date: 2026-10-15
summary: "0 trang cuộn ngang ở 390px (light+dark), 27 cặp token đạt AA, focus trap/Esc/trả focus cho modal-drawer, hàng bảng mở bằng Enter, ARIA combobox; review 2 vòng + tester"
---

# Redesign HT-TMS: phase 4 responsive & a11y

## What happened
- Đo tương phản bằng script Node trên token `index.css`: 3 fail (placeholder 2 theme, chữ trắng trên accent dark 3.76) → đổi token, 0 fail.
- Headless Chrome không cho cửa sổ < ~500px → trang tạm nạp app trong iframe 390px và đo `scrollWidth`; 13 route × 2 theme đều 390/390.
- ModalOverlay: focus trap, Esc/Tab xử lý trên dialog (React stopPropagation chặn listener `document` của drawer), fallback capture khi focus lạc ra ngoài, `tabIndex=-1`, effect chỉ theo `isOpen` (ref onClose) để không cướp focus khi gõ.
- DetailPanel: `isLg` khởi tạo đồng bộ (hết nháy overlay/mất focus), focus nút đóng, aria-labelledby cả 3 chế độ. TripDetailDrawer: focus/trả focus.
- Hàng bảng `tabIndex=0` + Enter (guard `target === currentTarget`), SearchableSelect combobox ARIA, nút bỏ chọn ra ngoài listbox, Esc chỉ đóng dropdown.

## Decision
- Không hỗ trợ Space để mở hàng (Enter đủ); không làm `inert` nền.
- Màn hình đọc thật và thao tác bàn phím thật chưa kiểm — giao người dùng.

## Next steps
- Phase 5: code review tổng, README, git baseline, bàn giao.
- Người dùng thử tay: Tab/Esc trong modal Tạo chuyến khi dropdown mở; Enter trên hàng.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
