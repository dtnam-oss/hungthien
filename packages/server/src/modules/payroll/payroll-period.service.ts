import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../shared/errors.js';
import { writeAuditLog } from '../../shared/index.js';

const PERIOD_STATUSES = ['DRAFT', 'CONFIRMED', 'PAID'] as const;
const PERIOD_TYPES = ['DRIVER', 'OFFICE'] as const;

function assertDraft(status: string) {
  if (status !== 'DRAFT') throw new ForbiddenError('Kỳ lương đã khoá, không thể thao tác.');
}

export class PayrollPeriodService {
  constructor(private prisma: PrismaClient) {}

  /* ── List ──────────────────────────────────────────────────────── */
  async list(filters: { year?: number; type?: string; status?: string; regionId?: number }) {
    const where: any = {};
    if (filters.year) where.year = filters.year;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.regionId) where.regionId = filters.regionId;

    const data = await this.prisma.payrollPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        Region: { select: { id: true, code: true, name: true } },
        _count: { select: { PayrollEntry: true } },
      },
    });
    return data;
  }

  /* ── Get by ID ─────────────────────────────────────────────────── */
  async getById(id: number) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        Region: { select: { id: true, code: true, name: true } },
        _count: { select: { PayrollEntry: true } },
      },
    });
    if (!period) throw new NotFoundError('Kỳ lương');
    return period;
  }

  /* ── Create + generate roster ──────────────────────────────────── */
  async create(data: Record<string, unknown>, userId?: number) {
    const month = Number(data.month);
    const year = Number(data.year);
    const type = data.type as string;
    const mode = (data.mode as string) || 'MANUAL';
    const regionId = data.regionId ? Number(data.regionId) : null;
    const notes = (data.notes as string) || null;

    if (!month || month < 1 || month > 12) throw new ValidationError('Tháng không hợp lệ');
    if (!year || year < 2020) throw new ValidationError('Năm không hợp lệ');
    if (!PERIOD_TYPES.includes(type as any)) throw new ValidationError('Loại kỳ không hợp lệ');

    // Check duplicate — handled by partial unique index, but give better error
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { month, year, type, regionId },
    });
    if (existing) throw new ConflictError('Kỳ lương đã tồn tại cho tháng/năm/loại/khu vực này.');

    return this.prisma.$transaction(async (tx) => {
      // Create period
      const period = await tx.payrollPeriod.create({
        data: { month, year, type, mode, regionId, notes },
      });

      // Generate roster: find employees matching type + region
      const empWhere: any = { status: 'ACTIVE' };
      if (type === 'DRIVER') empWhere.isDriver = true;
      if (type === 'OFFICE') empWhere.isDriver = false;
      if (regionId) empWhere.regionId = regionId;
      // null regionId = catch employees without region
      if (regionId === null) empWhere.OR = [{ regionId: null }, { regionId: undefined }];

      const employees = await tx.employee.findMany({
        where: empWhere,
        select: { id: true },
      });

      if (employees.length > 0) {
        await tx.payrollEntry.createMany({
          data: employees.map((e) => ({
            periodId: period.id,
            employeeId: e.id,
          })),
          skipDuplicates: true,
        });
      }

      writeAuditLog(this.prisma, {
        userId, action: 'CREATE', tableName: 'PayrollPeriod',
        recordId: period.id, newValues: { ...period, rosterCount: employees.length },
      }).catch(() => {});

      return { ...period, rosterCount: employees.length };
    });
  }

  /* ── Update notes (DRAFT only) ─────────────────────────────────── */
  async update(id: number, data: Record<string, unknown>, userId?: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    assertDraft(period.status);

    if (data.version !== undefined && Number(data.version) !== period.version) {
      throw new ConflictError('Dữ liệu đã bị thay đổi bởi người khác.');
    }

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        notes: data.notes !== undefined ? (data.notes as string) : period.notes,
        mode: data.mode !== undefined ? (data.mode as string) : period.mode,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return updated;
  }

  /* ── Delete (DRAFT only) ───────────────────────────────────────── */
  async delete(id: number, userId?: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    assertDraft(period.status);

    await this.prisma.payrollPeriod.delete({ where: { id } }); // cascade deletes entries + lines
    writeAuditLog(this.prisma, {
      userId, action: 'DELETE', tableName: 'PayrollPeriod',
      recordId: id, oldValues: period,
    }).catch(() => {});
    return { success: true };
  }

  /* ── Confirm: DRAFT → CONFIRMED ────────────────────────────────── */
  async confirm(id: number, userId?: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    if (period.status !== 'DRAFT') throw new ForbiddenError('Chỉ kỳ DRAFT mới được duyệt.');

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedBy: userId || null,
        confirmedAt: new Date(),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    writeAuditLog(this.prisma, {
      userId, action: 'UPDATE', tableName: 'PayrollPeriod',
      recordId: id, oldValues: { status: 'DRAFT' }, newValues: { status: 'CONFIRMED' },
    }).catch(() => {});
    return updated;
  }

  /* ── Pay: CONFIRMED → PAID ─────────────────────────────────────── */
  async markPaid(id: number, userId?: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    if (period.status !== 'CONFIRMED') throw new ForbiddenError('Chỉ kỳ đã duyệt mới được chi tiền.');

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    writeAuditLog(this.prisma, {
      userId, action: 'UPDATE', tableName: 'PayrollPeriod',
      recordId: id, oldValues: { status: 'CONFIRMED' }, newValues: { status: 'PAID' },
    }).catch(() => {});
    return updated;
  }

  /* ── Reopen: CONFIRMED → DRAFT ─────────────────────────────────── */
  async reopen(id: number, userId?: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    if (period.status === 'PAID') throw new ForbiddenError('Kỳ đã chi tiền, không thể mở lại.');
    if (period.status !== 'CONFIRMED') throw new ForbiddenError('Chỉ kỳ CONFIRMED mới mở lại được.');

    const updated = await this.prisma.payrollPeriod.update({
      where: { id },
      data: {
        status: 'DRAFT',
        confirmedBy: null,
        confirmedAt: null,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return updated;
  }

  /* ── Refresh roster: add new employees to DRAFT period ─────────── */
  async refreshRoster(id: number) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundError('Kỳ lương');
    assertDraft(period.status);

    const empWhere: any = { status: 'ACTIVE' };
    if (period.type === 'DRIVER') empWhere.isDriver = true;
    if (period.type === 'OFFICE') empWhere.isDriver = false;
    if (period.regionId) empWhere.regionId = period.regionId;
    if (period.regionId === null) empWhere.OR = [{ regionId: null }];

    const employees = await this.prisma.employee.findMany({ where: empWhere, select: { id: true } });

    const result = await this.prisma.payrollEntry.createMany({
      data: employees.map((e) => ({ periodId: period.id, employeeId: e.id })),
      skipDuplicates: true,
    });

    return { added: result.count };
  }

  /* ── List entries for a period ──────────────────────────────────── */
  async listEntries(periodId: number) {
    return this.prisma.payrollEntry.findMany({
      where: { periodId },
      include: {
        Employee: { select: { id: true, code: true, fullName: true, position: true, salaryType: true, baseSalary: true } },
        _count: { select: { PayrollLine: true } },
      },
      orderBy: { Employee: { fullName: 'asc' } },
    });
  }

  /* ── Get entry detail with lines ───────────────────────────────── */
  async getEntry(entryId: number) {
    const entry = await this.prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        Employee: { select: { id: true, code: true, fullName: true, position: true, salaryType: true, baseSalary: true } },
        PayrollLine: {
          orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
          include: { Trip: { select: { id: true, tripCode: true } } },
        },
        PayrollPeriod: { select: { id: true, status: true } },
      },
    });
    if (!entry) throw new NotFoundError('Bản lương');
    return entry;
  }

  /* ── Add line (DRAFT only) ─────────────────────────────────────── */
  async addLine(entryId: number, data: Record<string, unknown>) {
    const entry = await this.prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: { PayrollPeriod: { select: { status: true } } },
    });
    if (!entry) throw new NotFoundError('Bản lương');
    assertDraft(entry.PayrollPeriod.status);

    const line = await this.prisma.payrollLine.create({
      data: {
        entryId,
        category: data.category as string,
        lineType: data.lineType as string,
        description: (data.description as string) || null,
        amount: Number(data.amount) || 0,
        source: (data.source as string) || 'MANUAL',
        tripId: data.tripId ? Number(data.tripId) : null,
        tripDate: data.tripDate ? new Date(data.tripDate as string) : null,
      },
    });

    // Recalculate entry totals
    await this.recalcEntry(entryId);
    return line;
  }

  /* ── Update line (DRAFT only) ──────────────────────────────────── */
  async updateLine(lineId: number, data: Record<string, unknown>) {
    const line = await this.prisma.payrollLine.findUnique({
      where: { id: lineId },
      include: { PayrollEntry: { include: { PayrollPeriod: { select: { status: true } } } } },
    });
    if (!line) throw new NotFoundError('Dòng lương');
    assertDraft(line.PayrollEntry.PayrollPeriod.status);

    const updated = await this.prisma.payrollLine.update({
      where: { id: lineId },
      data: {
        category: data.category !== undefined ? (data.category as string) : undefined,
        lineType: data.lineType !== undefined ? (data.lineType as string) : undefined,
        description: data.description !== undefined ? (data.description as string) : undefined,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
      },
    });

    await this.recalcEntry(line.entryId);
    return updated;
  }

  /* ── Delete line (DRAFT only) ──────────────────────────────────── */
  async deleteLine(lineId: number) {
    const line = await this.prisma.payrollLine.findUnique({
      where: { id: lineId },
      include: { PayrollEntry: { include: { PayrollPeriod: { select: { status: true } } } } },
    });
    if (!line) throw new NotFoundError('Dòng lương');
    assertDraft(line.PayrollEntry.PayrollPeriod.status);

    await this.prisma.payrollLine.delete({ where: { id: lineId } });
    await this.recalcEntry(line.entryId);
    return { success: true };
  }

  /* ── Recalc entry totals ───────────────────────────────────────── */
  async recalcEntry(entryId: number) {
    const lines = await this.prisma.payrollLine.findMany({ where: { entryId } });
    let totalIncome = 0;
    let totalDeduction = 0;
    for (const l of lines) {
      const amt = Number(l.amount);
      if (l.category === 'INCOME') totalIncome += amt;
      else totalDeduction += amt;
    }
    await this.prisma.payrollEntry.update({
      where: { id: entryId },
      data: { totalIncome, totalDeduction, netPay: totalIncome - totalDeduction, updatedAt: new Date() },
    });
  }
}
