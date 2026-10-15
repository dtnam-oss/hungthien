# Phase 2 — Dọn dẹp & nhất quán · báo cáo thực thi

Ngày: 2026-10-15 · Plan: `plans/261015-0920-tms-ui-redesign-rollout/` · Phase: `phase-02-cleanup-consistency.md`

## Đã làm

| Bước | Kết quả |
|---|---|
| 1. Xóa trang chết | Xóa 5 file `*FormPage.tsx` (employee, supplier, pricing, trip, vehicle). Grep xác nhận 0 import trước khi xóa. |
| 2. Gom map trạng thái | `STATUS_TONES` thêm `CONFIRMED`, `PASS/FAIL/CONDITIONAL`; đổi nhãn `PAID` → "Đã chi" (khớp payroll). Payroll bỏ `PERIOD_STATUS`; Vehicle bỏ nhánh `DISPOSED` cục bộ và `RESULT_LABELS/RESULT_TONES`. Các `STATUS_LABELS` còn lại trong trang chỉ là **nhãn theo module** truyền qua prop `label`, không chọn màu → giữ. |
| 3. `KV`/`KVItem` | 0 usage → xóa khỏi `Surfaces.tsx` và barrel. Docs cập nhật sang `<div className="kv">` + `FieldRow`. |
| 4. Warning lint | Ghi nhận bên dưới, không sửa trong phase này. |
| 5. Docs | `docs/design/ui-design-system.md` thêm mục "Trạng thái & màu"; tạo `docs/getting-started.md` (chạy local, kiểm tra chất lượng, giao diện). Không tạo `README.md` gốc vì rule phiên chỉ cho phép markdown trong `plans/`/`docs/`; để phase 5 hỏi người dùng. |
| 6. Xóa backup scratchpad | **Hoãn** — phụ thuộc phase 1 xác nhận không cần rollback. |

## Kiểm tra

- `tsc -p tsconfig.app.json --noEmit`: 0 lỗi.
- `oxlint src`: 0 error, 24 warning (giảm từ 29 nhờ xóa file chết).
- `vite build`: OK.
- Grep màu Tailwind cứng toàn `src`: 0. Grep map `tone` ngoài `STATUS_TONES`: 0.

## Warning lint tồn tại từ trước (để phase 5 quyết)

| Rule | Số | File |
|---|---|---|
| `react(set-state-in-effect)` | 21 | CreateTripModal 4, PayrollPage 4, RolesPermissionsPage 3, DataTable 2, TripPlanListPage 2, useServerTable, Sidebar, SearchableSelect, DetailPanel, DashboardPage, SupplierListPage |
| `react(only-export-components)` | 2 | Pill.tsx (`STATUS_TONES`), auth-context.tsx (`useAuth`) |
| `react-hooks(exhaustive-deps)` | 1 | RolesPermissionsPage |
| `react(immutability)` | 1 | AssignRolesPage |

Đa số là pattern "tải dữ liệu trong effect rồi setState" có sẵn; sửa hàng loạt ≈ 0.5d, đề xuất ticket riêng.

## Câu hỏi chưa chốt

- Có tạo `README.md` ở gốc repo (hiện chưa có) hay chỉ giữ `docs/getting-started.md`?
- Khi nào xóa bản sao `src-before-redesign` trong scratchpad (sau phase 1)?
