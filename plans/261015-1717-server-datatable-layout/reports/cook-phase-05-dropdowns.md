# Phase 5 - dropdowns

| File | Replaced | Mode |
|---|---|---|
| vehicle/VehicleListPage.tsx | edit panel: loại xe, nhiên liệu, sở hữu, trạng thái, TX chính/phụ; inspection result; create: loại xe, sở hữu, TX chính/phụ | single (clear only for optional: loại xe, TX) |
| employee/EmployeeListPage.tsx | edit + create status | single, no clear |
| supplier/SupplierListPage.tsx | edit + create status | single, no clear |
| pricing/PricingListPage.tsx | edit tripType/status; create KH/NCC, tuyến, tripType | single |
| customer/CustomerListPage.tsx | edit status | single, no clear |
| role/*, DashboardPage, LoginPage | no selects | - |
| SearchableMultiSelect.tsx | a11y: sibling clear button, Backspace/Delete clear, "— Bỏ chọn —" row (single+allowClear, unfiltered), Esc stop only when open | API unchanged |
| docs/design/ui-design-system.md | Dropdown section updated | - |

FilterSelect kept (still used by trip-plan). SearchableSelect.tsx kept (not deleted). Remaining `<Select>`: trip/TripCostTab (other owner).
Verify: tsc 0 errors in owned files (remaining trip/TripListPage errors belong to another engineer, in flux); oxlint 0 errors, no new warnings in owned files; vite build OK.
