/**
 * pricing-dt.service.ts — DataTables server-side listing for PricingRow.
 * `priceType` is required (CUSTOMER / SUPPLIER price books are separate lists).
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';
import { ValidationError } from '../../shared/errors.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['customerName', 'routeName', 'tripType', 'unitPrice', 'validFrom', 'status'] as const;

export interface PricingDTFilters {
  priceType?: string[];
  status?: string[];
  customerId?: number[];
  routeId?: number[];
}

const INCLUDE = {
  Customer: { select: { id: true, code: true, name: true } },
  Route: { select: { id: true, code: true, name: true, origin: true, destination: true } },
} satisfies Prisma.PricingRowInclude;

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: PricingDTFilters, includeStatus = true): Prisma.PricingRowWhereInput {
  if (!filters.priceType?.length) throw new ValidationError('priceType là bắt buộc');
  const where: Prisma.PricingRowWhereInput = { priceType: { in: filters.priceType } };
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (filters.customerId?.length) where.customerId = { in: filters.customerId };
  if (filters.routeId?.length) where.routeId = { in: filters.routeId };
  if (search) {
    where.OR = [
      { Customer: { name: { contains: search, mode: 'insensitive' } } },
      { Customer: { code: { contains: search, mode: 'insensitive' } } },
      { Route: { name: { contains: search, mode: 'insensitive' } } },
      { Route: { code: { contains: search, mode: 'insensitive' } } },
      { tripType: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.PricingRowOrderByWithRelationInput {
  switch (sortColumn(SORTABLE_COLUMNS, orderCol)) {
    case 'customerName': return { Customer: { name: dir } };
    case 'routeName': return { Route: { name: dir } };
    case 'tripType': return { tripType: dir };
    case 'unitPrice': return { unitPrice: dir };
    case 'validFrom': return { validFrom: dir };
    case 'status': return { status: dir };
    default: return { validFrom: 'desc' };
  }
}

export class PricingDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: PricingDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);
    // Total is scoped to the requested price book(s)
    const whereTotal: Prisma.PricingRowWhereInput = { priceType: { in: filters.priceType } };

    const [data, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.pricingRow.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir), include: INCLUDE,
      }),
      this.prisma.pricingRow.count({ where }),
      this.prisma.pricingRow.count({ where: whereTotal }),
      this.prisma.pricingRow.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
    });
  }
}
