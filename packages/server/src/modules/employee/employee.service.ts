/**
 * Employee service — business logic for employee CRUD.
 * Separated from routes so it can be tested without HTTP.
 */

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

const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

const CREATE_RULES: FieldRule[] = [
  { field: 'code', label: 'Mã nhân viên', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'fullName', label: 'Họ tên', required: true, type: 'string', minLength: 1, maxLength: 200 },
  { field: 'phone', label: 'Số điện thoại', type: 'string', maxLength: 20 },
  { field: 'position', label: 'Chức danh', type: 'string', maxLength: 100 },
  { field: 'department', label: 'Phòng ban', type: 'string', maxLength: 100 },
];

export interface EmployeeFilters {
  search?: string;
  status?: string;
  isDriver?: boolean;
  department?: string;
}

export class EmployeeService {
  constructor(private prisma: PrismaClient) {}

  async list(pagination: PaginationParams, filters: EmployeeFilters) {
    const where: Prisma.EmployeeWhereInput = {};

    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.isDriver !== undefined) {
      where.isDriver = filters.isDriver;
    }
    if (filters.department) {
      where.department = filters.department;
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: pagination.sortBy
          ? { [pagination.sortBy]: pagination.sortOrder ?? 'asc' }
          : { id: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total };
  }

  async getById(id: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundError('Nhân viên', id);
    return employee;
  }

  async create(data: Record<string, unknown>, userId: number | null) {
    validatePayload(data, CREATE_RULES);
    if (data.status) {
      validateEnum('status', data.status, [...EMPLOYEE_STATUS], 'Trạng thái');
    }

    const employee = await this.prisma.employee.create({
      data: {
        code: data.code as string,
        fullName: data.fullName as string,
        phone: data.phone as string | undefined,
        position: data.position as string | undefined,
        department: data.department as string | undefined,
        isDriver: (data.isDriver as boolean) ?? false,
        status: (data.status as string) ?? 'ACTIVE',
        joinDate: data.joinDate ? new Date(data.joinDate as string) : null,
      },
    });

    await writeAuditLog(this.prisma, {
      userId,
      action: 'CREATE',
      tableName: 'Employee',
      recordId: employee.id,
      newValues: data,
    });

    return employee;
  }

  async update(id: number, payload: Record<string, unknown>, userId: number | null) {
    const existing = await this.getById(id);

    // Optimistic locking: check version
    if (payload.version !== undefined && payload.version !== existing.version) {
      throw new ConflictError();
    }

    if (payload.status) {
      validateEnum('status', payload.status, [...EMPLOYEE_STATUS], 'Trạng thái');
    }

    // R8: patchSemantics — missing fields keep existing values
    const merged = patchSemantics(existing as unknown as Record<string, unknown>, payload);

    // Handle joinDate conversion
    if (merged.joinDate && typeof merged.joinDate === 'string') {
      merged.joinDate = new Date(merged.joinDate as string);
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...merged,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    // Audit log
    const diff = auditDiff(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['fullName', 'phone', 'position', 'department', 'isDriver', 'status'],
    );
    if (diff) {
      await writeAuditLog(this.prisma, {
        userId,
        action: 'UPDATE',
        tableName: 'Employee',
        recordId: id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
      });
    }

    return updated;
  }

  async delete(id: number, userId: number | null) {
    // Soft delete: set status to INACTIVE
    const existing = await this.getById(id);

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    await writeAuditLog(this.prisma, {
      userId,
      action: 'DELETE',
      tableName: 'Employee',
      recordId: id,
      oldValues: { status: existing.status },
      newValues: { status: 'INACTIVE' },
    });

    return updated;
  }
}
