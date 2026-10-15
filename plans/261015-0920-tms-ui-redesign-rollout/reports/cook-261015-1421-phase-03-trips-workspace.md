# Phase 3 — Hoàn thiện workspace Chuyến đi · báo cáo thực thi

Ngày: 2026-10-15 · Plan: `plans/261015-0920-tms-ui-redesign-rollout/` · Phase: `phase-03-trips-workspace.md`

## Đã làm

| Hạng mục | Kết quả |
|---|---|
| Luồng trạng thái | `components/trip-status-flow.ts`: `PRIMARY_TRANSITION` (nút chính drawer), `ALLOWED_TRANSITIONS` + `canTransition` (bulk), `BULK_LIMIT = 50`. Backend chỉ kiểm enum + khóa kỳ nên web giữ luật. |
| Drawer | Nút chính gọi `PATCH /trips/:id/status` (PLANNED→Điều xe→Bắt đầu→Xác nhận đã giao; CANCELLED→Khôi phục). COMPLETED / kỳ khóa: hiện ghi chú thay nút. Lỗi hiện bằng `Alert` trong drawer (`actionError`). Bỏ "In lệnh vận chuyển", "Mở toàn trang" (chưa có backend). Tab Lịch sử: `EmptyState` trung thực (server ghi audit nhưng chưa có API đọc). |
| Bulk bar | Gán xe (modal `AssignVehicleModal`, `PUT /trips/:id {vehicleId, version}`), Đổi trạng thái (menu chỉ liệt kê đích hợp lệ với ít nhất một chuyến; chuyến không hợp lệ được báo "bỏ qua"; confirm khi hủy), Xuất CSV các chuyến đã chọn. Gọi tuần tự, gom kết quả vào `Alert`; chuyến lỗi được giữ lại trong tập chọn. Ẩn bar khi không có quyền sửa. |
| Tập chọn | Luôn là `visibleRows ∩ checked`; đổi trang/bộ lọc/tải lại → bỏ chọn (trừ giữ chuyến lỗi). |
| CSV | `components/export-csv.ts`: BOM UTF-8 + CRLF + escape RFC4180 + chống formula injection (`= + @ \t \r`, `-` không phải số). Không dùng `sep=,` vì Excel có thể bỏ BOM khi gặp nó → ưu tiên giữ dấu tiếng Việt. Nút header "Xuất CSV" xuất các dòng đang hiển thị. |
| Bảng | Bỏ cột ⋮ (không có hành động). |

## Kiểm tra

- `tsc` 0 lỗi · `oxlint` 0 error · `vite build` OK · trang `/trips` chụp với DB thật, console 0 lỗi.
- Tester (API thật, chuyến test tạo rồi xóa): PATCH đủ chuỗi PLANNED→…→COMPLETED, CANCELLED→PLANNED, enum sai → 400; PUT `{vehicleId, version}` 200, `version` cũ → 409; `/vehicles?status=ACTIVE` lọc đúng; `tripsToCsv` 18/18 assertion.
- Code review vòng 1: 1 High (tập chọn lệch trang) + 4 Medium + 4 Low → đã sửa toàn bộ. Vòng 2: 6/8 RESOLVED, 2 PARTIAL → sửa tiếp: menu đổi trạng thái đóng khi tập chọn về 0 (tránh giữ listener Esc), bỏ `sep=,`, chặn thêm `\t`/`\r`. Chưa có unit test cho `tripsToCsv`/`canTransition` (web chưa có test runner).

## Ghi cho backend (ngoài phạm vi web)

- `PATCH /trips/:id/status` thiếu `requirePermission('trip','canEdit')` và không kiểm transition/`version` → ai đăng nhập cũng đổi được trạng thái bất kỳ chuyến nào; web chỉ là lớp UI.
- Chưa có `GET` nhật ký thao tác dù đã ghi `writeAuditLog`.
- `/employees` bị clamp `pageSize` 100 (dropdown tài xế sẽ thiếu khi > 100 NV); `/vehicles` không clamp.

## Câu hỏi chưa chốt

- Nhóm cấp 2 ở bảng đang dùng `Route.name`; có cần "nhóm tuyến" như NAK (cần thêm trường backend)?
- Có muốn lọc chuyến theo "Đơn vị: Nội bộ / NCC" (theo `Vehicle.ownerType`) không? Cần backend hỗ trợ tham số lọc.
- Xuất CSV hiện chỉ gồm trang đang xem (tối đa 100 dòng). Có cần endpoint xuất toàn bộ không?
- Excel tiếng Việt: đã thêm `sep=,`, cần một lần mở thử trên máy thật để xác nhận.
