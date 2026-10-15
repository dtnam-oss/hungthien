# HT-TMS · UI Design System v3

Nguồn chuẩn màu/bo góc: [`ht-tms-trips-handoff/trips-reference.html`](./ht-tms-trips-handoff/trips-reference.html).
Toàn bộ token và lớp component nằm trong [`packages/web/src/index.css`](../../packages/web/src/index.css).
Primitive React nằm trong [`packages/web/src/shared/ui/`](../../packages/web/src/shared/ui/).

## Nguyên tắc

- **Không hard-code màu** trong trang. Dùng CSS var (`var(--muted)`), utility token (`text-muted`, `bg-surface`, `border-line`) hoặc lớp component.
- **Không dùng** `bg-blue-*`, `text-gray-*`, `border-gray-*`, `focus:ring-blue-*`… Brand là **đỏ** `--accent`, nền trung tính zinc.
- Font: Be Vietnam Pro (chữ), JetBrains Mono (mã, biển số, số tiền trong bảng → `.mono` / `.code` / `.plate`).
- Mọi thứ bấm được là `<button>` / `<a>`. Nút chỉ có icon phải có `aria-label` (dùng `IconButton`).
- Tabs: `role="tablist"` / `role="tab"` + `aria-selected` (có sẵn trong `SegmentedTabs`, `UnderlineTabs`, `DetailPanel`).

## Token chính

| Nhóm | Var | Giá trị |
|---|---|---|
| Nền | `--bg` / `--surface` / `--surface-2` / `--surface-3` / `--track` | `#F6F6F7` / `#FFF` / `#FAFAFB` / `#F2F2F4` / `#EDEDF0` |
| Zebra | `--row-alt` | `#FAFAFB` (sáng) / `#1A1B20` (tối) |
| Viền | `--border` / `--border-light` / `--border-input` / `--border-strong` | `#E7E7EA` / `#F0F0F2` / `#E0E0E4` / `#D4D4D8` |
| Chữ | `--text` / `--text-2` / `--text-3` / `--muted` / `--muted-2` / `--faint` | `#18181B` / `#27272A` / `#3F3F46` / `#5F6068` / `#6B6C75` / `#8A8B93` |
| Brand | `--accent` / `--accent-strong` / `--accent-light` / `--accent-hover` | `#D92D20` / `#B42318` / `#FEF3F2` / `#FEE4E2` |
| Tone | `--info-*` `--violet-*` `--warn-*` `--success-*` `--neutral-*` `--danger-*` | xem `index.css` |
| Bo góc | `--radius-sm/md/lg/xl/2xl` | 6 / 8 / 10 / 12 / 14 px (ghi đè luôn `rounded-*` của Tailwind) |

Utility Tailwind theo token: `bg-surface`, `bg-surface-2`, `text-ink`, `text-muted`, `text-brand`, `border-line`, `border-line-input`, `bg-brand-soft`, `text-success`, `text-danger`…

## Quyết định bố cục (15/10/2026, theo mẫu NAK TMS)

- Brand giữ **đỏ**; neutrals zinc. Xem [brainstorm](../../plans/reports/brainstorm-261015-0854-tms-ui-redesign-nak-layout.md).
- Bảng **dày**: header navy (`--thead-bg`), chữ uppercase 11.5px, dòng 8px/12px, cột số thứ tự `.row-num`, mặc định 100 dòng/trang, phân trang số trang (`Pagination`).
- Panel chi tiết: `.kv` là **hàng ngang** (nhãn uppercase trái · giá trị phải), bên trong dùng `FieldRow` / `EditFieldRow`. Lưới 2–3 cột cho số liệu ngắn dùng `.kv-grid` (+ `.kv-3`).

## Trạng thái & màu

- `STATUS_TONES` trong `shared/ui/Pill.tsx` là **nơi duy nhất** map mã trạng thái → `{label, tone}` (chuyến, nhân sự/xe, kỳ lương, kết quả kiểm định…).
- Trang dùng `<StatusPill status={…} />`. Khi module cần nhãn khác chuẩn (ví dụ ACTIVE = "Đang làm" ở Nhân viên, "Đang áp dụng" ở Bảng giá) thì truyền `label`, **không** tự chọn màu.
- Mã mới → thêm vào `STATUS_TONES`, không tạo map cục bộ `tone` trong trang. `<Pill tone>` chỉ dùng cho nhãn không phải trạng thái (số đếm, loại dòng, vai trò).
- Trang Chuyến đi: **rail lọc trái** (`.filter-rail`, `.rail-stat[data-tone]`) · bảng nhóm 2 cấp ngày → tuyến (`.tbl-group-row`, `.tbl-subgroup-row`) · drawer phải.
- **Dark mode**: token ghi đè ở `:root[data-theme='dark']`; `shared/theme.ts` (`initTheme`, `useTheme`, `setTheme`), nút `ThemeToggle` trên topbar, lưu `localStorage['ht-theme']`, mặc định theo OS. Phần tử "đen" dùng `--inverse-bg` / `--inverse-text`; nền trắng dùng `var(--surface)`, không viết `#fff` cho background.

## Lớp component (CSS)

| Mục đích | Lớp |
|---|---|
| Khung trang | `.page` (padding 24/28, gap 16, max 1600) · `.page-head` + `h1` + `p` · `.page-actions` |
| Nút | `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` / `.btn-danger-solid` / `.btn-dashed` / `.btn-dark` · size `.btn-xs` / `.btn-sm` / `.btn-lg` · `.btn-block` |
| Nút icon | `.icon-btn` (+ `.icon-btn-sm`, `.icon-btn-danger`, `.icon-btn-brand`, `.icon-btn-outline`) |
| Form | `.input` / `.select` / `.textarea` / `.checkbox` (+ `-sm`, `-error`) · `.field` + `.field-label` + `.field-hint` + `.field-error` · `.form-grid` (2 cột, `.field-full` chiếm 2) · `.check-label` |
| Toolbar | `.search` (icon + input) · `.filter` (select nhỏ, `.is-active` khi có giá trị) · `.toolbar` · `.toolbar-spacer` |
| Card | `.card` · `.card-head` + `.card-title` · `.card-body` · `.card-foot` · `.sub-card` + `.sub-card-title` (card trắng trong drawer) · `.section-title` (11px uppercase) |
| Bảng | `.tbl` (+ `.tbl-hover`, `.tbl-click`, `.tbl-compact`, `.tbl-zebra`, `.tbl-dense`) · `th.sortable` · `td.num` / `.center` · `.cell-title` / `.cell-sub` / `.cell-mono` · `tr.is-selected` · `.tbl-group-row` · `.tbl-empty` · `.foot` + `.pager` |
| Tabs | `.seg` + `.seg-tab` + `.seg-count` (segmented) · `.tabs` (gạch đỏ dưới) |
| Trạng thái | `.pill` + `.pill-info/violet/warn/success/neutral/danger/brand/outline` (+ `<i>` chấm, `.pill-sm`) · `.plate` (biển số) · `.tag-new` · `.avatar` |
| Chi tiết | `.kv` (grid 2 cột; `.kv-1`, `.kv-3`) với `.k` / `.v` / `.full` · `.stat-card` · `.stat-inline` · `.timeline` |
| Phản hồi | `.alert` + `.alert-error/warn/success/info` · `.empty` · `.skeleton` · `.spinner` · `.progress` |
| Overlay | `.modal-backdrop` · `.modal` + `.modal-head/body/foot` · `.drawer` + `.drawer-head/body/foot` · `.menu` + `.menu-item` |

## Primitive React (`shared/ui`)

```tsx
import { Button, IconButton, Input, Select, Textarea, Checkbox, Field, FormGrid,
         SearchBox, FilterSelect, DateRange,
         PageHeader, Card, CardHeader, CardBody, CardFooter, SubCard, SectionTitle, Toolbar,
         Pill, StatusPill, Plate, NewTag, Avatar, STATUS_TONES,
         SegmentedTabs, UnderlineTabs,
         Alert, Spinner, LoadingBlock, Skeleton, EmptyState, StatCard } from '../../shared/ui';
import { formatMoney, formatDate, formatDateTime, toInputDate, todayInputDate, errorMessage } from '../../shared/format';
```

- `StatusPill status="ACTIVE"` tự map nhãn/tone qua `STATUS_TONES` (thêm key mới ở đó, không hard-code màu trong trang).
- `DataTable` (`shared/components`) nhận `toolbar` (bộ lọc đặt cạnh ô tìm), `selectedKey` (highlight hàng đang mở), `emptyTitle`.
- `DetailPanel` nhận `titleAddon` (pill cạnh tiêu đề), `tabs`, `footer`; nội dung bên trong nên bọc bằng `SubCard` + `<div className="kv">` + `FieldRow`.
- `ModalOverlay` nhận `footer`, `size` (`sm|md|lg|xl`), `subtitle`.
- `FieldRow` / `EditFieldRow` (`shared/components/FieldRow`) dùng **bên trong** `<div className="kv">`; control sửa dùng `EDIT_INPUT_CLASS` / `EDIT_SELECT_CLASS`.

## Khung trang danh sách chuẩn

```tsx
<div className="page page-fill">
  <PageHeader title="Nhân viên" description="…" actions={<Button variant="primary" icon={<Plus />}>Thêm</Button>} />
  <SegmentedTabs … />                      {/* nếu có lọc theo trạng thái */}
  <div className="flex flex-1 min-h-0 gap-4">
    <Card className="flex-1 min-w-0 flex flex-col">
      <DataTable … toolbar={<FilterSelect …/>} selectedKey={selectedId} />
    </Card>
    {panelOpen && isLg && <aside style={{ width: 480 }} className="card flex flex-col"><DetailPanel inlineMode … /></aside>}
  </div>
</div>
```

## Bảng dữ liệu (`ServerDataTable`)

Một component cho mọi bảng danh sách server-side (`shared/components/ServerDataTable.tsx`, hook `shared/hooks/useServerTable.ts`). Giao thức `GET <module>/dt`: `draw`, `start`, `length` (50/100/200), `search[value]`, `order[0][column|dir]` (chỉ số trong `SORTABLE_COLUMNS` của module server), mọi bộ lọc có thể nhiều giá trị dạng CSV (`status=A,B`); trả `{ draw, recordsTotal, recordsFiltered, data, statusStats }`.

```tsx
<div className="page page-fill">
  <PageHeader title="Xe" … />
  <ServerDataTable<Vehicle>
    endpoint="/vehicles/dt" title="Danh sách xe" columns={COLUMNS}
    filters={{ status, type }}                       {/* mảng → CSV, mảng rỗng bị bỏ */}
    rail={{ statuses: ['ACTIVE', 'MAINTENANCE'], value: status, onChange: setStatus }}
    toolbar={<SearchableMultiSelect mode="multi" size="sm" … />}
    actions={<Button variant="primary">Thêm</Button>}
    selectedKey={openId} onRowClick={open} apiRef={tableRef}
  />
</div>
```

- Cột: `{ key, label, sortIndex?, width?, minWidth?, align?, render?, className?, hideBelow?: 'md'|'lg'|'xl' }`. `sortIndex` khớp `SORTABLE_COLUMNS`; cột không có `sortIndex` không sort. Mặc định sort theo cột 0, giảm dần.
- Khác: `groupBy` (nhóm 1 cấp, thu gọn được), `renderBody` (tự vẽ `<tbody>`, ví dụ nhóm 2 cấp), `selectable` + `selected`/`onSelectedChange` (chọn tất cả = các dòng đang hiển thị), `density` (`dense` mặc định ~32px/dòng, `comfortable`), `rowNumber` (STT liên tục qua các trang), `aside` (panel cạnh card trong cùng `.workspace`), `apiRef.current.reload()` để tải lại không remount.
- Bố cục: `.workspace` = rail 228px (`StatusRail`) + card (`.workspace-card`: toolbar · `.tbl-area` > `.tbl-wrap` cuộn, thead dính · `TableFooter`). Trang dùng `.page page-fill` nên bảng cao đúng phần viewport còn lại, chỉ `.tbl-wrap` cuộn.
- Rail: đếm theo `statusStats` (server bỏ qua bộ lọc trạng thái khi đếm); bấm chip bật/tắt từng trạng thái (chọn nhiều), "Tổng" = bỏ lọc. Dưới 1024px rail thành hàng chip cuộn ngang (`.rail-chips`).
- Bảng: `.tbl-zebra` (token `--row-alt`; `is-selected` và hover luôn thắng zebra), `.tbl-dense` (td 6/10px, 13px). Dưới 768px toolbar wrap và cột `hideBelow` bị ẩn (`.hide-md/.hide-lg/.hide-xl`).
- Trạng thái: đang tải giữ dòng cũ + thanh `.tbl-progress`; lỗi → `Alert` trong card kèm "Thử lại"; rỗng → `EmptyState`.
- Footer: "Hiển thị a đến b / n kết quả (lọc từ N)", chọn 50/100/200 dòng, `Pagination showEdges` (Đầu ‹ 1 2 … › Cuối).

## Dropdown (`SearchableMultiSelect`)

`shared/components/SearchableMultiSelect.tsx`: một dropdown cho mọi nơi — `mode="multi"` cho bộ lọc, `mode="single"` cho form (`SearchableSelect` là lớp mỏng trên `mode="single"`, props giữ nguyên).

- Props: `options[{ value, label, sublabel?, disabled? }]`, `value` (`V[]` hoặc `V | ''`), `onChange`, `placeholder`, `searchable` (`true`/`false`/`'auto'` = chỉ hiện ô tìm khi > 8 lựa chọn), `allowClear`, `size`, `error`, `maxVisible` (200, vượt thì nhắc nhập để lọc thêm), `renderOption`.
- Giao diện: trigger dạng `.input` hiện nhãn hoặc "n đã chọn"; menu `.menu.ms-menu` có ô tìm, hàng checkbox (radio ở `single`, chọn xong đóng), "Chọn tất cả (đang lọc)" / "Bỏ chọn" ở `multi`. Lớp `.ms-*`.
- Bàn phím: ↑↓ di chuyển, Space/Enter chọn, Esc đóng (chặn lan lên modal/drawer), Tab đóng. ARIA: `role="listbox"`, `aria-multiselectable`, `aria-activedescendant`.
- Bộ lọc nhiều giá trị truyền thẳng vào `filters` của `ServerDataTable` (mảng → CSV).

## Responsive

- `≥1024px`: sidebar + panel chi tiết inline. `<1024px`: panel thành drawer overlay, sidebar thành menu trượt, có bottom nav.
- `≤640px`: `.page` padding 16, `.form-grid` 1 cột, modal bám đáy.
- Bảng rộng: bọc `.tbl-wrap` hoặc để DataTable tự cuộn ngang; ẩn cột phụ bằng `hidden md:table-cell`.
