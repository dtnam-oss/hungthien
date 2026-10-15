# Phase 01 report: backend /dt endpoints

Status: done. tsc 0 errors, vitest 15 files / 102 tests pass, `npm run build` exit 0. Not committed.

## Added
- `shared/datatable.ts` (exported via shared/index.ts): `parseDTParams` (length clamp 1..500, bad order index -> -1), `parseMulti`, `multiParam` (reads `key` and `key[]`; Express 5 uses the simple query parser so `status[]` is a literal key), `multiIntParam`, `multiBoolParam`, `sortColumn`, `buildDTResponse`.
- Per-module `*-dt.service.ts` (SORTABLE_COLUMNS, buildWhere(search, filters, includeStatus), buildOrderBy, query): employee, vehicle, supplier, pricing, customer (pricing dir), trip-plan, payroll-period. Each runs `Promise.all([findMany, count(where), count(total), groupBy(whereBase)])`.
- Routes (before `/:id`): `GET /employees/dt`, `/vehicles/dt`, `/suppliers/dt`, `/pricing/dt`, `/trip-plans/dt`, `/payroll/periods/dt`; permissions same as list routes (employee, vehicle, supplier, pricing, trip, payroll). Employee /dt also applies `stripHiddenColumns`.
- Upgraded `/customers/dt` (helper + multi-status; response keeps `customerStats: []`) and `/trips/dt` (multi-status via `parseMulti`, exported `buildWhere`).
- Tests: tests/shared/datatable.test.ts, tests/{employee,vehicle,supplier,payroll,trip-plan}/*-dt.test.ts, tests/pricing/{pricing,customer}-dt.test.ts, tests/trip/trips-dt.test.ts.

## Smoke (live :3001, admin token)
| Request | HTTP | Result |
|---|---|---|
| employees/dt | 200 | total 5, filtered 5, statsSum 5 |
| vehicles/dt | 200 | 67/67, statsSum 67 |
| suppliers/dt | 200 | 3/3, statsSum 3 |
| pricing/dt?priceType=CUSTOMER | 200 | 3/3, statsSum 3 |
| trip-plans/dt | 200 | 2/2, statsSum 2 (ACTIVE) |
| payroll/periods/dt | 200 | 0/0 (no data) |
| customers/dt | 200 | 46/46, statsSum 46 |
| trips/dt | 200 | 2/2, statsSum 2 |
| trips/dt?status=PLANNED,COMPLETED | 200 | filtered 2 |
| trips/dt?status[]=PLANNED&status[]=COMPLETED | 200 | filtered 2 |
| trips/dt?status=PLANNED | 200 | filtered 1, stats still show both statuses |
| vehicles/dt?status=INACTIVE | 200 | filtered 0, stats ACTIVE 67 |
| vehicles/dt search=51, order col 99 | 200 | no 500, default order |
| employees/dt?isDriver=true&status=ACTIVE,SUSPENDED | 200 | filtered 2 |
| pricing/dt (no priceType) | 400 | VALIDATION_ERROR |
| REST /vehicles/1, /employees | 200 | unchanged |

`length=600` clamp: live data has fewer than 500 rows, so the clamp is proven by unit test only (rows <= 500 live).

## Deviations / notes
- Vehicle contract columns map to schema fields: `vehicleType` -> `Vehicle.type`, `loadCapacity` -> `Vehicle.tonnage` (web list shows tonnage). Rows return `type`, `tonnage`, `payloadCapacity`, `primaryDriver`, `secondaryDriver`, `Supplier` (not renamed to vehicleType/loadCapacity).
- Boolean filters (employee `isDriver`, trip-plan `isActive`): both values selected = no filter; one value = equality.
- Trips `statusStats` now computed before the status filter (previously included it) to match the shared contract; customerStats unchanged (still uses full where).
- Added `customer-dt.service.ts` (not in the plan's file list) so customer SORTABLE_COLUMNS/buildWhere are unit-testable without importing routes.
- Order param absent -> module default order (customers: name asc instead of code asc).
- Pricing `recordsTotal` is scoped to the requested priceType(s).
- Perf (groupBy on Trip > 300ms) not measured; only 2 trips in dev DB.
