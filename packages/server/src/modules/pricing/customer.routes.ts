import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validatePayload, validateEnum, patchSemantics, writeAuditLog, auditDiff, NotFoundError, ConflictError } from '../../shared/index.js';
import type { FieldRule } from '../../shared/index.js';

const router = Router();

const CREATE_RULES: FieldRule[] = [
  { field: 'code', label: 'Mã KH', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'name', label: 'Tên KH', required: true, type: 'string', minLength: 1, maxLength: 200 },
];
const STATUS = ['ACTIVE', 'INACTIVE'] as const;
const COLUMNS = ['code','name','shortName','taxCode','phone','email','address','contactPerson','status','notes'] as const;

router.use(requireAuth);

// Next code — auto generate
router.get('/next-code', requirePermission('pricing', 'canView'), async (_req, res, next) => {
  try {
    const last = await prisma.customer.findFirst({
      where: { code: { startsWith: 'KH' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let nextNum = 1;
    if (last?.code) {
      const match = last.code.match(/KH(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const nextCode = `KH${String(nextNum).padStart(3, '0')}`;
    res.json({ success: true, data: nextCode });
  } catch (err) { next(err); }
});

const SORTABLE_COLUMNS = ['code', 'name', 'taxCode', 'email', 'phone', 'status'] as const;

// DataTable server-side endpoint
router.get('/dt', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const draw = Number(req.query.draw) || 1;
    const start = Number(req.query.start) || 0;
    const length = Number(req.query.length) || 50;
    const searchValue = (req.query['search[value]'] as string) || '';
    const orderCol = Number(req.query['order[0][column]']) || 0;
    const orderDir = (req.query['order[0][dir]'] as 'asc' | 'desc') || 'asc';
    const statusFilter = req.query.status as string | undefined;

    // Build where
    const where: any = {};
    if (searchValue) {
      where.OR = [
        { code: { contains: searchValue, mode: 'insensitive' } },
        { name: { contains: searchValue, mode: 'insensitive' } },
        { taxCode: { contains: searchValue, mode: 'insensitive' } },
        { email: { contains: searchValue, mode: 'insensitive' } },
        { phone: { contains: searchValue, mode: 'insensitive' } },
      ];
    }
    if (statusFilter) where.status = statusFilter;

    // Sort
    const sortCol = SORTABLE_COLUMNS[orderCol] || 'name';
    const orderBy = { [sortCol]: orderDir };

    const [data, recordsFiltered, recordsTotal, statusStats] = await Promise.all([
      prisma.customer.findMany({ where, skip: start, take: length, orderBy }),
      prisma.customer.count({ where }),
      prisma.customer.count(),
      prisma.customer.groupBy({ by: ['status'], _count: { status: true } }),
    ]);

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data,
      statusStats: statusStats.map((s) => ({ status: s.status, count: s._count.status })),
      customerStats: [],
    });
  } catch (err) { next(err); }
});

// List
router.get('/', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const search = req.query.search as string | undefined;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (req.query.status) where.status = req.query.status;
    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where: where as any, skip: (page-1)*pageSize, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.customer.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page, pageSize, total, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) { next(err); }
});

// Get by id
router.get('/:id', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const c = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
    if (!c) throw new NotFoundError('Khách hàng');
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
});

// Create
router.post('/', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    validatePayload(req.body, CREATE_RULES);
    validateEnum('status', req.body.status, [...STATUS], 'Trạng thái');
    const c = await prisma.customer.create({
      data: {
        code: req.body.code, name: req.body.name,
        shortName: req.body.shortName || null, taxCode: req.body.taxCode || null,
        phone: req.body.phone || null, email: req.body.email || null,
        address: req.body.address || null, contactPerson: req.body.contactPerson || null,
        status: req.body.status || 'ACTIVE', notes: req.body.notes || null,
      },
    });
    writeAuditLog(prisma, { userId: req.user?.userId, action: 'CREATE', tableName: 'Customer', recordId: c.id, newValues: c }).catch(() => {});
    res.status(201).json({ success: true, data: c });
  } catch (err: unknown) {
    if ((err as any).code === 'P2002') return next(new ConflictError('Mã KH đã tồn tại'));
    next(err);
  }
});

// Update
router.put('/:id', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new NotFoundError('Khách hàng');
    if (req.body.version !== undefined && Number(req.body.version) !== existing.version) {
      throw new ConflictError('Dữ liệu đã thay đổi.');
    }
    validateEnum('status', req.body.status, [...STATUS], 'Trạng thái');
    const merged = patchSemantics(existing, req.body);
    const updateData: Record<string, unknown> = {};
    for (const col of COLUMNS) { if (merged[col] !== undefined) updateData[col] = merged[col]; }
    const updated = await prisma.customer.update({ where: { id: existing.id }, data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() } });
    const diff = auditDiff(existing, updated);
    if (diff && Object.keys(diff.newValues).length > 0) {
      writeAuditLog(prisma, { userId: req.user?.userId, action: 'UPDATE', tableName: 'Customer', recordId: existing.id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    if ((err as any).code === 'P2002') return next(new ConflictError('Mã KH đã tồn tại'));
    next(err);
  }
});

// Delete
router.delete('/:id', requirePermission('pricing', 'canDelete'), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: Number(req.params.id) }, include: { _count: { select: { PricingRow: true } } } });
    if (!existing) throw new NotFoundError('Khách hàng');
    if (existing._count.PricingRow > 0) throw new ConflictError(`Không thể xóa: đang có ${existing._count.PricingRow} dòng giá liên kết`);
    await prisma.customer.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
