# Trip list -> design system v3

TripListPage.tsx 1279 -> 196 lines. tsc clean for trip/(TripListPage|components), oxlint clean, 0 Tailwind palette classes, 0 inline `style=` except none left (drawer shadow now a token utility).

## Restored / wired (existing handlers, real endpoints, no new endpoints)
- Edit trip (PUT /trips/:id): pencil in drawer header toggles edit; info tab shows edit form; footer "Hủy / Lưu thay đổi". Hidden when no canEdit or trip locked.
- Delete trip (DELETE /trips/:id): trash icon in drawer footer (canDelete), confirm kept.
- Add cost (POST /trips/:id/costs): "+ Thêm khoản chi phí" dashed button opens inline form (type/amount/description).
- Delete cost (DELETE /trips/:id/costs/:costId): icon per row (canEdit && !locked).
- Attention filter: state existed but never filtered rows; now filters rows (and select-all applies to visible rows).
- Locked-period banner restored in info tab.
- Logic moved to components/useTripDetail.ts (load/open/close/edit/save/remove/addCost/deleteCost, alerts via errorMessage).

## Deleted (dead, no UI in reference)
- activeTab, deleting, editSaving, handleStatusStatClick, handleCustomerStatClick, toggleAll + collapsedGroups/allCollapsed bookkeeping, tableHeight + ResizeObserver, panelWidth/handleDragStart/localStorage resize (drawer is a fixed-width overlay, no resize handle existed), MobileCard, PanelContent/InfoTab/CostsTab/HistoryTab/StatusBadge/STATUS_LABELS, local FieldRow/EditFieldRow (use shared), customer sub-header grouping items.
- components/StatusPill.tsx (shared StatusPill used).

## New components
TripTable.tsx (.tbl/.tbl-group-row/is-selected), TripInfoTab.tsx, TripCostTab.tsx, useTripDetail.ts. TripStatusTabs is now a thin SegmentedTabs wrapper ("" = all). Banner = .alert-warn; bulk bar = token utilities (no bulk class in CSS).

## Notes
- Drawer top is 0 (page is already below topbar); old code offset by --header-h.
- Still non-functional placeholders (no endpoints, same as before): Xuất Excel, Mở toàn trang, In lệnh, primary status action, bulk buttons, row ⋮.
- Table error now shown in empty state; list-pager still shows first 5 pages (pre-existing).
- Not visually checked in browser (no dev server per instructions).
