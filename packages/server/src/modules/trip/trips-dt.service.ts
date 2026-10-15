/**
 * trips-dt.service.ts — DataTables server-side protocol for Trip listing.
 *
 * Giao thức: draw / start / length / search[value] / order[0][column] / order[0][dir]
 * + custom filters (customerId, dateFrom, dateTo, driverId, supplierId, status).
 *
 * Returns stats (customerStats, statusStats) in the SAME response to avoid race conditions.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import { buildDTResponse, DT_MAX_LENGTH } from '../../shared/datatable.js';
import type { DTParams as BaseDTParams } from '../../shared/datatable.js';

/* ── DataTables request / response types ──────────────────────────── */

export interface DTParams extends BaseDTParams {
  // Custom filters
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  driverId?: number;
  supplierId?: number;
  /** Multi-value; applied to rows/count but not to statusStats. */
  status?: string[];
}

export interface DTRow {
  id: number;
  tripCode: string;
  tripDate: string;
  status: string;
  revenue: string | null;
  totalCost: string | null;
  profit: string | null;
  unitPrice: string | null;
  cargoWeight: string | null;
  actualKm: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  cargoDescription: string | null;
  notes: string | null;
  tripType: string;
  version: number;
  isLocked: boolean;
  costCount: number;
  Customer: { id: number; code: string; name: string } | null;
  Route: { id: number; code: string; name: string; origin: string | null; destination: string | null } | null;
  Vehicle: { id: number; plateNumber: string; Supplier: { id: number; name: string } | null } | null;
  primaryDriver: { id: number; fullName: string } | null;
  secondaryDriver: { id: number; fullName: string } | null;
  AccountingPeriod: { id: number; code: string; status: string } | null;
}

export interface DTResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: DTRow[];
  customerStats: { id: number; name: string; count: number }[];
  statusStats: { status: string; count: number }[];
}

/* ── Column index → Prisma orderBy map ────────────────────────────
 * MUST match the column order on the frontend table:
 * 0=# (row number, no sort)
 * 1=Tuyến        → Route.name
 * 2=Khách hàng   → Customer.name
 * 3=Biển số      → Vehicle.plateNumber
 * 4=SL chi phí   → computed, no DB sort
 * 5=Trạng thái   → status
 * 6=Nhà xe       → Vehicle.Supplier.name
 * 7=Thao tác     → no sort
 *
 * Adding/removing a UI column WITHOUT updating this array will silently
 * mis-sort. Unsortable columns fall back to tripDate desc.
 * ─────────────────────────────────────────────────────────────────── */

type OrderByInput = Prisma.TripOrderByWithRelationInput;

function buildOrderBy(colIdx: number, dir: 'asc' | 'desc'): OrderByInput {
  switch (colIdx) {
    case 1: return { Route: { name: dir } };
    case 2: return { Customer: { name: dir } };
    case 3: return { Vehicle: { plateNumber: dir } };
    case 5: return { status: dir };
    // case 6: Vehicle→Supplier nested sort — Prisma supports 2-level relation orderBy
    case 6: return { Vehicle: { Supplier: { name: dir } } } as OrderByInput;
    default: return { tripDate: 'desc' };
  }
}

/* ── WHERE builder ────────────────────────────────────────────────── */

/** `includeStatus=false` yields the base set used for statusStats. */
export function buildWhere(params: DTParams, includeStatus = true): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = {};

  if (includeStatus && params.status?.length) {
    where.status = { in: params.status };
  }
  if (params.customerId) {
    where.customerId = params.customerId;
  }
  if (params.driverId) {
    where.OR = [
      { primaryDriverId: params.driverId },
      { secondaryDriverId: params.driverId },
    ];
  }
  // Nhà xe: Trip → Vehicle → Supplier
  if (params.supplierId) {
    where.Vehicle = { supplierId: params.supplierId };
  }
  if (params.dateFrom || params.dateTo) {
    const tripDate: Prisma.DateTimeFilter = {};
    if (params.dateFrom) tripDate.gte = new Date(params.dateFrom);
    if (params.dateTo) tripDate.lte = new Date(params.dateTo);
    where.tripDate = tripDate;
  }
  if (params.search) {
    where.AND = [{
      OR: [
        { tripCode: { contains: params.search, mode: 'insensitive' } },
        { Customer: { name: { contains: params.search, mode: 'insensitive' } } },
        { Route: { name: { contains: params.search, mode: 'insensitive' } } },
        { Vehicle: { plateNumber: { contains: params.search, mode: 'insensitive' } } },
      ],
    }];
  }
  return where;
}

/* ── Service ──────────────────────────────────────────────────────── */

export class TripsDTService {
  constructor(private prisma: PrismaClient) {}

  async query(params: DTParams): Promise<DTResponse> {
    const length = Math.min(Math.max(params.length || 100, 1), DT_MAX_LENGTH);
    const start = Math.max(params.start || 0, 0);

    const where = buildWhere(params);
    // statusStats ignore the status filter so the rail keeps all its counts
    const whereBase = buildWhere(params, false);

    // ── OrderBy ─────────────────────────────────────────────────
    const orderBy = buildOrderBy(params.orderCol, params.orderDir);

    // ── Include (shared for data query) ─────────────────────────
    const include = {
      Customer: { select: { id: true, code: true, name: true } },
      Route: { select: { id: true, code: true, name: true, origin: true, destination: true } },
      Vehicle: {
        select: {
          id: true,
          plateNumber: true,
          Supplier: { select: { id: true, name: true } },
        },
      },
      Employee_Trip_primaryDriverIdToEmployee: { select: { id: true, fullName: true } },
      Employee_Trip_secondaryDriverIdToEmployee: { select: { id: true, fullName: true } },
      AccountingPeriod: { select: { id: true, code: true, status: true } },
      _count: { select: { TripCost: true } },
    };

    // ── Execute all queries in parallel ─────────────────────────
    const [rawData, recordsFiltered, recordsTotal, statusGroupRaw, customerGroupRaw] =
      await Promise.all([
        this.prisma.trip.findMany({
          where,
          skip: start,
          take: length,
          orderBy,
          include,
        }),
        this.prisma.trip.count({ where }),
        this.prisma.trip.count(),
        this.prisma.trip.groupBy({
          by: ['status'],
          where: whereBase,
          _count: true,
        }),
        this.prisma.trip.groupBy({
          by: ['customerId'],
          where,
          _count: true,
          orderBy: { _count: { customerId: 'desc' } },
          take: 20,
        }),
      ]);

    // ── Map data rows ───────────────────────────────────────────
    const data: DTRow[] = rawData.map((t) => ({
      id: t.id,
      tripCode: t.tripCode,
      tripDate: t.tripDate.toISOString(),
      status: t.status,
      revenue: t.revenue?.toString() ?? null,
      totalCost: t.totalCost?.toString() ?? null,
      profit: t.profit?.toString() ?? null,
      unitPrice: t.unitPrice?.toString() ?? null,
      cargoWeight: t.cargoWeight?.toString() ?? null,
      actualKm: t.actualKm?.toString() ?? null,
      departureTime: t.departureTime?.toISOString() ?? null,
      arrivalTime: t.arrivalTime?.toISOString() ?? null,
      cargoDescription: t.cargoDescription,
      notes: t.notes,
      tripType: t.tripType,
      version: t.version,
      isLocked: t.AccountingPeriod?.status === 'CLOSED',
      costCount: t._count.TripCost,
      Customer: t.Customer,
      Route: t.Route,
      Vehicle: t.Vehicle as DTRow['Vehicle'],
      primaryDriver: t.Employee_Trip_primaryDriverIdToEmployee,
      secondaryDriver: t.Employee_Trip_secondaryDriverIdToEmployee,
      AccountingPeriod: t.AccountingPeriod,
    }));

    // ── Build stats ─────────────────────────────────────────────
    const statusStats = statusGroupRaw.map((s) => ({
      status: s.status,
      count: s._count,
    }));

    // Enrich customer stats with names
    const customerIds = customerGroupRaw.map((c) => c.customerId);
    const customerNames = customerIds.length > 0
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(customerNames.map((c) => [c.id, c.name]));
    const customerStats = customerGroupRaw.map((c) => ({
      id: c.customerId,
      name: nameMap.get(c.customerId) || `KH #${c.customerId}`,
      count: c._count,
    }));

    return buildDTResponse({
      draw: params.draw,
      recordsTotal,
      recordsFiltered,
      data,
      statusStats,
      extra: { customerStats },
    });
  }
}
