---
title: "Redesign HT-TMS: phase 2 dọn dẹp & nhất quán"
date: 2026-10-15
summary: "Xóa 5 trang chết, gom map trạng thái về STATUS_TONES, bỏ KV/KVItem, thêm docs/getting-started.md; tsc 0, oxlint 0 error, build OK"
---

# Redesign HT-TMS: phase 2 dọn dẹp & nhất quán

## What happened
- Plan `plans/261015-0920-tms-ui-redesign-rollout/`, phase 2 (cleanup) chạy ngay vì không cần DB; phase 1 (xác minh dữ liệu thật) vẫn chờ Postgres.
- Xóa 5 file `*FormPage.tsx` (employee, supplier, pricing, trip, vehicle): không có route, không ai import, còn style Tailwind cũ.
- `STATUS_TONES` (`shared/ui/Pill.tsx`) thêm CONFIRMED, PASS/FAIL/CONDITIONAL; PAID → "Đã chi". Payroll bỏ `PERIOD_STATUS`; Vehicle bỏ nhánh DISPOSED cục bộ và `RESULT_TONES`. Các `STATUS_LABELS` theo module giữ lại chỉ để truyền `label`.
- Bỏ `KV`/`KVItem` (0 usage). Docs: mục "Trạng thái & màu" + `docs/getting-started.md`.
- Kiểm tra: tsc 0 lỗi, oxlint 0 error / 24 warning (từ 29), vite build OK, grep màu cứng = 0.
- Code review: không regression; sửa luôn JWT_SECRET + phiên bản Node trong docs, nhãn INACTIVE không nhất quán ở Supplier, bỏ APPROVED trùng nhãn CONFIRMED.

## Decision
- Không tạo README gốc trong phase này (rule phiên chỉ cho markdown ở plans/docs); để phase 5 hỏi người dùng.
- 24 warning `set-state-in-effect`/… tồn tại từ trước → ticket riêng, không chặn.
- Xóa backup `src-before-redesign` hoãn tới sau phase 1.

## Next steps
- Phase 1: bật Postgres, duyệt 20 route với dữ liệu thật.
- Phase 3: nối `PATCH /trips/:id/status` cho nút hành động + bulk; ẩn nút chưa có endpoint.
- Lưu ý ngoài phạm vi: `packages/server/src/setup-db.ts` có fallback credential DB hard-code — nên bỏ.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
