# Phase 4B report: Trip plans + Payroll periods

Status: DONE_WITH_CONCERNS. No commit.

## Files
- `packages/web/src/modules/trip-plan/TripPlanListPage.tsx`
- `packages/web/src/modules/payroll/PayrollPage.tsx`

## Trip plans
- `ServerDataTable endpoint="/trip-plans/dt"`, `page page-fill`, dense, rail ACTIVE/INACTIVE, toolbar multi-selects customer/vehicle/driver (options `/customers?pageSize=100`, `/vehicles?pageSize=1000&status=ACTIVE`, `/employees?pageSize=100&isDriver=true`), actions "Tạo chuyến" + "Thêm kế hoạch" (canEdit only).
- Columns KH, tuyến, biển số, tài xế, lịch chạy, cấu hình, trạng thái; sort indexes 0..3 match server. Status pill still toggles active (stopPropagation).
- `selectedKey` + memoized `onRowClick`; aside = inline DetailPanel at lg+, overlay below. `apiRef.reload()` after create/toggle/delete/save/generate. Hand-written fetch/search/footer/pager removed.
- Schedule chip: day chips + one compact slot chip (`S·C·T`, full names in title) to keep the row on one line at 1440.
- Modal dropdowns (customer, route, vehicle, 2 drivers) now `SearchableMultiSelect mode="single" searchable="auto"`; payload unchanged.

## Payroll (tab "Quản lý kỳ")
- `/payroll/periods/dt`: rail DRAFT/CONFIRMED/PAID (labels from STATUS_TONES), toolbar year (current-3..+1), type, region (`/payroll/regions`), action "Tạo kỳ lương".
- Columns Tháng (sort 1), Năm (sort 0), Loại (2), Khu vực, Chế độ, Số NV (`_count.PayrollEntry`), Trạng thái (3), Thao tác (existing icon buttons + confirm, stopPropagation). Row click still selects the period and jumps to Tổng hợp.
- Total column omitted: the dt row has no totals (only `_count.PayrollEntry`).
- Dropdowns in Tạo kỳ modal (month, type, mode, region) and Thêm dòng modal (category, line type) converted; year stays a numeric `Input`.
- Root uses `page page-fill` only while the periods tab is active; other tabs untouched.
- Removed imports `Select`, `FilterSelect`, `Toolbar`, `ToolbarSpacer` from this file.

## Verification
- `tsc -p tsconfig.app.json --noEmit`: 0 errors in owned files (a mid-edit trip-module file from another agent errored once, clean on final run).
- `oxlint src/modules/trip-plan src/modules/payroll`: 0 errors; 4 warnings, all pre-existing `set-state-in-effect` (1 trip-plan detail effect, 3 other payroll tabs). Fewer than before in payroll (old PeriodTab load effect gone).
- `vite build`: OK.
- Live (headless Chrome, CDP): `/trip-plans` mount = 1 `/trip-plans/dt`; rail click = 1 request (`status=ACTIVE`); row click opens inline aside; document scrollHeight == innerHeight (900). `/payroll` = 1 `/payroll/periods/dt` (0 rows, empty state, "Tạo kỳ lương" present, no page scroll).
- Screenshot: `plans/261015-1717-server-datatable-layout/reports/screenshots/phase-04-trip-plans.png`.
- Not exercised live: create/generate modals, confirm actions on periods (no period data), dark mode.

## Gaps / notes
- Toolbar `actions` slot: with 3 filters + 2 buttons, "Thêm kế hoạch" wraps to a second line at 1440 with the sidebar open (shared toolbar layout, not changed).
- `any` remains for panel detail/edit form payloads (pre-existing shape); marked with eslint-disable justification comments.
- Payroll monthly sort index 1 is a standalone "Tháng" column, because the spec lists year 0 / month 1 separately.

Status: DONE_WITH_CONCERNS
Summary: Trip-plan list and payroll periods tab use ServerDataTable with the /dt endpoints, and all dropdowns in both files use SearchableMultiSelect single mode. Build, tsc and oxlint are clean, and the live request counts match the spec.
Concerns/Blockers: Toolbar actions wrap to a second row on trip plans at 1440 (shared layout). Payroll total column omitted because the row has no totals.
