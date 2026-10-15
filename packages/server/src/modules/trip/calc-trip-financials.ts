/**
 * R4 — calcTripFinancials: tính doanh thu/chi phí/lợi nhuận.
 * revenue = unitPrice from lookupPrice
 * totalCost = SUM(TripCost.amount)
 * profit = revenue - totalCost
 */
import { PrismaClient } from '@prisma/client';
import { lookupPrice } from '../pricing/lookup-price.js';

export async function calcTripFinancials(
  prisma: PrismaClient,
  tripId: number,
): Promise<{ revenue: number; totalCost: number; profit: number; unitPrice: number | null; pricingRowId: number | null }> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { TripCost: true },
  });
  if (!trip) throw new Error('Trip not found');

  // Revenue from lookupPrice
  let unitPrice: number | null = null;
  let pricingRowId: number | null = null;
  const priceRow = await lookupPrice(prisma, {
    customerId: trip.customerId,
    routeId: trip.routeId,
    tripType: trip.tripType,
    referenceDate: trip.tripDate,
  });
  if (priceRow) {
    unitPrice = Number(priceRow.unitPrice);
    pricingRowId = priceRow.id;
  }
  const revenue = unitPrice ?? 0;

  // Cost = sum of all TripCost
  const totalCost = trip.TripCost.reduce((sum, c) => sum + Number(c.amount), 0);

  const profit = revenue - totalCost;

  // Write back to trip
  await prisma.trip.update({
    where: { id: tripId },
    data: { revenue, totalCost, profit, unitPrice, pricingRowId },
  });

  return { revenue, totalCost, profit, unitPrice, pricingRowId };
}
