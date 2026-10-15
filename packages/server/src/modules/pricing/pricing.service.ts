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
import { lookupPrice } from './lookup-price.js';
import type { LookupPriceParams } from './lookup-price.js';

const PRICING_STATUS = ['ACTIVE', 'INACTIVE'] as const;

const CREATE_RULES: FieldRule[] = [
  { field: 'customerId', label: 'Khách hàng', required: true, type: 'number' },
  { field: 'routeId', label: 'Tuyến đường', required: true, type: 'number' },
  { field: 'unitPrice', label: 'Đơn giá', required: true, type: 'number' },
  { field: 'validFrom', label: 'Hiệu lực từ', required: true, type: 'string' },
];

export interface PricingFilters {
  search?: string;
  status?: string;
  customerId?: number;
  routeId?: number;
  priceType?: string;
}

export class PricingService {
  constructor(private prisma: PrismaClient) {}

  async list(pagination: PaginationParams, filters: PricingFilters) {
    const where: Prisma.PricingRowWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.routeId) where.routeId = filters.routeId;
    if (filters.priceType) where.priceType = filters.priceType;
    if (filters.search) {
      where.OR = [
        { Customer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { Route: { name: { contains: filters.search, mode: 'insensitive' } } },
        { Route: { code: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.pricingRow.findMany({
        where, skip, take: pageSize,
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        include: {
          Customer: { select: { id: true, code: true, name: true } },
          Route: { select: { id: true, code: true, name: true, origin: true, destination: true } },
        },
      }),
      this.prisma.pricingRow.count({ where }),
    ]);

    return {
      data,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: number) {
    const row = await this.prisma.pricingRow.findUnique({
      where: { id },
      include: {
        Customer: { select: { id: true, code: true, name: true } },
        Route: { select: { id: true, code: true, name: true, origin: true, destination: true } },
      },
    });
    if (!row) throw new NotFoundError('Dòng giá');
    return row;
  }

  async create(data: Record<string, unknown>, userId?: number) {
    validatePayload(data, CREATE_RULES);
    validateEnum('status', data.status as string | undefined, [...PRICING_STATUS], 'Trạng thái');

    const priceType = (data.priceType as string) || 'CUSTOMER';
    const customerId = Number(data.customerId);
    const routeId = Number(data.routeId);
    const tripType = (data.tripType as string) || 'STANDARD';

    // Transaction: deactivate old prices + create new
    const row = await this.prisma.$transaction(async (tx) => {
      // Deactivate existing ACTIVE prices for the same combo
      await tx.pricingRow.updateMany({
        where: {
          customerId, routeId, tripType, priceType,
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE', updatedAt: new Date() },
      });

      // Create new price version
      return tx.pricingRow.create({
        data: {
          customerId, routeId, tripType, priceType,
          unitPrice: Number(data.unitPrice),
          currency: (data.currency as string) || 'VND',
          validFrom: new Date(data.validFrom as string),
          validTo: data.validTo ? new Date(data.validTo as string) : null,
          status: (data.status as string) || 'ACTIVE',
          notes: (data.notes as string) || null,
        },
      });
    });

    writeAuditLog(this.prisma, { userId, action: 'CREATE', tableName: 'PricingRow', recordId: row.id, newValues: row }).catch(() => {});
    return row;
  }

  async update(id: number, data: Record<string, unknown>, userId?: number) {
    const existing = await this.prisma.pricingRow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Dòng giá');

    if (data.version !== undefined && Number(data.version) !== existing.version) {
      throw new ConflictError('Dữ liệu đã bị thay đổi bởi người khác.');
    }

    validateEnum('status', data.status as string | undefined, [...PRICING_STATUS], 'Trạng thái');
    const merged = patchSemantics(existing, data);

    const COLUMNS = ['customerId','routeId','tripType','unitPrice','currency','validFrom','validTo','status','notes'] as const;
    const updateData: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      if (merged[col] !== undefined) {
        if (col === 'unitPrice' || col === 'customerId' || col === 'routeId') {
          updateData[col] = Number(merged[col]);
        } else if (col === 'validFrom' || col === 'validTo') {
          updateData[col] = merged[col] ? new Date(merged[col] as string | Date) : null;
        } else {
          updateData[col] = merged[col];
        }
      }
    }

    const updated = await this.prisma.pricingRow.update({
      where: { id },
      data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() },
    });

    const diff = auditDiff(existing, updated);
    if (diff && Object.keys(diff.newValues).length > 0) {
      writeAuditLog(this.prisma, { userId, action: 'UPDATE', tableName: 'PricingRow', recordId: id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
    }
    return updated;
  }

  async delete(id: number, userId?: number) {
    const existing = await this.prisma.pricingRow.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Dòng giá');
    await this.prisma.pricingRow.delete({ where: { id } });
    writeAuditLog(this.prisma, { userId, action: 'DELETE', tableName: 'PricingRow', recordId: id, oldValues: existing }).catch(() => {});
    return { success: true };
  }

  async lookup(params: LookupPriceParams) {
    return lookupPrice(this.prisma, params);
  }
}
