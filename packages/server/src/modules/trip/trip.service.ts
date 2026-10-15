import { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  validatePayload,
  validateEnum,
  patchSemantics,
  writeAuditLog,
  auditDiff,
} from '../../shared/index.js';
import type { FieldRule, PaginationParams } from '../../shared/index.js';
import { calcTripFinancials } from './calc-trip-financials.js';

const TRIP_STATUS = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
const COST_TYPES = ['FUEL', 'TOLL', 'REPAIR', 'LOADING', 'SALARY', 'OTHER'] as const;

const TRIP_COLUMNS = [
  'tripCode','tripDate','customerId','routeId','vehicleId','primaryDriverId','secondaryDriverId',
  'tripType','status','departureTime','arrivalTime','actualKm','cargoWeight','cargoDescription',
  'notes','accountingPeriodId',
  // New fields from Excel template
  'cargoChannel','pickupAddress','deliveryAddress','appTrackingNumber','appPlateNumber',
  'markingCode','routeLabelCode','accountingNotes','lastEditedById',
  'driverSalary','supplementarySalary','lobbyFee','operatingCostHt',
  'vendorPaymentStatus','htInvoiceIssued','vendorInvoiceIssued',
] as const;

const CREATE_RULES: FieldRule[] = [
  { field: 'tripCode', label: 'Mã chuyến', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'tripDate', label: 'Ngày chuyến', required: true, type: 'string' },
  { field: 'customerId', label: 'Khách hàng', required: true, type: 'number' },
  { field: 'routeId', label: 'Tuyến', required: true, type: 'number' },
  { field: 'vehicleId', label: 'Xe', required: true, type: 'number' },
];

export interface TripFilters {
  search?: string;
  status?: string;
  customerId?: number;
  vehicleId?: number;
  driverId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export class TripService {
  constructor(private prisma: PrismaClient) {}

  /** R3+R5: check if trip is in a CLOSED accounting period */
  private async assertNotLocked(tripId: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { AccountingPeriod: true },
    });
    if (trip?.AccountingPeriod?.status === 'CLOSED') {
      throw new ForbiddenError('Chuyến thuộc kỳ đã khóa sổ. Không được sửa/xóa.');
    }
  }

  async list(pagination: PaginationParams, filters: TripFilters) {
    const where: Prisma.TripWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.vehicleId) where.vehicleId = filters.vehicleId;
    if (filters.driverId) {
      where.OR = [
        { primaryDriverId: filters.driverId },
        { secondaryDriverId: filters.driverId },
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      where.tripDate = {};
      if (filters.dateFrom) (where.tripDate as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      if (filters.dateTo) (where.tripDate as Prisma.DateTimeFilter).lte = new Date(filters.dateTo);
    }
    if (filters.search) {
      const searchOr: Prisma.TripWhereInput[] = [
        { tripCode: { contains: filters.search, mode: 'insensitive' } },
        { Customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
      where.AND = [{ OR: searchOr }];
    }

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const orderBy: Prisma.TripOrderByWithRelationInput = {};
    if (pagination.sortBy) {
      (orderBy as Record<string, string>)[pagination.sortBy] = pagination.sortOrder || 'desc';
    } else {
      (orderBy as Record<string, string>)['tripDate'] = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where, skip, take: pageSize, orderBy,
        include: {
          Customer: { select: { id: true, code: true, name: true } },
          Route: { select: { id: true, code: true, name: true } },
          Vehicle: { select: { id: true, plateNumber: true } },
          Employee_Trip_primaryDriverIdToEmployee: { select: { id: true, fullName: true } },
          AccountingPeriod: { select: { id: true, code: true, status: true } },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);

    const mapped = data.map(t => ({
      ...t,
      primaryDriver: t.Employee_Trip_primaryDriverIdToEmployee,
      Employee_Trip_primaryDriverIdToEmployee: undefined,
      isLocked: t.AccountingPeriod?.status === 'CLOSED',
    }));

    return {
      data: mapped,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        Customer: { select: { id: true, code: true, name: true } },
        Route: { select: { id: true, code: true, name: true, origin: true, destination: true } },
        Vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, tonnage: true, Supplier: { select: { id: true, name: true } } } },
        Employee_Trip_primaryDriverIdToEmployee: { select: { id: true, fullName: true, phone: true } },
        Employee_Trip_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, phone: true } },
        Employee_Trip_lastEditedByIdToEmployee: { select: { id: true, fullName: true } },
        AccountingPeriod: { select: { id: true, code: true, status: true } },
        PricingRow: { select: { id: true, unitPrice: true, validFrom: true } },
        TripCost: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!trip) throw new NotFoundError('Chuyến đi');
    return {
      ...trip,
      primaryDriver: trip.Employee_Trip_primaryDriverIdToEmployee,
      secondaryDriver: trip.Employee_Trip_secondaryDriverIdToEmployee,
      lastEditedBy: trip.Employee_Trip_lastEditedByIdToEmployee,
      Employee_Trip_primaryDriverIdToEmployee: undefined,
      Employee_Trip_secondaryDriverIdToEmployee: undefined,
      Employee_Trip_lastEditedByIdToEmployee: undefined,
      isLocked: trip.AccountingPeriod?.status === 'CLOSED',
    };
  }

  async create(data: Record<string, unknown>, userId?: number) {
    validatePayload(data, CREATE_RULES);
    validateEnum('status', data.status as string | undefined, [...TRIP_STATUS], 'Trạng thái');

    try {
      const trip = await this.prisma.trip.create({
        data: {
          tripCode: data.tripCode as string,
          tripDate: new Date(data.tripDate as string),
          customerId: Number(data.customerId),
          routeId: Number(data.routeId),
          vehicleId: Number(data.vehicleId),
          primaryDriverId: data.primaryDriverId ? Number(data.primaryDriverId) : null,
          secondaryDriverId: data.secondaryDriverId ? Number(data.secondaryDriverId) : null,
          tripType: (data.tripType as string) || 'STANDARD',
          status: (data.status as string) || 'PLANNED',
          departureTime: data.departureTime ? new Date(data.departureTime as string) : null,
          arrivalTime: data.arrivalTime ? new Date(data.arrivalTime as string) : null,
          actualKm: data.actualKm ? Number(data.actualKm) : null,
          cargoWeight: data.cargoWeight ? Number(data.cargoWeight) : null,
          cargoDescription: (data.cargoDescription as string) || null,
          notes: (data.notes as string) || null,
          accountingPeriodId: data.accountingPeriodId ? Number(data.accountingPeriodId) : null,
          // New Excel fields
          cargoChannel: (data.cargoChannel as string) || null,
          pickupAddress: (data.pickupAddress as string) || null,
          deliveryAddress: (data.deliveryAddress as string) || null,
          appTrackingNumber: (data.appTrackingNumber as string) || null,
          appPlateNumber: (data.appPlateNumber as string) || null,
          markingCode: (data.markingCode as string) || null,
          routeLabelCode: (data.routeLabelCode as string) || null,
          accountingNotes: (data.accountingNotes as string) || null,
          lastEditedById: userId ?? null,
          driverSalary: data.driverSalary ? Number(data.driverSalary) : null,
          supplementarySalary: data.supplementarySalary ? Number(data.supplementarySalary) : null,
          lobbyFee: data.lobbyFee ? Number(data.lobbyFee) : null,
          operatingCostHt: data.operatingCostHt ? Number(data.operatingCostHt) : null,
          vendorPaymentStatus: (data.vendorPaymentStatus as string) || 'UNPAID',
          htInvoiceIssued: data.htInvoiceIssued === true || data.htInvoiceIssued === 'true',
          vendorInvoiceIssued: data.vendorInvoiceIssued === true || data.vendorInvoiceIssued === 'true',
        },
      });

      // Auto-calculate financials
      await calcTripFinancials(this.prisma, trip.id);

      writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'Trip', recordId: trip.id, newValues: trip }).catch(() => {});
      return this.getById(trip.id);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') throw new ConflictError('Mã chuyến đã tồn tại');
      throw err;
    }
  }

  async update(id: number, data: Record<string, unknown>, userId?: number) {
    await this.assertNotLocked(id);
    const existing = await this.prisma.trip.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Chuyến đi');

    if (data.version !== undefined && Number(data.version) !== existing.version) {
      throw new ConflictError('Dữ liệu đã bị thay đổi bởi người khác.');
    }

    validateEnum('status', data.status as string | undefined, [...TRIP_STATUS], 'Trạng thái');
    const merged = patchSemantics(existing, data);

    const updateData: Record<string, unknown> = {};
    for (const col of TRIP_COLUMNS) {
      if (merged[col] !== undefined) {
        if (['customerId','routeId','vehicleId','primaryDriverId','secondaryDriverId','accountingPeriodId','lastEditedById'].includes(col)) {
          updateData[col] = merged[col] ? Number(merged[col]) : null;
        } else if (['tripDate','departureTime','arrivalTime'].includes(col)) {
          updateData[col] = merged[col] ? new Date(merged[col] as string) : null;
        } else if (['actualKm','cargoWeight','driverSalary','supplementarySalary','lobbyFee','operatingCostHt'].includes(col)) {
          updateData[col] = merged[col] ? Number(merged[col]) : null;
        } else if (['htInvoiceIssued','vendorInvoiceIssued'].includes(col)) {
          updateData[col] = merged[col] === true || merged[col] === 'true';
        } else {
          updateData[col] = merged[col];
        }
      }
    }
    // Always track who edited
    updateData.lastEditedById = userId ?? null;

    try {
      const updated = await this.prisma.trip.update({
        where: { id },
        data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() },
      });

      // Recalc financials
      await calcTripFinancials(this.prisma, id);

      const diff = auditDiff(existing, updated);
      if (diff && Object.keys(diff.newValues).length > 0) {
        writeAuditLog(this.prisma, { userId, action: 'UPDATE', tableName: 'Trip', recordId: id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
      }
      return this.getById(id);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') throw new ConflictError('Mã chuyến đã tồn tại');
      throw err;
    }
  }

  async delete(id: number, userId?: number) {
    await this.assertNotLocked(id);
    const existing = await this.prisma.trip.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Chuyến đi');
    await this.prisma.trip.delete({ where: { id } });
    writeAuditLog(this.prisma, { userId, action: 'DELETE', tableName: 'Trip', recordId: id, oldValues: existing }).catch(() => {});
    return { success: true };
  }

  // --- TripCost ---
  async addCost(tripId: number, data: Record<string, unknown>, userId?: number) {
    await this.assertNotLocked(tripId);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundError('Chuyến đi');
    validateEnum('costType', data.costType as string, [...COST_TYPES], 'Loại chi phí');
    const cost = await this.prisma.tripCost.create({
      data: {
        tripId,
        costType: data.costType as string,
        amount: Number(data.amount),
        description: (data.description as string) || null,
        receiptNumber: (data.receiptNumber as string) || null,
      },
    });
    await calcTripFinancials(this.prisma, tripId);
    writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'TripCost', recordId: cost.id, newValues: cost }).catch(() => {});
    return cost;
  }

  async deleteCost(tripId: number, costId: number, userId?: number) {
    await this.assertNotLocked(tripId);
    const cost = await this.prisma.tripCost.findFirst({ where: { id: costId, tripId } });
    if (!cost) throw new NotFoundError('Chi phí');
    await this.prisma.tripCost.delete({ where: { id: costId } });
    await calcTripFinancials(this.prisma, tripId);
    writeAuditLog(this.prisma, { userId, action: 'DELETE', tableName: 'TripCost', recordId: costId, oldValues: cost }).catch(() => {});
    return { success: true };
  }

  // --- Driver trips ---
  async listDriverTrips(driverId: number, pagination: PaginationParams) {
    return this.list(pagination, { driverId });
  }

  async updateTripStatus(tripId: number, status: string, userId?: number) {
    validateEnum('status', status, [...TRIP_STATUS], 'Trạng thái');
    await this.assertNotLocked(tripId);
    const existing = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!existing) throw new NotFoundError('Chuyến đi');
    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status, version: { increment: 1 }, updatedAt: new Date() },
    });
    writeAuditLog(this.prisma, { userId, action: 'UPDATE', tableName: 'Trip', recordId: tripId, oldValues: { status: existing.status }, newValues: { status } }).catch(() => {});
    return updated;
  }

  // --- Dashboard ---
  async getDashboard(dateFrom?: string, dateTo?: string) {
    const where: Prisma.TripWhereInput = {};
    if (dateFrom || dateTo) {
      where.tripDate = {};
      if (dateFrom) (where.tripDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.tripDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    const [totalTrips, statusCounts, financials] = await Promise.all([
      this.prisma.trip.count({ where }),
      this.prisma.trip.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.trip.aggregate({
        where,
        _sum: { revenue: true, totalCost: true, profit: true },
      }),
    ]);

    return {
      totalTrips,
      byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
      revenue: Number(financials._sum.revenue ?? 0),
      totalCost: Number(financials._sum.totalCost ?? 0),
      profit: Number(financials._sum.profit ?? 0),
    };
  }
}
