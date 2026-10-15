# Phase 6 — Xác minh, review, docs, bàn giao · báo cáo tổng hợp plan

Ngày: 2026-10-15 · Plan: `plans/261015-1717-server-datatable-layout/` · Chế độ: chạy liên tục 6 phase theo yêu cầu người dùng, không dừng hỏi.

## Kết quả theo tiêu chí nghiệm thu của plan

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| 8 endpoint `/dt` cùng giao thức, vitest sort-index + lọc nhiều giá trị | ✅ | `cook-phase-01-backend-dt.md`; server vitest 106/106; smoke 8 endpoint 200 |
| 9 trang dùng `ServerDataTable`; xóa `DataTable` cũ, bảng tự viết, `FilterSelect`, `SearchableSelect` | ✅ | grep 0 usage; `cook-phase-03*/04*` |
| Bảng cao theo viewport 1280/1440/1920; 390 không cuộn ngang; rail thành chip < 1024 | ✅ (sau sửa) | tester phase 6: card bottom = vh−40, `scrollHeight = clientHeight`; 390 `/trips` lỗi bảng 22px → sửa CSS (dưới 1024 trang cuộn, bảng min 240px/max 70vh) → đo lại 267px, 4 hàng hiện |
| 1 request `/dt` mỗi thao tác (mount/tìm/rail/kích thước trang/trang/sort) × 9 trang | ✅ trừ 1 ô | Nhân viên mount = 3 (fetch phòng ban ×2 dưới StrictMode + bảng); prod build chưa đo |
| Rail đếm = `statusStats`; footer "lọc từ tổng", 50/100/200, Đầu/Cuối | ✅ | 252 chuyến test: "1 đến 100 / 252", 50 → 6 trang, rail → "(lọc từ 252)" |
| Mọi dropdown dùng component chung (multi khi lọc, single khi form) | ✅ | chỉ còn `<select>` native ở page-size footer |
| `tsc`/`oxlint` 0 error/`vite build` web; `tsc`/test/build server | ✅ | web 0/0/OK; server 0/106/OK |
| Ảnh đối chiếu Xe/Chuyến đi light+dark trong docs | ✅ | `docs/design/screenshots/{vehicles,trips}-{light,dark}.png` (1440) |

## Review & sửa

- Review nền (phase 1+2): 0 P1, 5 P2 → sửa: web không gửi sort khi chưa chọn (server dùng mặc định module), lùi trang khi vượt tổng, `parseMulti` giới hạn 100 + Set, int32 guard, `stripHiddenColumns` cho `/trips/dt` + `/pricing/dt`, `/employees/dt` bỏ cột ẩn khỏi tìm/sort/lọc, `/trip-plans/dt` nhận `status=ACTIVE,INACTIVE`, `/trips/dt` chỉ nhận ngày `yyyy-mm-dd`.
- Review trang (phase 3–5): 0 P1, 2 P2 → sửa: select-all không giữ hàng ẩn bởi bộ lọc "cần xử lý"; loại chi phí/loại chuyến không cho bỏ chọn. P3 đã sửa: số thứ tự theo thứ tự hiển thị khi nhóm, Bảng lương mặc định năm hiện tại, nút bật/tắt kế hoạch gate `canEdit`.

## Commit (nhánh `main`)

`733dac0` server /dt · `3da391d` web nền · `6b41053` sửa review nền · `8e94c67` trang danh mục · `a22668e` Chuyến đi/Kế hoạch/Kỳ lương + dropdown · `d9b04fb` sửa review trang · (commit cuối: CSS mobile, docs, plan).

## Chưa làm / nợ ghi nhận

- Nhân viên: danh sách phòng ban lấy bằng `/employees/dt?length=500` (không có endpoint distinct) → 1–2 request thừa; đề xuất endpoint `GET /employees/departments`.
- Option bộ lọc KH/tuyến/tài xế cắt ở 100 (server clamp `pageSize`), trừ xe (1000).
- `customerStats` ở `/trips/dt` vẫn tính dù web không dùng (1 groupBy thừa).
- Nhóm (hãng/KH/ngày) chỉ trong trang hiện tại; nhóm có thể bị chia khi sort không theo cột nhóm.
- Thanh bulk chưa cảnh báo giới hạn 50 ngay khi chọn, chỉ khi bấm hành động.
- Chưa bấm tay modal/dropdown trên trình duyệt thật (headless không click); chưa test màn hình đọc.
- `--faint`/placeholder đạt 3:1 (chữ phụ), không đạt 4.5:1 nếu dùng cho chữ nhỏ quan trọng.
- 22 warning oxlint `set-state-in-effect` có sẵn (ticket riêng).

## Câu hỏi chưa chốt

- Trang Giá NCC: bộ lọc "Nhà cung cấp" thực tế liệt kê khách hàng vì `PricingRow` chỉ có `customerId` — cần quyết định schema ở backend.
- Có cần endpoint distinct phòng ban và nâng clamp `pageSize` cho dropdown không?
