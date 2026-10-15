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

const SUPPLIER_STATUS = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

const CREATE_RULES: FieldRule[] = [
  { field: 'code', label: 'M\u00e3 NCC', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'name', label: 'T\u00ean NCC', required: true, type: 'string', minLength: 1, maxLength: 200 },
  { field: 'shortName', label: 'T\u00ean ng\u1eafn', type: 'string', maxLength: 100 },
  { field: 'taxCode', label: 'M\u00e3 s\u1ed1 thu\u1ebf', type: 'string', maxLength: 20 },
  { field: 'phone', label: 'S\u0110T', type: 'string', maxLength: 20 },
  { field: 'email', label: 'Email', type: 'string', maxLength: 100 },
  { field: 'contactPerson', label: 'Ng\u01b0\u1eddi li\u00ean h\u1ec7', type: 'string', maxLength: 200 },
];

export interface SupplierFilters {
  search?: string;
  status?: string;
}

export class SupplierService {
  constructor(private prisma: PrismaClient) {}

  async list(pagination: PaginationParams, filters: SupplierFilters) {
    const where: Prisma.SupplierWhereInput = {};
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { taxCode: { contains: filters.search } },
      ];
    }
    if (filters.status) where.status = filters.status;

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const orderBy: Prisma.SupplierOrderByWithRelationInput = {};
    if (pagination.sortBy) {
      (orderBy as Record<string, string>)[pagination.sortBy] = pagination.sortOrder || 'asc';
    } else {
      (orderBy as Record<string, string>)['id'] = 'desc';
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where, skip, take: pageSize, orderBy,
        include: { _count: { select: { Vehicle: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const mapped = data.map((s) => ({
      ...s,
      vehicleCount: s._count.Vehicle,
      _count: undefined,
    }));

    return {
      data: mapped,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        Vehicle: {
          select: { id: true, plateNumber: true, type: true, brand: true, model: true, status: true },
          orderBy: { plateNumber: 'asc' },
        },
      },
    });
    if (!supplier) throw new NotFoundError('Nh\u00e0 cung c\u1ea5p');
    return supplier;
  }

  async create(data: Record<string, unknown>, userId?: number) {
    validatePayload(data, CREATE_RULES);
    validateEnum('status', data.status as string | undefined, [...SUPPLIER_STATUS], 'Tr\u1ea1ng th\u00e1i');

    try {
      const supplier = await this.prisma.supplier.create({
        data: {
          code: data.code as string,
          name: data.name as string,
          shortName: (data.shortName as string) || null,
          taxCode: (data.taxCode as string) || null,
          phone: (data.phone as string) || null,
          email: (data.email as string) || null,
          address: (data.address as string) || null,
          contactPerson: (data.contactPerson as string) || null,
          contactPhone: (data.contactPhone as string) || null,
          bankAccount: (data.bankAccount as string) || null,
          bankName: (data.bankName as string) || null,
          maxVehicles: data.maxVehicles ? Number(data.maxVehicles) : null,
          status: (data.status as string) || 'ACTIVE',
          notes: (data.notes as string) || null,
        },
      });
      writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'Supplier', recordId: supplier.id, newValues: supplier }).catch(() => {});
      return supplier;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictError('M\u00e3 nh\u00e0 cung c\u1ea5p \u0111\u00e3 t\u1ed3n t\u1ea1i');
      }
      throw err;
    }
  }

  async update(id: number, data: Record<string, unknown>, userId?: number) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Nh\u00e0 cung c\u1ea5p');

    if (data.version !== undefined && Number(data.version) !== existing.version) {
      throw new ConflictError('D\u1eef li\u1ec7u \u0111\u00e3 b\u1ecb thay \u0111\u1ed5i b\u1edfi ng\u01b0\u1eddi kh\u00e1c. Vui l\u00f2ng t\u1ea3i l\u1ea1i.');
    }

    validateEnum('status', data.status as string | undefined, [...SUPPLIER_STATUS], 'Tr\u1ea1ng th\u00e1i');
    const merged = patchSemantics(existing, data);

    const SUPPLIER_COLUMNS = ['code','name','shortName','taxCode','phone','email','address','contactPerson','contactPhone','bankAccount','bankName','maxVehicles','status','notes'] as const;
    const updateData: Record<string, unknown> = {};
    for (const col of SUPPLIER_COLUMNS) {
      if (merged[col] !== undefined) updateData[col] = merged[col];
    }

    try {
      const updated = await this.prisma.supplier.update({
        where: { id },
        data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() },
      });
      const diff = auditDiff(existing, updated);
      if (diff && Object.keys(diff.newValues).length > 0) {
        writeAuditLog(this.prisma, { userId, action: 'UPDATE', tableName: 'Supplier', recordId: id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
      }
      return updated;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictError('M\u00e3 nh\u00e0 cung c\u1ea5p \u0111\u00e3 t\u1ed3n t\u1ea1i');
      }
      throw err;
    }
  }

  async delete(id: number, userId?: number) {
    const existing = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { Vehicle: true } } },
    });
    if (!existing) throw new NotFoundError('Nh\u00e0 cung c\u1ea5p');
    if (existing._count.Vehicle > 0) {
      throw new ConflictError(`Kh\u00f4ng th\u1ec3 x\u00f3a: \u0111ang c\u00f3 ${existing._count.Vehicle} xe li\u00ean k\u1ebft`);
    }
    await this.prisma.supplier.delete({ where: { id } });
    writeAuditLog(this.prisma, { userId, action: 'DELETE', tableName: 'Supplier', recordId: id, oldValues: existing }).catch(() => {});
    return { success: true };
  }
}
