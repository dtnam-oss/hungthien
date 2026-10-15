---
title: Bảng dữ liệu server-side thống nhất theo mẫu NAK — hoàn tất 6 phase
date: 2026-10-15
summary: "8 endpoint /dt, ServerDataTable + SearchableMultiSelect, 9 trang chuyển, review 3 vòng, tester phase 6 với 252 chuyến test; đã push main"
---

# Bảng dữ liệu server-side thống nhất theo mẫu NAK — hoàn tất 6 phase

## What happened
- 6 phase chạy liên tục trong một phiên với 9 subagent song song theo file ownership (backend/web nền song song; 3A/3B; 4A/4B/5; tester + reviewer phase 6).
- Backend: `shared/datatable.ts` + 6 `*-dt.service.ts`, nâng customers/trips; 106 test. Review phát hiện quyền cột chưa áp cho /trips, /pricing và sort/tìm trên cột ẩn ở employees → sửa.
- Web: `ServerDataTable` (workspace rail|card, bảng cao theo viewport, zebra/dense, nhóm, chọn nhiều, renderBody), `StatusRail`, `TableFooter` (50/100/200, Đầu/Cuối, lọc từ tổng), `SearchableMultiSelect` (multi/single). 9 trang chuyển; xóa DataTable/SearchableSelect/FilterSelect.
- Tester phase 6: tạo 250 chuyến test rồi xóa; 1 request/thao tác (trừ employees mount 3); phát hiện /trips 390px bảng 22px → sửa CSS mobile.

## Decision
- Dưới 1024px không khóa chiều cao theo viewport (trang cuộn) — bộ lọc xếp chồng cao.
- Hook không gửi sort khi chưa chọn cột để server dùng sort mặc định module.
- Bỏ `sep=` (CSV) đã quyết trước; nhóm chỉ trong trang hiện tại.

## Next steps
- Endpoint distinct phòng ban; nâng clamp pageSize cho dropdown; bỏ customerStats thừa ở /trips/dt.
- Người dùng bấm tay modal/dropdown + màn hình đọc; quyết schema giá NCC.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
