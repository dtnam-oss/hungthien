/**
 * vehicle-dt.service.ts — DataTables server-side listing for Vehicle.
 *
 * Column names follow the web contract; they map to schema fields:
 * vehicleType -> Vehicle.type, loadCapacity -> Vehicle.tonnage.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, sortColumn } from '../../shared/datatable.js';
import type { DTParams } from '../../shared/datatable.js';

/** Order = column index sent by the web table. */
export const SORTABLE_COLUMNS = ['plateNumber', 'vehicleType', 'brand', 'loadCapacity', 'ownerType', 'status'] as const;

export interface VehicleDTFilters {
  status?: string[];
  ownerType?: string[];
  vehicleType?: string[];
  primaryDriverId?: number[];
  supplierId?: number[];
}

const SELECT = {
  id: true, plateNumber: true, type: true, brand: true, model: true, tonnage: true,
  payloadCapacity: true, ownerType: true, status: true, version: true,
  supplierId: true, primaryDriverId: true, secondaryDriverId: true,
  Employee_Vehicle_primaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
  Employee_Vehicle_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
  Supplier: { select: { id: true, code: true, name: true } },
} satisfies Prisma.VehicleSelect;

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(search: string, filters: VehicleDTFilters, includeStatus = true): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};
  if (includeStatus && filters.status?.length) where.status = { in: filters.status };
  if (filters.ownerType?.length) where.ownerType = { in: filters.ownerType };
  if (filters.vehicleType?.length) where.type = { in: filters.vehicleType };
  if (filters.primaryDriverId?.length) where.primaryDriverId = { in: filters.primaryDriverId };
  if (filters.supplierId?.length) where.supplierId = { in: filters.supplierId };
  if (search) {
    where.OR = [
      { plateNumber: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { Employee_Vehicle_primaryDriverIdToEmployee: { fullName: { contains: search, mode: 'insensitive' } } },
      { Supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

export function buildOrderBy(orderCol: number, dir: 'asc' | 'desc'): Prisma.VehicleOrderByWithRelationInput {
  switch (sortColumn(SORTABLE_COLUMNS, orderCol)) {
    case 'plateNumber': return { plateNumber: dir };
    case 'vehicleType': return { type: dir };
    case 'brand': return { brand: dir };
    case 'loadCapacity': return { tonnage: dir };
    case 'ownerType': return { ownerType: dir };
    case 'status': return { status: dir };
    default: return { plateNumber: 'asc' };
  }
}

export class VehicleDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams, filters: VehicleDTFilters) {
    const where = buildWhere(params.search, filters);
    const whereBase = buildWhere(params.search, filters, false);

    const [raw, recordsFiltered, recordsTotal, groups] = await Promise.all([
      this.prisma.vehicle.findMany({
        where, skip: params.start, take: params.length,
        orderBy: buildOrderBy(params.orderCol, params.orderDir), select: SELECT,
      }),
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.count(),
      this.prisma.vehicle.groupBy({ by: ['status'], where: whereBase, _count: true }),
    ]);

    const data = raw.map((v) => {
      const {
        Employee_Vehicle_primaryDriverIdToEmployee: primaryDriver,
        Employee_Vehicle_secondaryDriverIdToEmployee: secondaryDriver,
        ...rest
      } = v;
      return { ...rest, primaryDriver, secondaryDriver };
    });

    return buildDTResponse({
      draw: params.draw, recordsTotal, recordsFiltered, data,
      statusStats: groups.map((g) => ({ status: g.status, count: g._count })),
    });
  }
}
