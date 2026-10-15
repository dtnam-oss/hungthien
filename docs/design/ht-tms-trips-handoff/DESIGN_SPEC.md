# HT-TMS – Màn hình "Danh sách chuyến" · Design Spec

**Nguồn chuẩn (source of truth):** `trips-reference.html` — mở trực tiếp bằng trình duyệt.
**Ảnh đối chiếu:** `screenshots/` (1440×900 và 390×844).
Khi spec và file HTML mâu thuẫn → **theo file HTML**.

---

## 1. Design tokens

Tất cả màu/bo góc/đổ bóng nằm trong `:root` của `trips-reference.html`. Đưa nguyên khối này vào theme của app (CSS variables, hoặc `tailwind.config` → `theme.extend`). **Không tự đặt mã màu mới.**

| Nhóm | Token | Giá trị |
|---|---|---|
| Font | sans / mono | `Be Vietnam Pro` 400/500/600/700 · `JetBrains Mono` 500/600 |
| Nền | bg / surface / surface-2 / surface-3 | `#F6F6F7` / `#FFFFFF` / `#FAFAFB` / `#F2F2F4` |
| Viền | border / border-soft / border-input | `#E7E7EA` / `#F0F0F2` / `#E0E0E4` |
| Chữ | text / muted / muted-2 | `#18181B` / `#5F6068` / `#6B6C75` |
| Brand | brand / hover / soft | `#D92D20` / `#B42318` / `#FEF3F2` |
| Cảnh báo | bg / border / text / accent | `#FFFAEB` / `#FEDF89` / `#7A2E0E` / `#DC6803` |
| Bo góc | sm / md / lg / xl / 2xl | 6 / 8 / 10 / 12 / 14 px |

**Trạng thái chuyến** (pill = nền / chữ / chấm):

| key | Nhãn | Nền | Chữ | Chấm |
|---|---|---|---|---|
| `plan` | Kế hoạch | `#EEF0FF` | `#3538CD` | `#6172F3` |
| `dispatched` | Đã điều xe | `#F4EFFF` | `#5B21B6` | `#8B5CF6` |
| `transit` | Đang chạy | `#FFF4E0` | `#93370D` | `#F79009` |
| `done` | Hoàn thành | `#E8F5EC` | `#16683A` | `#22A559` |
| `cancel` | Đã hủy | `#F1F1F3` | `#52525B` | `#A1A1AA` |

Map key này sang enum trạng thái thật của backend (ví dụ `KE_HOACH` → `plan`).

**Typography:** H1 26/700 (letter-spacing −0.02em) · body 14/400 · bảng: tên tuyến 14/600, phụ 12/400 · nhãn section 11/600 uppercase, tracking 0.06em · mã chuyến & biển số luôn dùng font mono.

## 2. Bố cục

```
┌ Sidebar 252px ┬──────────── Topbar 64px ────────────────────┐
│               │ Page header (H1 + Xuất Excel + Tạo chuyến)  │
│               │ Tabs trạng thái (segmented, có số đếm)      │
│               │ Banner cảnh báo (nếu có)                    │
│               │ ┌ Card ────────────────────────────────────┐│
│               │ │ Toolbar: search · ngày · KH · TX · Nhà xe ││
│               │ │          · +Bộ lọc ········ [Theo ngày|DS]││
│               │ │ Bảng (group theo ngày)                    ││
│               │ │ Footer: Hiển thị x/y · phân trang         ││
│               │ └───────────────────────────────────────────┘│
│               │                       ┌ Drawer 460px (overlay)┐
└───────────────┴───────────────────────┴───────────────────────┘
```

- Content padding 24/28px, gap giữa các khối 16px, max-width 1600px.
- **Drawer là overlay** (position absolute, top = 64px, phải = 0), không đẩy bảng.
- Cột bảng: `48px | minmax(240,1.6fr) | minmax(170,1.2fr) | minmax(170,1.1fr) | 90px | 150px | minmax(170,1.1fr) | 52px`; bảng `min-width: 1080px`, cuộn ngang khi hẹp.

## 3. Thành phần & hành vi

### Tabs trạng thái
- Tất cả · Kế hoạch · Đã điều xe · Đang chạy · Hoàn thành · Đã hủy, mỗi tab có badge số đếm.
- Số đếm tính trên kết quả **sau khi áp ô tìm kiếm**, trước khi lọc trạng thái.
- Tab đang chọn: nền trắng + shadow, badge đỏ brand.

### Banner "cần xử lý"
- Điều kiện chuyến cần xử lý: `status ∈ {plan, dispatched}` VÀ thiếu một trong: xe, tài xế, nhà xe.
- Ẩn khi = 0. Nút "Lọc các chuyến này" ⇄ "Hiện tất cả" bật/tắt bộ lọc.

### Bảng
- Chế độ **Theo ngày**: header nhóm = "Hôm nay/Ngày mai/…" + ngày đầy đủ + số chuyến + tóm tắt bên phải "x đang chạy · y tấn" (không tính chuyến hủy). Bấm header → thu/mở nhóm.
- Chế độ **Danh sách**: không có header nhóm.
- Mỗi dòng (min-height 64px):
  1. Checkbox
  2. **Tuyến** `Điểm đi → Điểm đến` (đậm) + dòng phụ `mã chuyến · Nhận HH:mm`. Vùng này là `<button>` mở drawer.
  3. Khách hàng (cắt ellipsis) + mã KH (mono)
  4. Biển số dạng "biển" (viền, mono) + tên tài xế; thiếu → "Chưa gán xe" (cam) / "Chưa gán tài xế"
  5. SL căn phải, tabular-nums, đơn vị "tấn" màu muted
  6. Pill trạng thái
  7. Nhà xe; thiếu và chuyến chưa chạy → nút viền đứt "+ Gán nhà xe"; còn lại → "—"
  8. Nút ⋮
- Hover dòng: `surface-2`. Dòng đang mở drawer: `brand-soft`.
- Trạng thái rỗng: "Không có chuyến phù hợp" + gợi ý xoá lọc.

### Chọn nhiều (bulk)
- Checkbox header = chọn/bỏ tất cả các dòng đang hiển thị.
- Có ≥1 dòng chọn → thanh nổi đen ở giữa đáy: "Đã chọn n chuyến" · Gán xe / nhà xe · Đổi trạng thái · Xuất Excel · ✕.

### Drawer chi tiết
- Header: mã chuyến (mono 18) + pill · tuyến (16/600) · "Khách hàng · Thứ, ngày" · nút Sửa / Mở toàn trang / Đóng.
- **Stepper 5 bước**: Kế hoạch → Điều xe → Đang chạy → Đã giao → Hoàn thành. Bước đã qua = brand, bước hiện tại = `#F97066` + nhãn đậm, chưa tới = xám. Chuyến hủy: tất cả xám.
- Tabs: **Thông tin · Chi phí · Lịch sử** (gạch chân đỏ 2px).
  - Thông tin: cảnh báo thiếu gán (nếu có, nút "Gán ngay") → Lộ trình (timeline nhận/giao + giờ) → 3 ô Doanh thu / Chi phí / Lợi nhuận (lợi nhuận xanh) → Tài xế & phương tiện (Xe, Nhà xe, TX chính, TX phụ) → Thông tin chuyến (KH, Loại, SL, Đơn giá, Ngày chạy, Kỳ kế toán).
  - Chi phí: danh sách khoản + Tổng + nút viền đứt "+ Thêm khoản chi phí".
  - Lịch sử: timeline, mới nhất ở trên.
- Footer cố định: [🗑] · "In lệnh vận chuyển" · **nút chính đổi theo trạng thái**:
  `plan` Điều xe · `dispatched` Bắt đầu chuyến · `transit` Xác nhận đã giao · `done` Xem chứng từ · `cancel` Khôi phục chuyến.
- Phím `Esc` đóng drawer.

### Responsive (≤ 960px)
- Ẩn sidebar và ô tìm kiếm toàn cục; drawer full-width; bảng cuộn ngang.

## 4. Định dạng
- Tiền: `toLocaleString('vi-VN') + ' đ'` → `5.000.000 đ`.
- Ngày: `dd/MM/yyyy`; giờ `HH:mm`; kỳ kế toán `T10/2026`.
- Biển số giữ nguyên định dạng `30H-111.11`.

## 5. Accessibility (bắt buộc)
- Mọi thứ bấm được là `<button>`/`<a>`, không gắn onClick vào `<div>`.
- Nút chỉ có icon phải có `aria-label`.
- Tabs dùng `role="tablist"` / `role="tab"` + `aria-selected`; nhóm có `aria-expanded`; toggle view có `aria-pressed`.

## 6. Checklist nghiệm thu
- [ ] So ảnh chụp app với `screenshots/01…04` ở cùng kích thước viewport — khác biệt chỉ do dữ liệu thật.
- [ ] Dùng đúng token, không còn mã màu hard-code lạ.
- [ ] Font Be Vietnam Pro hiển thị đúng dấu tiếng Việt.
- [ ] Đổi tab, tìm kiếm, banner lọc, thu/mở nhóm, đổi view hoạt động.
- [ ] Bulk bar hiện/ẩn đúng; chọn tất cả chỉ áp dụng dòng đang hiển thị.
- [ ] Drawer: 3 tab, stepper, nút chính theo trạng thái, Esc để đóng.
- [ ] Ở 390px không bị cuộn ngang toàn trang.
