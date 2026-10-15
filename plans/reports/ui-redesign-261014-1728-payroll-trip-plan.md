# UI redesign: PayrollPage + TripPlanListPage (design system v3)

Status: DONE. tsc clean for both modules; oxlint 0 errors (6 pre-existing set-state-in-effect warnings, same load-in-effect pattern); palette-class grep empty.

## PayrollPage
- `.page` + PageHeader (back-to-list is a ghost Button in actions); 5 tabs via SegmentedTabs.
- Periods: Card + Toolbar (FilterSelect year, Create button) + `.tbl tbl-hover tbl-click`, `is-selected` for current period; row actions are IconButtons with aria-labels.
- Summary: shared StatCard in `.stat-grid`, warn Alert for diff, tfoot totals. Detail: employee list as clickable `.tbl`, lines table with Pill tags. Bonus/attendance/no-period use Card + EmptyState.
- Modals: shared ModalOverlay + footer + FormGrid/Field; submit via `form=` id so Enter still submits.
- Local StatCard, CalendarIcon removed (lucide CalendarDays). `err: any` replaced by `errorMessage`. Unused `entries` state in BonusPenaltyTab dropped.
- Status: API keys are DRAFT/CONFIRMED/PAID. CONFIRMED is not in STATUS_TONES, so a local `PERIOD_STATUS` map renders `<Pill>` (labels unchanged: Nháp / Đã duyệt / Đã chi).

## TripPlanListPage
- `.page page-fill`; Card with Toolbar (SearchBox, FilterSelect), `.tbl`, `.foot` + `.pager`.
- Day chips `pill pill-sm` (brand active / outline inactive), slots warn. Active toggle is a button wrapping StatusPill. Plate for plate numbers.
- Detail panel: `aside.card` width 480 with inlineMode; panel built once via renderPanel(inline). SubCard + `.kv` + shared FieldRow/EditFieldRow. titleAddon shows active status.
- Local ModalOverlay and FieldRow deleted; shared ones used. Fixed: unused useMemo, `useRef(undefined)`, 5 SearchableSelect onChange wrappers. SearchableSelect has no `label` prop (old code passed one), so labels moved to `<Field label required>`.
- Error text now via errorMessage (was possibly an object). Added PageHeader description text (new copy).
