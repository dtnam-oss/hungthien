---
phase: 2
title: "Web nền: ServerDataTable, hook, MultiSelect, CSS"
status: completed
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 2: Web nền — ServerDataTable, hook, SearchableMultiSelect, CSS

## Overview
Xây phần dùng chung trên web: hook `useServerTable` mở rộng (lọc nhiều giá trị, đổi `length`, `recordsTotal`), component `ServerDataTable` với layout mẫu NAK (rail · toolbar · bảng cao theo viewport · footer), dropdown chung `SearchableMultiSelect`, CSS zebra/dense/workspace. Chạy song song phase 1 theo contract `/dt` đã ghi ở phase 1.

## Requirements
- Functional:
  - `useServerTable`: `filters` nhận `string | number | (string|number)[]` (mảng → CSV); `setLength(50|100|200)` giữ `start` hợp lệ; trả `recordsTotal`, `recordsFiltered`, `statusStats`; debounce search 300ms; không request đôi khi mount (đã sửa) và khi đổi filter (reset `start` 1 lần).
  - `ServerDataTable<T>` props: `endpoint`, `columns: { key, label, sortIndex?, width?, minWidth?, align?, render?, className?, hideBelow?: 'md'|'lg'|'xl' }[]`, `filters`, `toolbar?` (slot cạnh ô tìm), `actions?` (slot phải: Lọc/Thêm), `title`, `rail?: { statuses: string[], labels?: Record<string,string>, value: string[], onChange }`, `groupBy?: (row)=>{ key, label, meta? }` (nhóm 1 cấp client-side trên trang hiện tại; Chuyến đi dùng `renderBody` tùy biến cho 2 cấp), `density: 'dense'|'comfortable'` (mặc định dense), `rowKey`, `selectedKey`, `onRowClick`, `selectable?` + `selected/onSelectedChange` (checkbox), `emptyTitle`, `rowNumber` (mặc định bật).
  - Footer: "Hiển thị a đến b / n kết quả" + " (lọc từ N)" khi `recordsFiltered < recordsTotal`; `Select` 50/100/200; `Pagination` có Đầu/Cuối.
  - Layout: `.workspace` flex row (rail 228px | card flex-1 min-w-0); card flex column: toolbar · `.tbl-wrap` flex-1 overflow auto với `thead` sticky · `.foot` dính đáy. Trang dùng `.page page-fill` → bảng cao theo viewport. Dưới 1024px: rail thành hàng chip ngang cuộn; dưới 768px: toolbar wrap, cột `hideBelow` ẩn.
  - `SearchableMultiSelect`: trigger kiểu `.input` hiện "n đã chọn" hoặc nhãn; dropdown: ô tìm nhanh, danh sách checkbox (ảnh mẫu), "Chọn tất cả (đang lọc)" / "Bỏ chọn", option disabled, `maxVisible` 200 + "Nhập để lọc thêm"; bàn phím: ↑↓ Space Enter Esc; ARIA listbox `aria-multiselectable`. Chế độ `single` dùng chung component (radio-like, đóng khi chọn) để thay `SearchableSelect`.
- Non-functional: render 200 dòng × 10 cột < 50ms re-render (memo hàng); không màu Tailwind cứng; dark mode qua token.

## Architecture
```
shared/hooks/useServerTable.ts   (mở rộng, giữ API cũ)
shared/components/ServerDataTable.tsx     ← thay DataTable.tsx (giữ file cũ tới phase 4)
shared/components/StatusRail.tsx          ← tách từ TripFilterRail (rail-stat, data-tone)
shared/components/TableFooter.tsx         ← range + page size + Pagination(Đầu/Cuối)
shared/components/SearchableMultiSelect.tsx (mode 'multi' | 'single')
shared/ui/Pagination.tsx                  (+ nút Đầu/Cuối, prop showEdges)
index.css: .workspace, .tbl-zebra (--row-alt), .tbl-dense, .rail-chips (<1024), .ms-* (multi-select)
```
Token mới: `--row-alt` light `#FAFAFB`, dark `#1A1B20`; `--row-selected` giữ `--accent-light`.

## Related Code Files
- Create: `packages/web/src/shared/components/ServerDataTable.tsx`, `StatusRail.tsx`, `TableFooter.tsx`, `SearchableMultiSelect.tsx`
- Modify: `packages/web/src/shared/hooks/useServerTable.ts`, `shared/ui/Pagination.tsx`, `shared/ui/index.ts`, `src/index.css`, `docs/design/ui-design-system.md` (mục "Bảng dữ liệu" + "Dropdown")
- Read: `shared/components/DataTable.tsx`, `modules/trip/components/TripFilterRail.tsx`, `TripTable.tsx`, `SearchableSelect.tsx`

## Implementation Steps
1. CSS: `.workspace`, `.tbl-zebra`, `.tbl-dense` (td 6px 10px, 13px, dòng ~32px), `--row-alt`, `.rail-chips`, `.ms-*`; kiểm tương phản `--row-alt` vs text (script contrast-check của phase 4 cũ).
2. `useServerTable`: mảng → CSV, `setLength`, `recordsTotal` đã có → expose; test thủ công bằng network.
3. `StatusRail` (từ `TripFilterRail`), `TableFooter`, `Pagination` thêm Đầu/Cuối.
4. `SearchableMultiSelect` (multi + single), tái dùng CSS `.menu`, `.search`; giữ `SearchableSelect` như wrapper mỏng `mode="single"` để không phải sửa 17 chỗ gọi ngay (phase 5 thay dần).
5. `ServerDataTable` ghép: toolbar (title · SearchBox · `toolbar` slot · spacer · `actions`), bảng (`.tbl .tbl-zebra .tbl-dense`, th sortable `aria-sort`, hàng `tabIndex=0` Enter, `is-selected`, checkbox cột khi `selectable`, nhóm 1 cấp khi `groupBy`), footer. Loading: thanh tiến trình mỏng + giữ dữ liệu cũ; lỗi → `Alert` trong card; rỗng → `EmptyState`.
6. Trang preview tạm (như phase 1 cũ) với dữ liệu `/vehicles/dt` thật khi phase 1 xong, chụp 1440/390 light+dark; xóa sau.
7. Commit `feat(web): ServerDataTable, StatusRail, SearchableMultiSelect`.

## Success Criteria
- [x] `ServerDataTable` render được với `/trips/dt` hoặc `/customers/dt` hiện có (chưa cần phase 1) — bảng cao theo viewport, footer đúng.
- [x] `SearchableMultiSelect` dùng được bằng bàn phím; chọn nhiều → `filters` gửi CSV.
- [x] `tsc`, `oxlint` 0 error, build xanh; không màu cứng; dark mode đạt tương phản.
- [x] Docs design system có mục Bảng dữ liệu + Dropdown.

## Risk Assessment
- **Bảng cao theo viewport làm panel chi tiết inline lệch chiều cao** → `aside` dùng cùng `.workspace` và `h-full`; tín hiệu: panel ngắn hơn bảng → sửa CSS, không đổi trang.
- **Sticky header trong `.tbl-wrap` + `border-collapse: separate`** cần `thead th { position: sticky; top: 0 }` với nền đặc — đã có; zebra không được đè lên `is-selected` (thứ tự rule).
- **Multi-select với danh sách > 1000 option** (xe, KH) → cắt `maxVisible` + nhắc gõ để lọc; không ảo hóa trong phase này.
