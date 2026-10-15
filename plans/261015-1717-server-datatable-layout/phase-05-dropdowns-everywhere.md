---
phase: 5
title: "Dropdown chung cho form/modal còn lại"
status: completed
priority: P2
effort: "0.5d"
dependencies: [2]
---

# Phase 5: Dropdown chung cho toàn bộ TMS (form, modal, panel sửa)

## Overview
Thay mọi `<Select>` danh sách và `<SearchableSelect>` còn lại (17 + 13 chỗ, ngoài các trang danh sách đã làm ở phase 3–4) bằng `SearchableMultiSelect` chế độ `single` (form) hoặc `multi` (lọc), để toàn bộ dropdown trong TMS có cùng trải nghiệm: tìm nhanh + danh sách checkbox/radio như ảnh mẫu.

## Requirements
- Functional:
  - Form/modal chọn **một** giá trị (KH, tuyến, xe, tài xế, loại xe, nhiên liệu, trạng thái, vai trò, khu vực…) → `mode="single"`: tìm nhanh, chọn là đóng, hiện nhãn; `allowClear` theo field.
  - Select enum ngắn (≤ 5 option, ví dụ trạng thái trong panel sửa) **vẫn** dùng component chung để nhất quán, không ô tìm khi `options.length ≤ 8` (`searchable="auto"`).
  - Giữ nguyên giá trị/payload gửi API (không đổi contract); `error` state và `disabled` giữ.
  - `SearchableSelect` cũ xóa sau khi 0 usage; `Select` native chỉ còn cho page size footer và năm (số).
- Non-functional: tsc/lint xanh; bàn phím/ARIA như phase 2.

## Architecture
`SearchableMultiSelect` props: `mode`, `options[{value,label,sublabel?,disabled?}]`, `value: V | V[]`, `onChange`, `placeholder`, `searchable: boolean | 'auto'`, `allowClear`, `size`, `error`, `renderOption?`. Wrapper `SearchableSelect` (phase 2) được thay bằng import trực tiếp rồi xóa.

## Related Code Files
- Modify (theo grep `<SearchableSelect|<Select`): `modules/trip/CreateTripModal.tsx`, `modules/trip/components/AssignVehicleModal.tsx`, `TripInfoTab.tsx`, `modules/trip-plan/TripPlanListPage.tsx` (modal tạo/generate + panel sửa), `modules/vehicle/VehicleListPage.tsx` (panel sửa, modal tạo, kiểm định), `modules/employee/EmployeeListPage.tsx`, `modules/pricing/PricingListPage.tsx` (modal tạo), `modules/supplier/SupplierListPage.tsx`, `modules/customer/CustomerListPage.tsx`, `modules/payroll/PayrollPage.tsx` (modal tạo kỳ, thêm dòng), `modules/role/AssignRolesPage.tsx`, `modules/trip/DashboardPage.tsx` (nếu có select)
- Delete: `shared/components/SearchableSelect.tsx`
- Modify: `shared/ui/FormControls.tsx` (giữ `Select` native cho số/trang), `docs/design/ui-design-system.md`

## Implementation Steps
1. Grep toàn bộ `<SearchableSelect` và `<Select` trong `src/modules`; lập bảng file → chế độ (single/multi) → `searchable`.
2. Thay từng file, giữ `value`/`onChange` kiểu hiện tại (wrap `String(v)` nếu state là string).
3. Xóa `SearchableSelect.tsx`; cập nhật barrel/docs.
4. Kiểm tay: modal Tạo chuyến (KH → tuyến → xe → tài xế), modal Tạo xe, panel sửa NV; dark mode.
5. Commit `refactor(web): dropdown chung tìm nhanh cho toàn bộ form`.

## Success Criteria
- [x] grep `SearchableSelect\b` = 0; `<Select` chỉ còn ở footer page-size và năm.
- [x] Mọi dropdown có ô tìm (khi > 8 option), bàn phím, ARIA; payload API không đổi. _(xác minh bằng code review 2 vòng; chưa đo network trên modal thật)_
- [x] `tsc`, `oxlint` 0 error, build xanh.

## Risk Assessment
- **Form dựa vào `<select>` native trong `<form>` (Enter submit, required)** → component dùng input ẩn `required` hoặc kiểm ở `handleSubmit` (đã có ở các modal); tín hiệu: validate bị bỏ qua → thêm kiểm.
- **Option lớn trong modal (KH 46, xe 67, tuyến n)** → `maxVisible` 200 đủ; không ảo hóa.
