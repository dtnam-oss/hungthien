# Phase 5 — Review, tài liệu, bàn giao · báo cáo thực thi

Ngày: 2026-10-15 · Plan: `plans/261015-0920-tms-ui-redesign-rollout/` · Phase: `phase-05-review-handoff.md`

## Code review toàn bộ `packages/web/src` (codebase scan)

20 finding (5 P1, 12 P2, 3 P3). Đã sửa:

| # | Mức | Lỗi | Sửa |
|---|---|---|---|
| 1 | P1 | Lưu ma trận quyền xóa sạch quyền `payroll` (server xóa hết rồi ghi lại đúng những gì nhận) | Thêm nhóm "Bảng lương" vào ma trận; giữ nguyên mọi module không hiển thị khi lưu |
| 2 | P1 | Sai mật khẩu → interceptor 401 reload về `/login`, không hiện lỗi | Bỏ qua redirect với `/auth/login` |
| 3 | P1 | Tài xế bị chuyển tới `/driver` nhưng route lồng trong Layout không render → trang trắng | `/driver` thành route độc lập trong `ProtectedRoute` |
| 4 | P1 | Tạo giá NCC gửi id nhà cung cấp vào `customerId` (schema chỉ liên kết Customer) | Chặn tạo ở chế độ SUPPLIER với thông báo rõ; cần backend thêm cột |
| 5 | P1 | Chi tiền / duyệt / tính lại kỳ lương không confirm (chi tiền không mở lại được) | `confirm()` cho 3 hành động |
| 6 | P2 | Đổi bộ lọc ở trang 3 → yêu cầu trang trống | `useServerTable` reset `start` khi filter đổi |
| 7 | P2 | Mỗi lần tải trang gửi 2 request `/dt` | Effect search no-op khi giá trị không đổi |
| 12 | P2 | Auto-fill tài xế kế hoạch đọc `res.data.primaryDriver` (sai shape) | `res.data.data` |
| 11 | P2 | `catch {}` nuốt lỗi 403/409/500 ở Kế hoạch | `alert(errorMessage)` |
| 13 | P2 | `canDelete` tính từ `canEdit` (NV, Xe) | dùng `canDelete`; nút Thêm kiểm định gated `canEdit`; lỗi xóa xe hiện lý do thật |
| 14 | P2 | Dropdown tài xế lọc client sau khi server clamp 100 | `/employees?isDriver=true` |
| 15 | P2 | Xóa chi phí không confirm; select trạng thái trong form sửa bỏ qua luật transition | confirm; select chỉ còn đích hợp lệ |
| — | — | Server `npm run build` lỗi vì `tests/**` trong `include` với `rootDir: src` | `tsconfig.json` server chỉ include `src` |

Chưa sửa (ticket):

| # | Mức | Nội dung |
|---|---|---|
| 8 | P2 | DataTable: đổi filter fetch 2 lần không abort; lỗi API chỉ ra console → cần AbortController + error state |
| 9 | P2 | Trang NV/Giá/Xe/NCC reload bằng `key={reloadKey}` → mất trang/sort/search sau khi lưu; cần prop reload |
| 10 | P2 | Kế hoạch: `search` trong deps `fetchList` → fetch mỗi phím + sau debounce |
| 16 | P2 | Nav/ma trận dùng module `customer`, server route khách hàng kiểm `pricing` → quyết định ở backend |
| 17 | P2 | Tab Thưởng/phạt gọi 1 GET/nhân viên → cần endpoint theo kỳ |
| 18 | P3 | Panel chi tiết chưa hủy response cũ khi bấm nhanh (trừ NCC) |
| 19 | P3 | `span role=button` trong nút xóa chọn của SearchableSelect; `th` sortable của DataTable chưa bàn phím; hàng Kế hoạch/Bảng lương chưa `tabIndex` |
| 20 | P3 | Modal Tạo chuyến/Kế hoạch gọi `pageSize=500` (server clamp 100) cho KH/tuyến/xe |
| — | — | 27 warning oxlint (`set-state-in-effect` 23, …) — người dùng chọn để ticket riêng |
| — | backend | 32 lỗi `tsc` server có sẵn: 28 × `userId: number \| undefined` vào `writeAuditLog({userId: number \| null})`, 1 × action `'UPSERT'` ngoài union, 1 × `Date` ép `string` (pricing.service:139), 2 × JSON `undefined` (audit.ts:37-38). Sửa tập trung ở `shared/audit.ts` (nhận `number \| undefined`, `?? null`, thêm `UPSERT`) |
| — | backend | `PATCH /trips/:id/status` thiếu `requirePermission` + transition; chưa có GET nhật ký |

## Kiểm tra

- Web: `tsc` 0 · `oxlint` 0 error / 27 warning · `vite build` OK (chunk lớn nhất 352 kB, gzip 112 kB).
- Server: vitest 41/41 pass · `tsc` 32 lỗi có sẵn (xem trên).
- Grep màu Tailwind cứng: 0 · `console.log`: 0.

## Tài liệu & dọn dẹp

- `README.md` gốc (người dùng duyệt), `docs/getting-started.md` (có `JWT_SECRET`), design system cập nhật.
- `.gitignore`: thêm `/*.xlsx`, `/*.lnk`, `backups/`, `.env.*`.
- Backup DB `backups/ht_tms-20261015.sql` (123 KB, ngoài git) rồi xóa nhân viên test `ZZTEST-1792048074` (0 user tham chiếu). Xóa bản sao `src-before-redesign` trong scratchpad.

## Git

Người dùng chọn: `git init` → commit baseline → `main` → push `https://github.com/dtnam-oss/hungthien.git`. Kết quả ghi ở cuối phiên (phụ thuộc đăng nhập GitHub trên máy).

## Deploy (câu hỏi người dùng)

- Web lên Vercel: không cần env var (API gọi `/api` tương đối); cần `vercel.json` rewrite `/api/*` → backend và SPA fallback; Root Directory `packages/web`, Output `dist`. Tùy chọn: đổi `api.ts` đọc `VITE_API_URL`.
- Backend: không phù hợp Vercel serverless nguyên trạng; deploy Railway/Render/Fly với `DATABASE_URL`, `JWT_SECRET` (bắt buộc), Postgres hosted.

## Câu hỏi chưa chốt

- Có sửa 32 lỗi type backend để `npm run build` server chạy (cần cho deploy)? Ước 1–2 giờ, chủ yếu `shared/audit.ts`.
- Module quyền khách hàng: đổi server sang `customer` hay nav sang `pricing`?
- Có tạo `vercel.json` + `VITE_API_URL` cho web không?
