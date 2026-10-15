# UI redesign: roles + create trip (design system v3)
Files: role/RolesPermissionsPage.tsx, role/AssignRolesPage.tsx, trip/CreateTripModal.tsx.
- Roles: page-fill + PageHeader, role list Card with menu-item is-active + IconButtons, matrix tbl-compact with checkboxes (aria-label), sticky head, tbl-group-row, save via PageHeader Button; role modal -> ModalOverlay footer. Removed unused vars (Check, gIdx). alert()/confirm() behavior kept.
- Assign: two Cards, SearchBox, tbl-hover list with Avatar/Pill (role tone map), role table with Gán/Đang dùng buttons, success Alert replaces fixed toast.
- CreateTrip: ModalOverlay size=lg + footer, FormGrid/Field, Alert error; own portal/Escape handler removed (ModalOverlay provides). Validation/payload unchanged. No money preview exists in this modal.
Verify: tsc clean for these files; oxlint 0 errors (only pre-existing react-hooks warnings); palette grep empty.
