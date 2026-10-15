# UI redesign: EmployeeListPage, CustomerListPage

## Changed
- Employee: page scaffold (PageHeader, Card+DataTable with FilterSelect toolbar, selectedKey), StatusPill/Pill, SubCard+kv panel, 480px aside, ModalOverlay w/ footer + FormGrid/Field, Alert. Fixed undefined `tableRef` -> `reload()`; added missing `reload` dep; typed edit form (no `any`); errors via `errorMessage`.
- Customer: custom `.tbl tbl-hover tbl-click` table, sortable headers (aria-sort, keyboard Enter/Space), `.foot`+`.pager`, SearchBox, EmptyState compact, status-stat StatusPill buttons in toolbar, SubCard panel, create modal (form id + submit in footer), typed edit form. Resizable panel kept (default 480). Create validation/errors now Alert in modal instead of alert().
- Removed ResizeObserver height-lock (flex layout handles height).

## Not converted / notes
- Delete/save errors still use native alert()/confirm() (behavior preserved).
- Customer detail status in view mode now a pill (was plain text).

## Shared gaps
- No shared component for a stat-filter pill button; used `<button>` wrapping StatusPill with inline box-shadow.
- No server-table component; CustomerListPage duplicates DataTable markup.
- Field has no "empty label" alignment option (used className="justify-end" for the checkbox).
