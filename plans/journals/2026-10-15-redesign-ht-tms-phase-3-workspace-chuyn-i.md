---
title: "Redesign HT-TMS: phase 3 workspace Chuyến đi"
date: 2026-10-15
summary: "Nối nút hành động + bulk vào PATCH /trips/:id/status, gán xe qua PUT, xuất CSV, ẩn nút giả; review 2 vòng, tester API pass"
---

# Redesign HT-TMS: phase 3 workspace Chuyến đi

## What happened
- `trip-status-flow.ts` giữ luật chuyển trạng thái (backend chỉ kiểm enum + khóa kỳ). Drawer: nút chính theo trạng thái; COMPLETED/kỳ khóa hiện ghi chú. Bỏ "In lệnh", "Mở toàn trang", cột ⋮, lịch sử giả.
- Bulk bar: gán xe (modal, PUT `{vehicleId, version}`), đổi trạng thái (chỉ đích hợp lệ, báo bỏ qua, confirm khi hủy), xuất CSV. Tập chọn = hàng hiển thị ∩ checked; reload xóa chọn trừ giữ chuyến lỗi (`keepSelectionRef`).
- CSV: BOM + CRLF + RFC4180 + chống formula injection; bỏ `sep=,` vì có thể làm Excel bỏ BOM.
- Tester API: chuỗi PATCH đầy đủ, PUT version cũ → 409, `tripsToCsv` 18/18. Reviewer vòng 1 tìm lỗi High thật (tập chọn lệch trang), vòng 2 thêm 2 điểm (menu giữ Esc listener khi tập chọn về 0; `sep=` vs BOM) → đã sửa.

## Decision
- Ưu tiên dấu tiếng Việt hơn tự tách cột trong Excel (không dùng `sep=`); ghi hướng dẫn Data › From Text nếu cần.
- Giới hạn bulk 50 chuyến, gọi tuần tự; không thêm endpoint bulk.

## Next steps
- Người dùng mở thử CSV trên Excel thật; bấm thử gán xe / đổi trạng thái trên UI.
- Backend: `PATCH /trips/:id/status` cần `requirePermission` + kiểm transition/version; cần `GET` nhật ký thao tác.
- Phase 4 (responsive/a11y), phase 5 (review tổng, git, bàn giao).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
