---
phase: 2
title: "Dọn dẹp & nhất quán"
status: completed
priority: P2
effort: "0.5d"
dependencies: []
---

# Phase 2: Dọn dẹp & nhất quán

## Overview
Xóa code chết còn style cũ, gom các map trạng thái cục bộ về `STATUS_TONES`, và làm docs/hướng dẫn khớp với code sau redesign.

## Requirements
- Functional: không đổi hành vi người dùng.
- Non-functional: `grep` màu Tailwind cứng trên toàn `src` trả 0 (kể cả file không route); một nguồn duy nhất cho nhãn/màu trạng thái.

## Architecture
`shared/ui/Pill.tsx` → `STATUS_TONES` là bảng tra trạng thái → `{label, tone}`. Trang chỉ gọi `<StatusPill status>`; nhãn khác chuẩn thì truyền `label` thay vì tự map màu.

## Related Code Files
- Delete: `packages/web/src/modules/employee/EmployeeFormPage.tsx`, `modules/supplier/SupplierFormPage.tsx`, `modules/pricing/PricingFormPage.tsx`, `modules/trip/TripFormPage.tsx`, `modules/vehicle/VehicleFormPage.tsx` (không có route, không ai import — đã xác nhận bằng grep 14/10)
- Modify: `packages/web/src/shared/ui/Pill.tsx` (thêm `CONFIRMED: Đã duyệt/success` cho kỳ lương; kiểm tra `DISPOSED`, `MAINTENANCE`)
- Modify: `packages/web/src/modules/payroll/PayrollPage.tsx` (bỏ `PERIOD_STATUS` cục bộ), `modules/vehicle/VehicleListPage.tsx` (bỏ `VehicleStatusPill` wrapper), `modules/role/AssignRolesPage.tsx` (map tone theo tên vai trò → xem có nên giữ)
- Modify: `docs/design/ui-design-system.md`, `README.md` gốc nếu có mục setup web (thêm dark mode, Ctrl K)
- Review: `packages/web/src/shared/components/FieldRow.tsx` vs `shared/ui/Surfaces.tsx` `KVItem` — trùng vai trò; giữ `FieldRow` (đang dùng rộng), đánh dấu `KVItem` deprecated hoặc xóa nếu 0 usage

## Implementation Steps
1. `grep -rn "FormPage" packages/web/src` → xác nhận 0 import rồi xóa 5 file; chạy `tsc` + `vite build`.
2. Đọc các map trạng thái cục bộ còn lại: `grep -rnE "STATUS_(MAP|COLORS|LABELS)|PERIOD_STATUS|StatusPill\b" packages/web/src/modules`. Với mỗi map: nếu key chưa có trong `STATUS_TONES` thì thêm vào đó; trang chuyển sang `<StatusPill status label?>`.
3. Kiểm tra `KVItem` usage; xóa nếu không dùng, cập nhật barrel `shared/ui/index.ts`.
4. Quét `oxlint src` lấy danh sách warning `set-state-in-effect`/`exhaustive-deps` theo file; **không** sửa hàng loạt trong phase này, chỉ ghi vào báo cáo để phase 5 quyết.
5. Cập nhật docs: mục "Quyết định bố cục" đã có; thêm mục "Trạng thái & màu" trỏ tới `STATUS_TONES`; thêm hướng dẫn chạy local (Postgres → server → web) vào README nếu README chưa có.
6. Xóa thư mục backup `src-before-redesign` trong scratchpad sau khi phase 1 xác nhận không cần rollback (hỏi người dùng trước).

## Success Criteria
- [x] 5 file FormPage đã xóa; `tsc`, `oxlint`, `vite build` xanh.
- [x] `grep` màu Tailwind cứng toàn `src` = 0.
- [x] Không còn map trạng thái → màu ngoài `STATUS_TONES` (grep xác nhận).
- [x] Docs design system và README phản ánh đúng component/flag hiện có.

## Risk Assessment
- **Một FormPage thực ra được dự định route sau này** → tín hiệu: người dùng phản hồi khi hỏi trước khi xóa. Phản ứng: nếu giữ, chuyển file sang design system (giao subagent) thay vì xóa.
- **Gom STATUS_TONES làm đổi nhãn tiếng Việt** (ví dụ "Bảo trì" vs "Bảo dưỡng") → giữ nhãn đang dùng trên trang bằng tham số `label`, ghi rõ trong báo cáo phase.
