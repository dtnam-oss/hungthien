# Phase 4A report - Trips on ServerDataTable

Status: DONE_WITH_CONCERNS. No commit.

## Server
- `trips-dt.service.ts`: exported `SORTABLE_COLUMNS = ['route','customer','plate','status','supplier']`; `buildOrderBy` (exported) maps via `sortColumn`; unknown index -> `tripDate desc, id desc`; id desc tiebreak on each sort.
- Beyond spec: `customerId`/`driverId`/`supplierId` are now `number[]` (IN filters, parsed with `multiIntParam` in the `/dt` handler) because the web toolbar uses multi-selects and a CSV value would have been NaN. Response shape, `statusStats`, `customerStats` unchanged.
- Tests: list assertion, per-index mapping, fallback, multi filters. Server: tsc 0, 106/106 tests pass.
- curl smoke: `order[0][column]=3` asc -> COMPLETED,PLANNED; desc reversed; unknown index -> default order.

## Web
- `TripListPage`: `ServerDataTable endpoint="/trips/dt"` with rail (5 statuses, multi), toolbar (customer/supplier/driver multi, DateRange, Theo ngay/Danh sach seg), actions (Xuat CSV, Tao chuyen), comfortable, selectable, selectedKey = drawer id, renderBody, defaultLength 100. Drawer stays overlay; bulk bar/assign/status/CSV, attention banner ("tren trang nay" note kept in banner flow) unchanged.
- `TripTable.tsx` now only `TripBody` (day -> route grouping / flat, 2-line cells). New `trip-columns.tsx` holds columns (sortIndex route 0, customer 1, plate 2, status 3, supplier 4) - separate file to avoid the fast-refresh export warning.
- `TripFilterRail.tsx` deleted (0 references).
- Dropdown rule: CreateTripModal (6), AssignVehicleModal (1), TripInfoTab status select -> `SearchableMultiSelect mode="single" searchable="auto"`; payloads unchanged.
- Row 'page rows' reach the page through an `onRows` callback fired by `TripBody` (ServerDataTable does not expose data); selection is cleared on every page-rows change, except failed trips kept after a bulk action.

## Verification
- web tsc 0; oxlint trip: 0 errors, only pre-existing warnings (no new); vite build OK.
- Live (headless Chrome 1440x900, light): mount = 1 `/trips/dt`; rail click = 1 request (`status=PLANNED`); sort Trang thai = 1 request (`order[0][column]=3&order[0][dir]=asc`); group/flat toggle = 0 requests (grouped 1 day + 1 route header / flat 0 headers); header select-all checks all rows and the bulk bar shows "Da chon 2 chuyen"; row click opens drawer, Esc closes; only `.tbl-wrap` scrolls (doc scrollH == innerH); table fits 886px card without horizontal scroll (customer/supplier truncated with ellipsis).
- Screenshot: `reports/screenshots/phase-04-trips.png`. Temp scripts/profile in scratchpad removed; no `ui-auth.html` created (CDP + localStorage seeding).

## Concerns / shared gaps
- Only 2 trips in the dev DB: grouping with many days/routes and the BULK_LIMIT warning were not exercised live.
- `ServerDataTable` does not expose loaded rows or a clear-selection hook; worked around with `onRows` in `renderBody`. A shared `onData`/`onRowsChange` prop would remove it.
- Select-all in the header selects hidden-by-attention-filter rows too (they are excluded from bulk actions since selection is intersected with visible rows).
- Attention-filter empty state is rendered inside `TripBody`.

Status: DONE_WITH_CONCERNS
