# UI redesign: SupplierListPage + PricingListPage

- Both pages moved to design system v3 (page/PageHeader/Card/DataTable toolbar+FilterSelect/StatusPill/SubCard+kv/ModalOverlay footer/Alert/LoadingBlock). No palette color classes remain.
- Supplier: fixed API paths (`/suppliers`, baseURL already `/api`; old `/api/suppliers` double-prefixed), responses read via `res.data`, errors via `errorMessage`, id typed number, removed unsupported `search` prop (DataTable owns search), local `TextRow` helper replaces broken field helper, panel rendered once via `renderPanel(inline)` for lg aside and small overlay.
- Pricing: typed edit form/option records (no `any`), create form now owns its ModalOverlay (footer submit via form id), alert() validation/errors replaced by Alert in modal, labels reflect priceType.
- Verification: tsc clean for both files; oxlint 0 errors (1 pre-existing-pattern warning: setState in effect, supplier detail reset); palette grep empty.
