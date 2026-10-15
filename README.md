# HT-TMS — Hệ thống quản lý vận tải Hưng Thiện

Monorepo npm workspaces:

| Gói | Công nghệ | Cổng |
|---|---|---|
| `packages/server` | Express 5 · Prisma · PostgreSQL · vitest | 3001 |
| `packages/web` | React 19 · Vite 8 · Tailwind v4 · react-router 7 | 5174 (proxy `/api` → 3001) |

## Chạy nhanh

```bash
npm install
# packages/server/.env: DATABASE_URL, PORT=3001, JWT_SECRET (bắt buộc)
npm run migrate --workspace=packages/server
npm run seed    --workspace=packages/server
npm run dev:server
npm run dev:web      # http://localhost:5174
```

Hướng dẫn đầy đủ (Postgres, tài khoản seed, kiểm tra chất lượng): [docs/getting-started.md](docs/getting-started.md).

## Giao diện

Design system v3 (token, lớp component, dark mode, quyết định bố cục theo mẫu NAK TMS): [docs/design/ui-design-system.md](docs/design/ui-design-system.md). Ảnh chuẩn: `docs/design/screenshots/`.

- Chuyển sáng/tối: nút trên topbar (lưu `localStorage['ht-theme']`).
- Tìm nhanh chức năng: `Ctrl K`.

## Kiểm tra

```bash
npm run test:server                                   # vitest
cd packages/web && npx tsc -p tsconfig.app.json --noEmit && npx oxlint src && npm run build
```

## Kế hoạch & nhật ký

- Plan redesign giao diện: `plans/261015-0920-tms-ui-redesign-rollout/` (báo cáo từng phase trong `reports/`).
- Journal: `plans/journals/`.

## Lưu ý

- Không commit `packages/server/.env`, các file `.xlsx`/`.lnk` ở thư mục gốc (đã nằm trong `.gitignore`).
- `PATCH /api/trips/:id/status` hiện chưa kiểm quyền và transition ở server; web giữ luật chuyển trạng thái (`packages/web/src/modules/trip/components/trip-status-flow.ts`).
