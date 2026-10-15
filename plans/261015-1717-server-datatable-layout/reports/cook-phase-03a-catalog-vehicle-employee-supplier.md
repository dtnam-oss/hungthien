# Phase 3A report: Vehicle / Employee / Supplier on ServerDataTable

Status: DONE_WITH_CONCERNS. Not committed.

## Files (only owned ones)
- `packages/web/src/modules/vehicle/VehicleListPage.tsx`
- `packages/web/src/modules/employee/EmployeeListPage.tsx`
- `packages/web/src/modules/supplier/SupplierListPage.tsx`

## What changed
- All three: `page page-fill` + `PageHeader` + `ServerDataTable` (`/vehicles/dt`, `/employees/dt`, `/suppliers/dt`), `density="dense"`, rail (status, multi), `actions` = "Thêm" button (size sm, moved from PageHeader into the toolbar), `selectedKey` + `onRowClick` (`useCallback`), inline 480px `aside` at >= lg, overlay below lg (unchanged). `reload` = `apiRef.current.reload()` (no `key` remount). `DataTable`/`FilterSelect`/`Card` imports removed. Detail panels, tabs, edit/save/delete, create modals, permissions untouched.
- Vehicle: columns plate(0) / loại(1) / hãng(2) / tải(3) / sở hữu(4) / tài xế 1 (no sort) / trạng thái(5); `groupBy` brand on by default + checkbox "Nhóm theo hãng"; filters: sở hữu, loại (`vehicleType`), tài xế (`primaryDriverId`, from `/vehicles/drivers`), rail status. Minor columns `hideBelow` md/lg.
- Employee: code(0) name(1) phone(2) position(3) department(4) TX pill (no sort) status(5); filters: rail status, TX/không TX (`isDriver`), phòng ban (`department`).
- Supplier: code(0) name(1) MST(2) SĐT(3) liên hệ, số xe (no sort) status(4); rail only. Name cell shows `shortName` inline (one-line row). Detail reload after CRUD still refetches via a `detailVersion` counter (replaces the old `reloadKey` dependency).

## Verification
- `tsc -p tsconfig.app.json --noEmit`: 0 errors. `oxlint` on the 3 dirs: 0 errors, 1 warning (`SupplierListPage.tsx:145` set-state-in-effect on the detail-load effect; same effect existed before, not new). `vite build` OK.
- Live (headless Chrome via CDP, network counted at 1440x900), requests to `/dt` per action:
  - mount: vehicles 1, suppliers 1, employees 1 table request (+2 `/employees/dt?length=500` department-lookup calls in dev, StrictMode double effect; 1 in prod).
  - rail click 1, rail reset 1, sort click 1, sort toggle 1, row click 0 (detail uses REST `/:id` as before). Page size verified in phase 2 (shared).
  - Sort params sent: vehicles `order[0][column]=5` (status), employees 5, suppliers 4; matches SORTABLE_COLUMNS. Dev DB has a single status value per module, so ordering by status cannot be seen in the data; verified by the index contract only.
  - Rail counts: vehicles Tổng 67 / Hoạt động 67; employees 5; suppliers 3; footer "Hiển thị 1 đến N / N kết quả", 50/100/200, Đầu/Cuối.
  - Detail aside width 480 after row click on all three.
- Screenshot: `reports/screenshots/phase-03-vehicles.png` (1440x900 light): rail + toolbar on one line, brand group row "ISUZU 30", zebra, dense rows, footer, matches the NAK layout. Temp scripts live in the scratchpad; no `ui-auth.html` created.

## Deviations / Concerns
- Vehicle toolbar has no supplier select: with search (280px) + 3 selects + group toggle + button, adding a 4th select wrapped the "Thêm xe" button to a second row at 1440. The phase file lists only sở hữu/loại/tài xế for Xe; backend `supplierId` filter remains available. Re-add if wanted, but toolbar width needs a fix in shared CSS.
- Default sort comes from `useServerTable`: first request is `order[0][column]=0&dir=desc` (e.g. plate/code descending) though no header shows it as sorted unless the user clicks. `ServerDataTable` has no default-order prop; worth a shared fix (ascending default) in phase 2 files.
- Department filter options are derived client-side from `/employees/dt?length=500` (no distinct endpoint; department is free text). Refetched after create/edit/delete.
- Vehicle "Hãng" column duplicates the group header when grouping is on; kept per spec (visible when toggled off and for md/lg hiding).
- Grouping is per page (client side, from shared component); with 100 rows/page brand groups are split across pages if sort is not by brand.

Status: DONE_WITH_CONCERNS
Summary: Vehicle, Employee and Supplier pages now use ServerDataTable with /dt, rail, multi-select filters and inline detail aside; tsc, oxlint and build pass, one request per action verified live.
Concerns/Blockers: no supplier filter in Vehicle toolbar (width); hook default order is column 0 desc; one pre-existing oxlint warning in SupplierListPage.
