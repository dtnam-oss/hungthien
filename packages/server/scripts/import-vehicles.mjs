/**
 * Import vehicles from Excel "Danh Sách Xe HT-NCC.xlsx"
 * Idempotent: upserts by plateNumber, safe to run multiple times.
 *
 * Usage: node scripts/import-vehicles.mjs
 */
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EXCEL_PATH = 'C:/Users/Tan/Desktop/HT/Danh Sách Xe  HT-NCC.xlsx';

/** Convert Excel serial date → JS Date */
function excelDate(v) {
  if (!v || typeof v === 'string') return null;
  const d = new Date(Math.round((v - 25569) * 86400 * 1000));
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);

  // ── Sheet 1: Danhsachxe ────────────────────────────────────
  const wsVehicles = wb.Sheets['Danhsachxe'];
  const vehicleRows = XLSX.utils.sheet_to_json(wsVehicles, { header: 1, defval: '' }).slice(1);

  // ── Sheet 2: GPS tracking ──────────────────────────────────
  const wsGps = wb.Sheets['Theo dõi GPS'];
  const gpsRows = XLSX.utils.sheet_to_json(wsGps, { header: 1, defval: '' }).slice(2); // skip 2 header rows
  const gpsMap = new Map();
  for (const r of gpsRows) {
    const plate = String(r[1] || '').trim();
    const expiry = excelDate(r[2]);
    if (plate && expiry) gpsMap.set(plate, expiry);
  }

  // ── Ensure Supplier "NCC-HT" exists ────────────────────────
  let nccSupplier = await prisma.supplier.findUnique({ where: { code: 'NCC-HT' } });
  if (!nccSupplier) {
    nccSupplier = await prisma.supplier.create({
      data: { code: 'NCC-HT', name: 'NCC Hưng Thiện', status: 'ACTIVE' },
    });
    console.log(`✅ Created Supplier: NCC-HT (id=${nccSupplier.id})`);
  }

  // ── Also ensure "Hưng Thiện" supplier exists for xe nhà ──
  let htSupplier = await prisma.supplier.findUnique({ where: { code: 'HT' } });
  if (!htSupplier) {
    htSupplier = await prisma.supplier.create({
      data: { code: 'HT', name: 'Hưng Thiện', status: 'ACTIVE' },
    });
    console.log(`✅ Created Supplier: HT (id=${htSupplier.id})`);
  }

  let created = 0, updated = 0, skipped = 0;

  for (const r of vehicleRows) {
    const plate = String(r[2] || '').trim();
    if (!plate) { skipped++; continue; }

    const supplier = String(r[1] || '').trim();
    const isInternal = supplier.includes('Hưng Thiện');
    const supplierId = isInternal ? htSupplier.id : nccSupplier.id;

    // Map vehicle type
    const typeRaw = String(r[3] || '').trim();
    const typeMap = { 'Thùng Lạnh': 'REFRIGERATED', 'Thùng Kín': 'ENCLOSED', 'Thùng Bạt': 'FLATBED' };
    const vehicleType = typeMap[typeRaw] || typeRaw || null;

    const data = {
      type: vehicleType,
      brand: String(r[4] || '').trim() || null,
      yearMfg: r[7] ? Number(r[7]) : null,
      ownerType: isInternal ? 'INTERNAL' : 'EXTERNAL',
      supplierId,
      // New fields
      chassisNumber: String(r[5] || '').trim() || null,
      engineNumber: String(r[6] || '').trim() || null,
      grossWeight: r[8] ? Math.round(Number(r[8])) : null,
      curbWeight: r[9] ? Math.round(Number(r[9])) : null,
      payloadCapacity: r[10] ? Math.round(Number(r[10])) : null,
      lengthMm: r[11] ? Math.round(Number(r[11])) : null,
      widthMm: r[12] ? Math.round(Number(r[12])) : null,
      heightMm: r[13] ? Math.round(Number(r[13])) : null,
      cubicMeters: r[14] ? Number(Number(r[14]).toFixed(2)) : null,
      inspectionBookNumber: String(r[15] || '').trim() || null,
      registrationExpiry: excelDate(r[17]),
      insuranceBodyExpiry: excelDate(r[18]),
      insuranceLiabilityExpiry: excelDate(r[19]),
      bankName: String(r[20] || '').trim() || null,
      registeredCsgt: String(r[21] || '').trim().toLowerCase() === 'x',
      registeredRegistry: String(r[22] || '').trim().toLowerCase() === 'x',
      lastCheckedAt: excelDate(r[23]),
      gpsExpiryDate: gpsMap.get(plate) || null,
      status: 'ACTIVE',
      updatedAt: new Date(),
    };

    // Tonnage: derive from payloadCapacity (kg → tons, rounded to 1 decimal)
    if (data.payloadCapacity) {
      data.tonnage = Number((data.payloadCapacity / 1000).toFixed(1));
    }

    const existing = await prisma.vehicle.findUnique({ where: { plateNumber: plate } });

    if (existing) {
      await prisma.vehicle.update({ where: { plateNumber: plate }, data });
      updated++;
    } else {
      await prisma.vehicle.create({ data: { plateNumber: plate, ...data } });
      created++;
    }

    // Upsert VehicleInspection if inspectionExpiryDate exists
    const inspExpiry = excelDate(r[16]);
    if (inspExpiry) {
      const vehicle = await prisma.vehicle.findUnique({ where: { plateNumber: plate } });
      if (vehicle) {
        const existingInsp = await prisma.vehicleInspection.findFirst({
          where: { vehicleId: vehicle.id },
          orderBy: { expiryDate: 'desc' },
        });
        if (!existingInsp || existingInsp.expiryDate.getTime() !== inspExpiry.getTime()) {
          await prisma.vehicleInspection.create({
            data: {
              vehicleId: vehicle.id,
              inspectionDate: new Date(),
              expiryDate: inspExpiry,
              result: 'PASS',
              certificateNumber: data.inspectionBookNumber,
            },
          });
        }
      }
    }
  }

  console.log(`\n📊 Import Results:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  GPS entries mapped: ${gpsMap.size}`);

  // Verify
  const total = await prisma.vehicle.count();
  const inspCount = await prisma.vehicleInspection.count();
  console.log(`\n✅ Total vehicles in DB: ${total}`);
  console.log(`✅ Total inspections in DB: ${inspCount}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error('❌ Import failed:', e); process.exit(1); });
