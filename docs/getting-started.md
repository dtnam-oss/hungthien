# HT-TMS · Chạy local

Monorepo npm workspaces: `packages/server` (Express 5 + Prisma + PostgreSQL, port 3001) và `packages/web` (React 19 + Vite 8 + Tailwind v4, port 5174, proxy `/api` → 3001).

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ (yêu cầu của Vite 8) và npm.
- PostgreSQL 14+ chạy ở `127.0.0.1:5432` (hoặc chỉnh `DATABASE_URL`).

## Thiết lập lần đầu

```bash
npm install
# packages/server/.env (không commit):
#   DATABASE_URL="postgresql://<user>:<pass>@127.0.0.1:5432/ht_tms"
#   PORT=3001
#   JWT_SECRET="<chuỗi ngẫu nhiên dài>"   # bắt buộc đặt; nếu thiếu, server dùng giá trị dev mặc định và token có thể bị giả mạo
npm run migrate --workspace=packages/server
npm run seed    --workspace=packages/server     # tạo vai trò, quyền và tài khoản quản trị
```

Tài khoản seed: `admin` (mật khẩu mặc định nằm trong `packages/server/src/seed.ts`, đổi ngay sau lần đăng nhập đầu).

## Chạy hằng ngày

```bash
npm run dev:server   # http://localhost:3001  (cần Postgres đang chạy)
npm run dev:web      # http://localhost:5174
```

Kiểm tra server sống: `GET http://localhost:3001/api/auth/me` trả 401 khi chưa đăng nhập.

## Kiểm tra chất lượng (web)

```bash
cd packages/web
npx tsc -p tsconfig.app.json --noEmit   # 0 lỗi
npx oxlint src                          # 0 error
npm run build                           # tsc -b && vite build
```

## Giao diện

- Design system, token, lớp component và quyết định bố cục: [design/ui-design-system.md](design/ui-design-system.md).
- Chế độ sáng/tối: nút trên topbar, lưu `localStorage['ht-theme']`, mặc định theo hệ điều hành.
- Tìm nhanh chức năng: `Ctrl K` (hoặc `⌘ K`).
- Kế hoạch hoàn thiện redesign: `plans/261015-0920-tms-ui-redesign-rollout/`.

## Ghi chú

- Thư mục dự án hiện **chưa có git**; việc khởi tạo nằm trong phase 5 của kế hoạch trên.
- Không commit `packages/server/.env` hay các file `.xlsx` dữ liệu ở thư mục gốc.
