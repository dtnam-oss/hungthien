import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { validatePayload, validateEnum, patchSemantics, writeAuditLog, auditDiff, NotFoundError, ConflictError } from '../../shared/index.js';
import type { FieldRule } from '../../shared/index.js';

const router = Router();

const CREATE_RULES: FieldRule[] = [
  { field: 'code', label: 'Mã tuyến', required: true, type: 'string', minLength: 1, maxLength: 50 },
  { field: 'name', label: 'Tên tuyến', required: true, type: 'string', minLength: 1, maxLength: 200 },
];
const STATUS = ['ACTIVE', 'INACTIVE'] as const;
const COLUMNS = ['code','name','origin','destination','distanceKm','estimatedHours','status','notes'] as const;

router.use(requireAuth);

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
        { origin: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (req.query.status) where.status = req.query.status;
    // Filter routes by customer: only routes with active PricingRow for this customer
    if (req.query.customerId) {
      where.PricingRow = {
        some: {
          customerId: Number(req.query.customerId),
          status: 'ACTIVE',
        },
      };
    }
    const [data, total] = await Promise.all([
      prisma.route.findMany({ where: where as any, skip: (page-1)*pageSize, take: pageSize, orderBy: { code: 'asc' } }),
      prisma.route.count({ where: where as any }),
    ]);
    res.json({ success: true, data, pagination: { page, pageSize, total, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) { next(err); }
});

router.get('/:id', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const r = await prisma.route.findUnique({ where: { id: Number(req.params.id) } });
    if (!r) throw new NotFoundError('Tuyến đường');
    res.json({ success: true, data: r });
  } catch (err) { next(err); }
});

router.post('/', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    validatePayload(req.body, CREATE_RULES);
    validateEnum('status', req.body.status, [...STATUS], 'Trạng thái');
    const r = await prisma.route.create({
      data: {
        code: req.body.code, name: req.body.name,
        origin: req.body.origin || null, destination: req.body.destination || null,
        distanceKm: req.body.distanceKm ? Number(req.body.distanceKm) : null,
        estimatedHours: req.body.estimatedHours ? Number(req.body.estimatedHours) : null,
        status: req.body.status || 'ACTIVE', notes: req.body.notes || null,
      },
    });
    writeAuditLog(prisma, { userId: req.user?.userId, action: 'CREATE', tableName: 'Route', recordId: r.id, newValues: r }).catch(() => {});
    res.status(201).json({ success: true, data: r });
  } catch (err: unknown) {
    if ((err as any).code === 'P2002') return next(new ConflictError('Mã tuyến đã tồn tại'));
    next(err);
  }
});

router.put('/:id', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    const existing = await prisma.route.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) throw new NotFoundError('Tuyến đường');
    if (req.body.version !== undefined && Number(req.body.version) !== existing.version) {
      throw new ConflictError('Dữ liệu đã thay đổi.');
    }
    validateEnum('status', req.body.status, [...STATUS], 'Trạng thái');
    const merged = patchSemantics(existing, req.body);
    const updateData: Record<string, unknown> = {};
    for (const col of COLUMNS) {
      if (merged[col] !== undefined) {
        if (col === 'distanceKm' || col === 'estimatedHours') {
          updateData[col] = merged[col] ? Number(merged[col]) : null;
        } else {
          updateData[col] = merged[col];
        }
      }
    }
    const updated = await prisma.route.update({ where: { id: existing.id }, data: { ...updateData, version: { increment: 1 }, updatedAt: new Date() } });
    const diff = auditDiff(existing, updated);
    if (diff && Object.keys(diff.newValues).length > 0) {
      writeAuditLog(prisma, { userId: req.user?.userId, action: 'UPDATE', tableName: 'Route', recordId: existing.id, oldValues: diff.oldValues, newValues: diff.newValues }).catch(() => {});
    }
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    if ((err as any).code === 'P2002') return next(new ConflictError('Mã tuyến đã tồn tại'));
    next(err);
  }
});

router.delete('/:id', requirePermission('pricing', 'canDelete'), async (req, res, next) => {
  try {
    const existing = await prisma.route.findUnique({ where: { id: Number(req.params.id) }, include: { _count: { select: { PricingRow: true } } } });
    if (!existing) throw new NotFoundError('Tuyến đường');
    if (existing._count.PricingRow > 0) throw new ConflictError(`Không thể xóa: đang có ${existing._count.PricingRow} dòng giá liên kết`);
    await prisma.route.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
