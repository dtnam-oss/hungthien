# Phase 2 report — web foundation

Status: DONE_WITH_CONCERNS (see Deviations). No commit made (as instructed).

## Files
- Edited: `shared/hooks/useServerTable.ts`, `shared/ui/Pagination.tsx` (`showEdges`), `shared/components/SearchableSelect.tsx` (thin wrapper, props identical), `src/index.css` (appended `.workspace*`, `.tbl-area`, `.tbl-progress`, `.tbl-zebra`, `.tbl-dense`, `.rail-chips`, `.hide-md/lg/xl`, `.foot-*`, `.ms-*`; tokens `--row-alt` light #FAFAFB / dark #1A1B20), `docs/design/ui-design-system.md` (sections "Bảng dữ liệu", "Dropdown", token row).
- New: `shared/components/ServerDataTable.tsx`, `StatusRail.tsx`, `TableFooter.tsx`, `SearchableMultiSelect.tsx`.
- `shared/ui/index.ts` unchanged (nothing new to export from ui layer).

## API
- `useServerTable`: `filters: Record<string, string|number|(string|number)[]|undefined>` (exported type `ServerTableFilterValue`); array -> CSV, empty array omitted. `setLength(n)`: `start = floor(start/n)*n`. `customerStats`/`statusStats` default to `[]` when the server omits them. Existing callers untouched.
- `ServerDataTable<T>`: props as spec plus `aside?: ReactNode` (rendered inside `.workspace` after the card, for inline detail panels) and `apiRef?: Ref<{ reload }>`. `selected` is `(string|number)[]`. `renderBody({ rows, columns, startIndex, selected, toggle, onOpen })` returns `<tr>`s. Exports `ServerDataColumn`, `ServerDataTableApi`, `RenderBodyContext`, `RowId`.
- `StatusRail({ statuses, value, onChange, stats, labels?, title?, totalLabel?, ariaLabel? })`; "Tổng" count = sum of `statusStats`. Multi toggle.
- `TableFooter({ start, length, recordsFiltered, recordsTotal, rowCount, currentPage, totalPages, onPage, onLength })`.
- `SearchableMultiSelect<V>`: discriminated union `mode: 'multi' (value V[]) | 'single' (value V|'', onChange(v, option?))` + `options, placeholder, searchPlaceholder, searchable(true|false|'auto'), allowClear, size, error, disabled, maxVisible=200, className, aria-label, renderOption`.

## Verification
- `tsc -p tsconfig.app.json --noEmit` 0; `oxlint src` 0 errors, no new warnings from my files (remaining warnings pre-existing, incl. `useServerTable.ts` effect warning that existed before); `vite build` OK.
- Preview with `/customers/dt` (46 rows), rail + multi + single select in toolbar/actions, selectable. Measured (headless, innerH 805): card bottom 765 = innerH - 40 (page padding); `.tbl-wrap` scrollH 1840 vs clientH 485; main scrollH == clientH; document scrollH == innerH -> only `.tbl-wrap` scrolls. Same at 1280x720 (card bottom 585 = 625-40).
- Network: mount = 1 `/dt` request (StrictMode dev too); rail click = 1 request with `status=ACTIVE`; page-size change = 1 request (`length=50&status=ACTIVE`).
- Keyboard (synthetic events, 80ms apart): ArrowDown x3, Space on a disabled option = no-op, ArrowDown, Enter -> picks option 5, trigger shows label, `aria-activedescendant` set; Esc closes and refocuses trigger.
- Contrast `--row-alt` vs text: light text-2 14.28, muted 5.99; dark text-2 13.55, muted 6.71 (>= 4.5). Repo contrast script has no row-alt pair, computed inline with same formula.
- Screenshots: `plans/261015-1717-server-datatable-layout/reports/screenshots/phase-02-{light,dark,mobile,menu}.png` (1440x900 light/dark, 390 via iframe, open dropdown). Temp preview/auth files deleted.

## Deviations / notes
- Added `aside` prop (not in spec; phase 3/4 inline detail panels need it).
- `SearchableSelect` no longer renders the "placeholder" clear row inside the list; clearing is via the trigger X (`allowClear`). Public props unchanged; 17 call sites untouched.
- Edge buttons are text-only "Đầu"/"Cuối" (no double-chevron icons).
- Row memo: handlers depend on `onRowClick`/`selected`, so pages should wrap `onRowClick` in `useCallback` to keep rows from re-rendering on every parent render.
- A code value that is long (e.g. `TR-C-1788688291050`) wraps to 2 lines in dense mode unless the column is wide enough or uses `whitespace-nowrap`; pages should set `className`/`width` on code columns.
- `/dt` backend of other modules not tested (only customers/trips as agreed). Dropdown clipping: menu is absolute inside the card (`overflow:hidden`), fine near the toolbar; not portal-based.
