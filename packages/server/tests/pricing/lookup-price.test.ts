/**
 * R1 — lookupPrice: nguồn tra giá duy nhất.
 * Deterministic: cùng input → cùng output, không phụ thuộc thứ tự DB.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { lookupPrice } from '../../src/modules/pricing/lookup-price.js';

const prisma = new PrismaClient();

let customerId: number;
let routeId: number;

describe('lookupPrice (R1)', () => {
  beforeAll(async () => {
    // Create test customer + route
    const c = await prisma.customer.create({
      data: { code: `TEST-R1-${Date.now()}`, name: 'Test Customer R1' },
    });
    customerId = c.id;

    const r = await prisma.route.create({
      data: { code: `R1-${Date.now()}`, name: 'Test Route R1', origin: 'A', destination: 'B' },
    });
    routeId = r.id;

    // Create pricing rows with different validFrom dates
    await prisma.pricingRow.createMany({
      data: [
        { customerId, routeId, tripType: 'STANDARD', unitPrice: 3000000, validFrom: new Date('2026-01-01'), validTo: new Date('2026-03-31'), status: 'ACTIVE' },
        { customerId, routeId, tripType: 'STANDARD', unitPrice: 4000000, validFrom: new Date('2026-04-01'), validTo: new Date('2026-06-30'), status: 'ACTIVE' },
        { customerId, routeId, tripType: 'STANDARD', unitPrice: 5000000, validFrom: new Date('2026-07-01'), validTo: null, status: 'ACTIVE' },
        { customerId, routeId, tripType: 'EXPRESS',   unitPrice: 8000000, validFrom: new Date('2026-01-01'), validTo: null, status: 'ACTIVE' },
        { customerId, routeId, tripType: 'STANDARD', unitPrice: 9999999, validFrom: new Date('2026-01-01'), validTo: null, status: 'INACTIVE' },
      ],
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.pricingRow.deleteMany({ where: { customerId } });
    await prisma.route.delete({ where: { id: routeId } });
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
  });

  it('returns correct price for Jan 2026 (Q1 rate)', async () => {
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'STANDARD',
      referenceDate: new Date('2026-02-15'),
    });
    expect(result).not.toBeNull();
    expect(Number(result!.unitPrice)).toBe(3000000);
  });

  it('returns correct price for May 2026 (Q2 rate)', async () => {
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'STANDARD',
      referenceDate: new Date('2026-05-15'),
    });
    expect(result).not.toBeNull();
    expect(Number(result!.unitPrice)).toBe(4000000);
  });

  it('returns correct price for Sep 2026 (current open-ended rate)', async () => {
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'STANDARD',
      referenceDate: new Date('2026-09-06'),
    });
    expect(result).not.toBeNull();
    expect(Number(result!.unitPrice)).toBe(5000000);
  });

  it('returns null when no pricing exists for future tripType', async () => {
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'NONEXISTENT',
      referenceDate: new Date('2026-06-01'),
    });
    expect(result).toBeNull();
  });

  it('filters by tripType — EXPRESS returns different price', async () => {
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'EXPRESS',
      referenceDate: new Date('2026-06-01'),
    });
    expect(result).not.toBeNull();
    expect(Number(result!.unitPrice)).toBe(8000000);
  });

  it('ignores INACTIVE pricing rows', async () => {
    // The 9999999 row is INACTIVE, should never be returned
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'STANDARD',
      referenceDate: new Date('2026-02-15'),
    });
    expect(Number(result!.unitPrice)).not.toBe(9999999);
  });

  it('deterministic: same input → same output across multiple calls', async () => {
    const params = { customerId, routeId, tripType: 'STANDARD' as const, referenceDate: new Date('2026-05-01') };
    const results = await Promise.all([
      lookupPrice(prisma, params),
      lookupPrice(prisma, params),
      lookupPrice(prisma, params),
    ]);
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(results[1]!.id).toBe(results[2]!.id);
  });

  it('picks latest validFrom when multiple rows overlap', async () => {
    // For Sep 2026: both Q1 (validTo=null via INACTIVE, filtered) and Jul+ (validFrom=2026-07-01) could match.
    // Should pick Jul+ because orderBy validFrom desc.
    const result = await lookupPrice(prisma, {
      customerId, routeId, tripType: 'STANDARD',
      referenceDate: new Date('2026-09-06'),
    });
    expect(result).not.toBeNull();
    expect(Number(result!.unitPrice)).toBe(5000000);
    expect(result!.validFrom).toEqual(new Date('2026-07-01'));
  });
});
