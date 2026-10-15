/**
 * payroll-period-dt.service.ts — DataTables server-side listing for PayrollPeriod.
 * statusStats keys are raw period statuses (DRAFT / CONFIRMED / PAID).
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['year', 'month', 'type', 'status'] as const;

export interface PayrollPeriodDTFilters {
  year?: number[];
  type?: string[];
  status?: string[];
  regionId?: number[];
}

const INCLUDE = {
  Region: { select: { id: true, code: true, name: true } },
  _count: { select: { PayrollEntry: true } },
} satisfies Prisma.PayrollPeriodInclude;

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: PayrollPeriodDTFilters, includeStatus = true): Prisma.PayrollPeriodWhereInput {
  const where: Prisma.PayrollPeriodWhereInput = {};
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (filters.year?.length) where.year = { in: filters.year };
  if (filters.type?.length) where.type = { in: filters.type };
  if (filters.regionId?.length) where.regionId = { in: filters.regionId };
  if (search) {
    const or: Prisma.PayrollPeriodWhereInput[] = [
      { type: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { Region: { name: { contains: search, mode: 'insensitive' } } },
    ];
    // Numeric search also matches the period's month or year
    if (/^\d{1,4}$/.test(search)) {
      const n = Number(search);
      or.push({ year: n }, { month: n });
    }
    where.OR = or;
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.PayrollPeriodOrderByWithRelationInput[] {
  switch (sortColumn(SORTABLE_COLUMNS, orderCol)) {
    case 'year': return [{ year: dir }, { month: dir }];
    case 'month': return [{ month: dir }, { year: dir }];
    case 'type': return [{ type: dir }, { year: 'desc' }, { month: 'desc' }];
    case 'status': return [{ status: dir }, { year: 'desc' }, { month: 'desc' }];
    default: return [{ year: 'desc' }, { month: 'desc' }];
  }
}

export class PayrollPeriodDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: PayrollPeriodDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);

    const [data, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.payrollPeriod.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir), include: INCLUDE,
      }),
      this.prisma.payrollPeriod.count({ where }),
      this.prisma.payrollPeriod.count(),
      this.prisma.payrollPeriod.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
    });
  }
}
