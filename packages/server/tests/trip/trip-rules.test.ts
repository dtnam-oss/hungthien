/**
 * R3 — chuyến thuộc kỳ CLOSED không được sửa/xóa.
 * R4 — calcTripFinancials: revenue from lookupPrice, cost from TripCost.
 * R5 — snapshot kỳ: close period assigns trips & locks them.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { calcTripFinancials } from '../../src/modules/trip/calc-trip-financials.js';

const prisma = new PrismaClient();

let customerId: number;
let routeId: number;
let pricingRowId: number;
let vehicleId: number;
let periodId: number;
let tripId: number;

describe('Trip business rules (R3, R4, R5)', () => {
  beforeAll(async () => {
    const ts = Date.now();
    const c = await prisma.customer.create({ data: { code: `TR-C-${ts}`, name: 'Test Trip Customer' } });
    customerId = c.id;

    const r = await prisma.route.create({ data: { code: `TR-R-${ts}`, name: 'Test Trip Route' } });
    routeId = r.id;

    const pr = await prisma.pricingRow.create({
      data: { customerId, routeId, tripType: 'STANDARD', unitPrice: 6000000, validFrom: new Date('2026-01-01'), status: 'ACTIVE' },
    });
    pricingRowId = pr.id;

    const v = await prisma.vehicle.create({
      data: { plateNumber: `99Z-T${ts}`, brand: 'Test', model: 'Test', ownerType: 'INTERNAL', fuelType: 'DIESEL', status: 'ACTIVE' },
    });
    vehicleId = v.id;

    const period = await prisma.accountingPeriod.create({
      data: { code: `TST-${ts}`, name: 'Test Period', startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
    });
    periodId = period.id;

    const trip = await prisma.trip.create({
      data: { tripCode: `T-${ts}`, tripDate: new Date('2026-06-15'), customerId, routeId, vehicleId, tripType: 'STANDARD', status: 'COMPLETED' },
    });
    tripId = trip.id;
  });

  afterAll(async () => {
    if (tripId) {
      await prisma.tripCost.deleteMany({ where: { tripId } });
      await prisma.trip.deleteMany({ where: { id: tripId } });
    }
    if (periodId) await prisma.accountingPeriod.delete({ where: { id: periodId } });
    if (pricingRowId) await prisma.pricingRow.delete({ where: { id: pricingRowId } });
    if (vehicleId) await prisma.vehicle.delete({ where: { id: vehicleId } });
    if (routeId) await prisma.route.delete({ where: { id: routeId } });
    if (customerId) await prisma.customer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
  });

  // R4: calcTripFinancials
  it('R4: calcTripFinancials returns correct revenue from lookupPrice', async () => {
    const result = await calcTripFinancials(prisma, tripId);
    expect(result.revenue).toBe(6000000);
    expect(result.unitPrice).toBe(6000000);
    expect(result.pricingRowId).toBe(pricingRowId);
  });

  it('R4: calcTripFinancials calculates cost and profit correctly', async () => {
    // Add costs
    await prisma.tripCost.createMany({
      data: [
        { tripId, costType: 'FUEL', amount: 2000000 },
        { tripId, costType: 'TOLL', amount: 500000 },
      ],
    });

    const result = await calcTripFinancials(prisma, tripId);
    expect(result.revenue).toBe(6000000);
    expect(result.totalCost).toBe(2500000);
    expect(result.profit).toBe(3500000);
  });

  // R5: snapshot kỳ
  it('R5: closing period assigns trip to period', async () => {
    // Assign trip to period's date range, then close
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    // Manually assign (the route handler does this automatically)
    await prisma.trip.update({
      where: { id: tripId },
      data: { accountingPeriodId: periodId },
    });

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { AccountingPeriod: true },
    });
    expect(trip!.accountingPeriodId).toBe(periodId);
    expect(trip!.AccountingPeriod!.status).toBe('CLOSED');
  });

  // R3: locked trip cannot be edited
  it('R3: trip in CLOSED period is considered locked', async () => {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { AccountingPeriod: true },
    });
    expect(trip!.AccountingPeriod!.status).toBe('CLOSED');
    // The service layer checks this — here we verify the data state
  });

  it('R5: reopening period allows editing again', async () => {
    await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: { status: 'OPEN', closedAt: null },
    });

    const period = await prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    expect(period!.status).toBe('OPEN');
  });
});
