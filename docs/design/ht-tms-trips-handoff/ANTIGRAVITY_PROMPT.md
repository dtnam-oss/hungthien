# Prompt cho Antigravity

> Chép thư mục `ht-tms-trips-handoff/` vào gốc repo (ví dụ `docs/design/ht-tms-trips-handoff/`), rồi dán prompt dưới đây vào Agent Manager. Nên chạy ở chế độ **Planning** để agent lập Implementation Plan cho bạn duyệt trước khi code.

---

## Prompt 1 — Lập kế hoạch (dán trước)

```
Nhiệm vụ: Thiết kế lại màn hình /trips (Danh sách chuyến) của HT-TMS cho GIỐNG CHÍNH XÁC bản thiết kế mẫu.

Tài liệu thiết kế nằm ở docs/design/ht-tms-trips-handoff/:
- trips-reference.html  → NGUỒN CHUẨN về giao diện và hành vi (HTML/CSS/JS thuần, mở được bằng trình duyệt)
- DESIGN_SPEC.md        → token, bố cục, hành vi, checklist nghiệm thu
- screenshots/*.png     → ảnh đối chiếu ở 1440×900 và 390×844

Trước khi viết code:
1. Đọc hết 3 nguồn trên. Mở trips-reference.html bằng browser để xem và bấm thử.
2. Khảo sát code hiện tại của trang /trips: component, nơi gọi API, kiểu dữ liệu chuyến, enum trạng thái, thư viện UI/CSS đang dùng.
3. Viết Implementation Plan gồm:
   - Cách đưa design tokens (khối :root trong trips-reference.html) vào theme của dự án.
   - Danh sách component sẽ tạo/sửa, ví dụ: TripStatusTabs, AttentionBanner, TripsToolbar, TripsTable, TripRow, TripGroupHeader, BulkActionBar, TripDetailDrawer (InfoTab, CostTab, HistoryTab), StatusPill, TripStepper.
   - Bảng ánh xạ trường dữ liệu thật ↔ trường trong mock (id, date, from, to, customer, custCode, routeCode, plate, driver, driver2, qty, status, carrier, time, eta, revenue, costs).
   - Bảng ánh xạ enum trạng thái backend ↔ plan / dispatched / transit / done / cancel.
   - Những trường thiết kế cần mà API chưa có → liệt kê ra, KHÔNG tự bịa dữ liệu.
Dừng lại chờ tôi duyệt plan.
```

## Prompt 2 — Thực hiện (sau khi duyệt plan)

```
Thực hiện theo plan đã duyệt. Quy tắc bắt buộc:
- Giao diện phải khớp trips-reference.html: đúng màu, cỡ chữ, khoảng cách, bo góc, độ rộng cột, thứ tự thành phần, nhãn tiếng Việt. Không "cải tiến" hay đổi style theo ý mình.
- Chỉ dùng token từ khối :root của trips-reference.html; không thêm mã màu mới.
- Font: Be Vietnam Pro (UI) và JetBrains Mono (mã chuyến, biển số).
- Giữ nguyên logic nghiệp vụ, API và route hiện có; chỉ thay lớp giao diện và thêm các tương tác UI trong DESIGN_SPEC.md mục 3.
- Không đưa mảng TRIPS mock vào code production; dùng dữ liệu thật.
- Tuân thủ mục Accessibility trong DESIGN_SPEC.md.

Sau khi code xong, tự kiểm tra bằng browser:
1. Mở /trips ở 1440×900, chụp ảnh và đặt cạnh screenshots/01-list-with-drawer.png.
2. Lặp lại cho trạng thái chọn nhiều (02), drawer tab Lịch sử (03), mobile 390×844 (04).
3. Liệt kê mọi khác biệt về giao diện (bỏ qua khác biệt do dữ liệu) và sửa cho đến khi khớp.
4. Đi qua checklist ở DESIGN_SPEC.md mục 6 và báo cáo từng mục: đạt / chưa đạt.
```

## Prompt sửa lỗi lệch thiết kế (dùng khi cần)

```
Phần <tên khu vực, ví dụ: header nhóm ngày> chưa khớp trips-reference.html.
Hãy mở cả hai trong browser ở cùng viewport, so sánh computed style (font-size, font-weight, color, padding, gap, border, border-radius, height) của phần tử tương ứng, rồi sửa cho khớp. Báo lại các giá trị đã thay đổi.
```

---

### Mẹo để Antigravity làm đúng
- **Làm từng phần:** nếu kết quả lệch nhiều, chia nhỏ: (1) tokens + font → (2) bảng → (3) drawer → (4) bulk bar + responsive.
- **Luôn yêu cầu so ảnh chụp:** agent của Antigravity điều khiển được browser, nên câu "chụp và so với screenshots/…" là cách hiệu quả nhất để nó tự phát hiện sai lệch.
- **Thêm quy tắc cố định:** đưa 3 gạch đầu dòng đầu tiên của Prompt 2 vào file quy tắc của workspace (Antigravity → Customizations → Rules) để mọi lần chạy sau đều tuân theo.
- **Duyệt từng Artifact:** comment trực tiếp lên Implementation Plan / Walkthrough mà agent tạo ra để chỉnh hướng trước khi nó code tiếp.
