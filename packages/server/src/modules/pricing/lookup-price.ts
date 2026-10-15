/**
 * R1 — lookupPrice: nguồn tra giá duy nhất.
 * Cả form nhập chuyến và hàm tính doanh thu đều gọi hàm này.
 * orderBy xác định — không phụ thuộc thứ tự DB trả về.
 */

import { PrismaClient } from '@prisma/client';

export interface LookupPriceParams {
  customerId: number;
  routeId: number;
  tripType: string;
  referenceDate: Date;  // ngày VN đã qua toVNDate
}

export async function lookupPrice(
  prisma: PrismaClient,
  params: LookupPriceParams,
) {
  return prisma.pricingRow.findFirst({
    where: {
      customerId: params.customerId,
      routeId: params.routeId,
      tripType: params.tripType,
      status: 'ACTIVE',
      validFrom: { lte: params.referenceDate },
      OR: [
        { validTo: null },
        { validTo: { gte: params.referenceDate } },
      ],
    },
    orderBy: [
      { validFrom: 'desc' },
      { createdAt: 'desc' },  // hòa validFrom → lấy bản tạo sau
    ],
    include: {
      Customer: { select: { id: true, code: true, name: true } },
      Route: { select: { id: true, code: true, name: true } },
    },
  });
}
