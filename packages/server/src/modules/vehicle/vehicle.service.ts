import { PrismaClient, Prisma } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  validatePayload,
  validateEnum,
  patchSemantics,
  writeAuditLog,
  auditDiff,
} from '../../shared/index.js';
import type { FieldRule, PaginationParams } from '../../shared/index.js';

const VEHICLE_STATUS = ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED'] as const;
const OWNER_TYPES = ['INTERNAL', 'EXTERNAL'] as const;
const FUEL_TYPES = ['DIESEL', 'GASOLINE', 'ELECTRIC', 'CNG'] as const;
const INSPECTION_RESULTS = ['PASS', 'FAIL', 'CONDITIONAL'] as const;

const CREATE_RULES: FieldRule[] = [
  { field: 'plateNumber', label: 'Biển số xe', required: true, type: 'string', minLength: 1, maxLength: 20 },
  { field: 'type', label: 'Loại xe', type: 'string', maxLength: 50 },
  { field: 'brand', label: 'Hãng xe', type: 'string', maxLength: 100 },
  { field: 'model', label: 'Đời xe', type: 'string', maxLength: 100 },
];

const INSPECTION_RULES: FieldRule[] = [
  { field: 'inspectionDate', label: 'Ngày đăng kiểm', required: true, type: 'string' },
  { field: 'expiryDate', label: 'Ngày hết hạn', required: true, type: 'string' },
];

export interface VehicleFilters {
  search?: string;
  status?: string;
  ownerType?: string;
  primaryDriverId?: number;
}

export class VehicleService {
  constructor(private prisma: PrismaClient) {}

  async list(pagination: PaginationParams, filters: VehicleFilters) {
    const where: Prisma.VehicleWhereInput = {};
    if (filters.search) {
      where.OR = [
        { plateNumber: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.status = filters.status;
    if (filters.ownerType) where.ownerType = filters.ownerType;
    if (filters.primaryDriverId) where.primaryDriverId = filters.primaryDriverId;

    const { skip, take, orderBy } = this.buildPagination(pagination);
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          Employee_Vehicle_primaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
          Employee_Vehicle_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
          Supplier: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    // Flatten driver names for response
    const mapped = data.map((v) => ({
      ...v,
      primaryDriver: v.Employee_Vehicle_primaryDriverIdToEmployee,
      secondaryDriver: v.Employee_Vehicle_secondaryDriverIdToEmployee,
      Employee_Vehicle_primaryDriverIdToEmployee: undefined,
      Employee_Vehicle_secondaryDriverIdToEmployee: undefined,
    }));

    return {
      data: mapped,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  async getById(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        Employee_Vehicle_primaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
        Employee_Vehicle_secondaryDriverIdToEmployee: { select: { id: true, fullName: true, code: true } },
        Supplier: { select: { id: true, code: true, name: true } },
        VehicleFinance: true,
        VehicleInspection: { orderBy: { expiryDate: 'desc' } },
      },
    });
    if (!vehicle) throw new NotFoundError('Phương tiện');

    // Check inspection expiry warning
    const latestInspection = vehicle.VehicleInspection[0];
    const inspectionWarning = latestInspection
      ? this.getInspectionWarning(latestInspection.expiryDate)
      : 'NO_INSPECTION';

    // Compliance warnings for all date-based fields
    const compliance = {
      inspection: inspectionWarning,
      registration: vehicle.registrationExpiry ? this.getInspectionWarning(vehicle.registrationExpiry) : 'NO_DATA',
      insuranceBody: vehicle.insuranceBodyExpiry ? this.getInspectionWarning(vehicle.insuranceBodyExpiry) : 'NO_DATA',
      insuranceLiability: vehicle.insuranceLiabilityExpiry ? this.getInspectionWarning(vehicle.insuranceLiabilityExpiry) : 'NO_DATA',
      gps: vehicle.gpsExpiryDate ? this.getInspectionWarning(vehicle.gpsExpiryDate) : 'NO_DATA',
    };

    return {
      ...vehicle,
      primaryDriver: vehicle.Employee_Vehicle_primaryDriverIdToEmployee,
      secondaryDriver: vehicle.Employee_Vehicle_secondaryDriverIdToEmployee,
      Employee_Vehicle_primaryDriverIdToEmployee: undefined,
      Employee_Vehicle_secondaryDriverIdToEmployee: undefined,
      inspectionWarning,
      compliance,
    };
  }

  async create(data: Record<string, unknown>, userId?: number) {
    validatePayload(data, CREATE_RULES);
    validateEnum('status', data.status as string | undefined, [...VEHICLE_STATUS], 'Trạng thái');
    validateEnum('ownerType', data.ownerType as string | undefined, [...OWNER_TYPES], 'Loại sở hữu');
    validateEnum('fuelType', data.fuelType as string | undefined, [...FUEL_TYPES], 'Nhiên liệu');

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          plateNumber: data.plateNumber as string,
          type: (data.type as string) || null,
          brand: (data.brand as string) || null,
          model: (data.model as string) || null,
          yearMfg: data.yearMfg ? Number(data.yearMfg) : null,
          tonnage: data.tonnage ? Number(data.tonnage) : null,
          cubicMeters: data.cubicMeters ? Number(data.cubicMeters) : null,
          fuelType: (data.fuelType as string) || 'DIESEL',
          ownerType: (data.ownerType as string) || 'INTERNAL',
          supplierId: data.supplierId ? Number(data.supplierId) : null,
          primaryDriverId: data.primaryDriverId ? Number(data.primaryDriverId) : null,
          secondaryDriverId: data.secondaryDriverId ? Number(data.secondaryDriverId) : null,
          status: (data.status as string) || 'ACTIVE',
          notes: (data.notes as string) || null,
          // New Excel fields
          chassisNumber: (data.chassisNumber as string) || null,
          engineNumber: (data.engineNumber as string) || null,
          grossWeight: data.grossWeight ? Number(data.grossWeight) : null,
          curbWeight: data.curbWeight ? Number(data.curbWeight) : null,
          payloadCapacity: data.payloadCapacity ? Number(data.payloadCapacity) : null,
          lengthMm: data.lengthMm ? Number(data.lengthMm) : null,
          widthMm: data.widthMm ? Number(data.widthMm) : null,
          heightMm: data.heightMm ? Number(data.heightMm) : null,
          inspectionBookNumber: (data.inspectionBookNumber as string) || null,
          registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry as string) : null,
          insuranceBodyExpiry: data.insuranceBodyExpiry ? new Date(data.insuranceBodyExpiry as string) : null,
          insuranceLiabilityExpiry: data.insuranceLiabilityExpiry ? new Date(data.insuranceLiabilityExpiry as string) : null,
          gpsExpiryDate: data.gpsExpiryDate ? new Date(data.gpsExpiryDate as string) : null,
          bankName: (data.bankName as string) || null,
          registeredCsgt: data.registeredCsgt === true || data.registeredCsgt === 'true',
          registeredRegistry: data.registeredRegistry === true || data.registeredRegistry === 'true',
        },
      });

      writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'Vehicle', recordId: vehicle.id, newValues: vehicle }).catch(() => {});
      return vehicle;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictError('Biển số xe đã tồn tại');
      }
      throw err;
    }
  }

  async update(id: number, data: Record<string, unknown>, userId?: number) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Phương tiện');

    // Optimistic locking
    if (data.version !== undefined && Number(data.version) !== existing.version) {
      throw new ConflictError('Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.');
    }

    validateEnum('status', data.status as string | undefined, [...VEHICLE_STATUS], 'Trạng thái');
    validateEnum('ownerType', data.ownerType as string | undefined, [...OWNER_TYPES], 'Loại sở hữu');
    validateEnum('fuelType', data.fuelType as string | undefined, [...FUEL_TYPES], 'Nhiên liệu');

    const merged = patchSemantics(existing, data);

    // Strip non-scalar fields (relations, id, timestamps, version) before Prisma update
    const VEHICLE_COLUMNS = [
      'plateNumber','type','brand','model','yearMfg','tonnage','cubicMeters','fuelType','ownerType',
      'supplierId','primaryDriverId','secondaryDriverId','status','notes',
      // New Excel fields
      'chassisNumber','engineNumber','grossWeight','curbWeight','payloadCapacity',
      'lengthMm','widthMm','heightMm','inspectionBookNumber',
      'registrationExpiry','insuranceBodyExpiry','insuranceLiabilityExpiry','gpsExpiryDate',
      'bankName','registeredCsgt','registeredRegistry','lastCheckedAt',
    ] as const;
    const INT_COLS = ['supplierId','primaryDriverId','secondaryDriverId','yearMfg','grossWeight','curbWeight','payloadCapacity','lengthMm','widthMm','heightMm'];
    const DEC_COLS = ['tonnage','cubicMeters'];
    const DATE_COLS = ['registrationExpiry','insuranceBodyExpiry','insuranceLiabilityExpiry','gpsExpiryDate','lastCheckedAt'];
    const BOOL_COLS = ['registeredCsgt','registeredRegistry'];
    const updateData: Record<string, unknown> = {};
    for (const col of VEHICLE_COLUMNS) {
      if (merged[col] !== undefined) {
        if (INT_COLS.includes(col)) {
          updateData[col] = merged[col] ? Number(merged[col]) : null;
        } else if (DEC_COLS.includes(col)) {
          updateData[col] = merged[col] ? Number(merged[col]) : null;
        } else if (DATE_COLS.includes(col)) {
          updateData[col] = merged[col] ? new Date(merged[col] as string) : null;
        } else if (BOOL_COLS.includes(col)) {
          updateData[col] = merged[col] === true || merged[col] === 'true';
        } else {
          updateData[col] = merged[col];
        }
      }
    }

    try {
      const updated = await this.prisma.vehicle.update({
        where: { id },
        data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() },
      });

      const diff = auditDiff(existing, updated);
      if (diff && Object.keys(diff.newValues).length > 0) {
        writeAuditLog(this.prisma, { userId, action: 'UPDATE', tableName: 'Vehicle', recordId: id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
      }
      return updated;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictError('Biển số xe đã tồn tại');
      }
      throw err;
    }
  }

  async delete(id: number, userId?: number) {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Phương tiện');
    await this.prisma.vehicle.delete({ where: { id } });
    writeAuditLog(this.prisma, { userId, action: 'DELETE', tableName: 'Vehicle', recordId: id, oldValues: existing }).catch(() => {});
    return { success: true };
  }

  // ---- VehicleFinance ----

  async getFinance(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Phương tiện');
    return this.prisma.vehicleFinance.findUnique({ where: { vehicleId } });
  }

  async upsertFinance(vehicleId: number, data: Record<string, unknown>, userId?: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Phương tiện');

    const financeData = {
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate as string) : undefined,
      loanAmount: data.loanAmount !== undefined ? Number(data.loanAmount) : undefined,
      interestRate: data.interestRate !== undefined ? Number(data.interestRate) : undefined,
      loanStartDate: data.loanStartDate ? new Date(data.loanStartDate as string) : undefined,
      loanEndDate: data.loanEndDate ? new Date(data.loanEndDate as string) : undefined,
      monthlyPayment: data.monthlyPayment !== undefined ? Number(data.monthlyPayment) : undefined,
      insuranceFee: data.insuranceFee !== undefined ? Number(data.insuranceFee) : undefined,
      roadTax: data.roadTax !== undefined ? Number(data.roadTax) : undefined,
      depreciation: data.depreciation !== undefined ? Number(data.depreciation) : undefined,
      notes: data.notes as string | undefined,
    };

    // Remove undefined values
    const cleanData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(financeData)) {
      if (v !== undefined) cleanData[k] = v;
    }

    const result = await this.prisma.vehicleFinance.upsert({
      where: { vehicleId },
      update: { ...cleanData, version: { increment: 1 }, updatedAt: new Date() },
      create: { vehicleId, ...cleanData },
    });

    writeAuditLog(this.prisma, { userId, action: 'UPSERT', tableName: 'VehicleFinance', recordId: result.id, newValues: cleanData }).catch(() => {});
    return result;
  }

  // ---- VehicleInspection ----

  async listInspections(vehicleId: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Phương tiện');
    return this.prisma.vehicleInspection.findMany({
      where: { vehicleId },
      orderBy: { expiryDate: 'desc' },
    });
  }

  async createInspection(vehicleId: number, data: Record<string, unknown>, userId?: number) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundError('Phương tiện');

    validatePayload(data, INSPECTION_RULES);
    validateEnum('result', data.result as string | undefined, [...INSPECTION_RESULTS], 'Kết quả');

    const inspection = await this.prisma.vehicleInspection.create({
      data: {
        vehicleId,
        inspectionDate: new Date(data.inspectionDate as string),
        expiryDate: new Date(data.expiryDate as string),
        result: (data.result as string) || 'PASS',
        inspectionCenter: (data.inspectionCenter as string) || null,
        certificateNumber: (data.certificateNumber as string) || null,
        cost: data.cost ? Number(data.cost) : null,
        notes: (data.notes as string) || null,
      },
    });

    writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'VehicleInspection', recordId: inspection.id, newValues: inspection }).catch(() => {});
    return inspection;
  }

  // ---- Inspection warning ----

  private getInspectionWarning(expiryDate: Date): string {
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'EXPIRED';
    if (diffDays <= 30) return 'EXPIRING_SOON';
    return 'OK';
  }

  // ---- Helpers ----

  async getDriversForAssignment() {
    return this.prisma.employee.findMany({
      where: { isDriver: true, status: 'ACTIVE' },
      select: { id: true, code: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }

  private buildPagination(pagination: PaginationParams) {
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const orderBy: Prisma.VehicleOrderByWithRelationInput = {};
    if (pagination.sortBy) {
      (orderBy as Record<string, string>)[pagination.sortBy] = pagination.sortOrder || 'asc';
    } else {
      (orderBy as Record<string, string>)['id'] = 'desc';
    }
    return { skip, take: pageSize, orderBy };
  }
}
