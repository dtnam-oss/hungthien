/**
 * trip-plan-dt.service.ts — DataTables server-side listing for TripPlan.
 * statusStats are counts of `isActive` reported as ACTIVE / INACTIVE.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['customerName', 'routeName', 'plateNumber', 'isActive'] as const;

export interface TripPlanDTFilters {
  isActive?: boolean[];
  customerId?: number[];
  vehicleId?: number[];
  driverId?: number[];
}

const INCLUDE = {
  Customer: { select: { id: true, name: true, code: true } },
  Route: { select: { id: true, name: true, code: true, origin: true, destination: true } },
  Vehicle: { select: { id: true, plateNumber: true, type: true } },
  Employee_TripPlan_primaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
  Employee_TripPlan_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
} satisfies Prisma.TripPlanInclude;

/** `includeStatus=false` yields the base set used for statusStats (isActive is the status). */
export function buildWhere(search: string, filters: TripPlanDTFilters, includeStatus = true): Prisma.TripPlanWhereInput {
  const where: Prisma.TripPlanWhereInput = {};
  const and: Prisma.TripPlanWhereInput[] = [];
  if (includeStatus && filters.isActive?.length) where.isActive = filters.isActive[0];
  if (filters.customerId?.length) where.customerId = { in: filters.customerId };
  if (filters.vehicleId?.length) where.vehicleId = { in: filters.vehicleId };
  if (filters.driverId?.length) {
    and.push({
      OR: [
        { primaryDriverId: { in: filters.driverId } },
        { secondaryDriverId: { in: filters.driverId } },
      ],
    });
  }
  if (search) {
    and.push({
      OR: [
        { Customer: { name: { contains: search, mode: 'insensitive' } } },
        { Route: { name: { contains: search, mode: 'insensitive' } } },
        { Vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
        { Employee_TripPlan_primaryDriverIdToEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
        { Employee_TripPlan_secondaryDriverIdToEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }
  if (and.length) where.AND = and;
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.TripPlanOrderByWithRelationInput {
  switch (sortColumn(SORTABLE_COLUMNS, orderCol)) {
    case 'customerName': return { Customer: { name: dir } };
    case 'routeName': return { Route: { name: dir } };
    case 'plateNumber': return { Vehicle: { plateNumber: dir } };
    case 'isActive': return { isActive: dir };
    default: return { id: 'desc' };
  }
}

export class TripPlanDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: TripPlanDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);

    const [data, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.tripPlan.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir), include: INCLUDE,
      }),
      this.prisma.tripPlan.count({ where }),
      this.prisma.tripPlan.count(),
      this.prisma.tripPlan.groupBy({ by: ['isActive'], where: whereBase, _count: true }),
    ]);

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.isActive ? 'ACTIVE' : 'INACTIVE', count: g._count })),
    });
  }
}
