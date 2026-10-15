/**
 * supplier-dt.service.ts — DataTables server-side listing for Supplier.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['code', 'name', 'taxCode', 'phone', 'status'] as const;

export interface SupplierDTFilters {
  status?: string[];
}

const SELECT = {
  id: true, code: true, name: true, shortName: true, taxCode: true, maxVehicles: true,
  status: true, phone: true, email: true, contactPerson: true, contactPhone: true,
  address: true, bankAccount: true, bankName: true, notes: true, version: true,
  _count: { select: { Vehicle: true } },
} satisfies Prisma.SupplierSelect;

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: SupplierDTFilters, includeStatus = true): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {};
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { shortName: { contains: search, mode: 'insensitive' } },
      { taxCode: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.SupplierOrderByWithRelationInput {
  const col = sortColumn(SORTABLE_COLUMNS, orderCol);
  return col ? { [col]: dir } : { name: 'asc' };
}

export class SupplierDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: SupplierDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);

    const [raw, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.supplier.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir), select: SELECT,
      }),
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.count(),
      this.prisma.supplier.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    const data = raw.map(({ _count, ...s }) => ({ ...s, vehicleCount: _count.Vehicle }));

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
    });
  }
}
