/**
 * customer-dt.service.ts — DataTables server-side listing for Customer.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['code', 'name', 'taxCode', 'email', 'phone', 'status'] as const;

export interface CustomerDTFilters {
  status?: string[];
}

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: CustomerDTFilters, includeStatus = true): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { taxCode: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.CustomerOrderByWithRelationInput {
  const col = sortColumn(SORTABLE_COLUMNS, orderCol);
  return col ? { [col]: dir } : { name: 'asc' };
}

export class CustomerDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: CustomerDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);

    const [data, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir),
      }),
      this.prisma.customer.count({ where }),
      this.prisma.customer.count(),
      this.prisma.customer.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
      extra: { customerStats: [] as never[] },
    });
  }
}
