# Phase 3B report: Pricing + Customer on ServerDataTable

Status: DONE_WITH_CONCERNS. Not committed.

## Files
- packages/web/src/modules/pricing/PricingListPage.tsx
- packages/web/src/modules/customer/CustomerListPage.tsx

## Done
- Both: `page page-fill` + PageHeader + `ServerDataTable` (dense, rail ACTIVE/INACTIVE, `apiRef.reload()` after create/edit/delete, `selectedKey` + useCallback `onRowClick`, `aside` inline panel >= lg, overlay below lg). No DataTable/FilterSelect/useServerTable usage left.
- Pricing: `/pricing/dt`, `filters` always has `priceType`; sortIndex 0..5 as spec; multi filters customerId/routeId (options from `/customers` and `/routes?pageSize=100`); "Nhóm" toggle (group by KH, default off); SUPPLIER-create block and titles kept. Inner component keyed by `priceType` so switching KH/NCC resets filters/panel.
- Customer: `/customers/dt`, sortIndex [code0,name1,taxCode2,phone4,status5] (email=3 has no column); hand-written table/footer/pager/chips removed; resizable panel + `panel-width-customers` key kept (handle inside `aside`). Mobile card list dropped (table scrolls horizontally).

## Verify
- tsc 0, oxlint 0 (no output), vite build OK.
- Live API: pricing SUPPLIER `/dt` 200 (empty); customers sort status asc/desc differ; pricing unitPrice desc ordered (6M,5M,4.5M).
- Screenshots: reports/screenshots/phase-03-customers.png (1440x900 light); pricing viewed ad hoc. Temp ui-auth.html deleted.

## Concerns
- Customer address column uses `hidden 2xl:table-cell` instead of `hideBelow xl`: at 1440 with the sidebar the card is ~887px and address pushed other columns out.
- Name/route truncate to one line (title tooltip) to keep rows one-line.
- Per-action request count not re-measured for these pages (phase 2 measured the shared component); filters are memoized and the inner key only changes on priceType.
- Panel open/edit/delete/create flows not manually clicked (headless screenshot only).
- Pricing options use `pageSize=100`: customers/routes beyond 100 missing from filters.
