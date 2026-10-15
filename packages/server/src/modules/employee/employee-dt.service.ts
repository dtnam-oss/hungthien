/**
 * employee-dt.service.ts — DataTables server-side listing for Employee.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['code', 'fullName', 'phone', 'position', 'department', 'status'] as const;

export interface EmployeeDTFilters {
  status?: string[];
  isDriver?: boolean[];
  department?: string[];
}

const SELECT = {
  id: true, code: true, fullName: true, phone: true, position: true,
  department: true, isDriver: true, status: true, joinDate: true, version: true,
} satisfies Prisma.EmployeeSelect;

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: EmployeeDTFilters, includeStatus = true, hidden?: Set<string>): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (filters.isDriver?.length) where.isDriver = filters.isDriver[0];
  if (filters.department?.length) where.department = { in: filters.department };
  if (search) {
    // Bỏ các cột bị ẩn theo vai trò khỏi tìm kiếm
    const cols = (['code', 'fullName', 'phone', 'position', 'department'] as const).filter((c) => !hidden?.has(c));
    where.OR = cols.map((c) => ({ [c]: { contains: search, mode: 'insensitive' } }));
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc', hidden?: Set<string>): Prisma.EmployeeOrderByWithRelationInput {
  const col = sortColumn(SORTABLE_COLUMNS, orderCol);
  return col && !hidden?.has(col) ? { [col]: dir } : { fullName: 'asc' };
}

export class EmployeeDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: EmployeeDTFilters, hidden?: Set<string>) {
    const where = buildWhere(params.search, filters, true, hidden);
    const whereBase = buildWhere(params.search, filters, false, hidden);

    const [data, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir, hidden), select: SELECT,
      }),
      this.prisma.employee.count({ where }),
      this.prisma.employee.count(),
      this.prisma.employee.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
    });
  }
}
