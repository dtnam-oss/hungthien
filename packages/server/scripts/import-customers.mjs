/**
 * import-customers.mjs — Import customers from Danh_sach_khach_hang.xlsx
 * Usage: node scripts/import-customers.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FILE = 'C:/Users/Tan/Desktop/HT/Danh_sach_khach_hang.xlsx';

async function main() {
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(ws);

  console.log(`Read ${rows.length} rows from Excel`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const code = String(row['Mã khách hàng'] || '').trim();
    const name = String(row['Tên khách hàng'] || '').trim();
    if (!code || !name) { skipped++; continue; }

    const taxCode = String(row['Mã số thuế'] || '').trim() || null;
    const address = String(row['Địa chỉ'] || '').trim() || null;
    const contactPerson = String(row['Người mua hàng'] || '').trim() || null;
    const email = String(row['Email'] || '').trim() || null;
    const phone = String(row['Số điện thoại'] || '').trim() || null;
    const statusRaw = String(row['Trạng thái'] || '').trim();
    const status = statusRaw === 'Đang sử dụng' ? 'ACTIVE' : (statusRaw === 'Ngừng sử dụng' ? 'INACTIVE' : 'ACTIVE');

    const data = { name, taxCode, address, contactPerson, email, phone, status };

    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) {
      await prisma.customer.update({ where: { code }, data: { ...data, updatedAt: new Date() } });
      updated++;
    } else {
      await prisma.customer.create({ data: { code, ...data } });
      created++;
    }
  }

  const total = await prisma.customer.count();
  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`Total customers in DB: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
