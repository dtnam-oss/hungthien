import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { NotFoundError, ConflictError, writeAuditLog } from '../../shared/index.js';

const router = Router();

router.use(requireAuth);

// List periods
router.get('/', requirePermission('trip', 'canView'), async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const [data, total] = await Promise.all([
      prisma.accountingPeriod.findMany({
        skip: (page-1)*pageSize, take: pageSize,
        orderBy: { startDate: 'desc' },
        include: { _count: { select: { Trip: true } } },
      }),
      prisma.accountingPeriod.count(),
    ]);
    const mapped = data.map(p => ({ ...p, tripCount: p._count.Trip, _count: undefined }));
    res.json({ success: true, data: mapped, pagination: { page, pageSize, total, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) { next(err); }
});

// Create period
router.post('/', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const { code, name, startDate, endDate, notes } = req.body;
    if (!code || !name || !startDate || !endDate) {
      res.status(400).json({ success: false, error: { message: 'code, name, startDate, endDate bắt buộc' } }); return;
    }
    const period = await prisma.accountingPeriod.create({
      data: { code, name, startDate: new Date(startDate), endDate: new Date(endDate), notes: notes || null },
    });
    writeAuditLog(prisma, { userId: req.user?.userId, action: 'CREATE', tableName: 'AccountingPeriod', recordId: period.id, newValues: period }).catch(() => {});
    res.status(201).json({ success: true, data: period });
  } catch (err: unknown) {
    if ((err as any).code === 'P2002') return next(new ConflictError('Mã kỳ đã tồn tại'));
    next(err);
  }
});

// Close period (R5)
router.post('/:id/close', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const period = await prisma.accountingPeriod.findUnique({ where: { id: Number(req.params.id) } });
    if (!period) throw new NotFoundError('Kỳ kế toán');
    if (period.status === 'CLOSED') throw new ConflictError('Kỳ đã khóa sổ');

    // Assign all unassigned trips in date range to this period
    await prisma.trip.updateMany({
      where: {
        tripDate: { gte: period.startDate, lte: period.endDate },
        accountingPeriodId: null,
      },
      data: { accountingPeriodId: period.id },
    });

    const updated = await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: 'CLOSED', closedAt: new Date(), closedBy: req.user?.employeeId || null, version: { increment: 1 } },
    });

    writeAuditLog(prisma, { userId: req.user?.userId, action: 'UPDATE', tableName: 'AccountingPeriod', recordId: period.id, oldValues: { status: 'OPEN' }, newValues: { status: 'CLOSED' } }).catch(() => {});
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// Reopen period (admin only, careful)
router.post('/:id/reopen', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const period = await prisma.accountingPeriod.findUnique({ where: { id: Number(req.params.id) } });
    if (!period) throw new NotFoundError('Kỳ kế toán');
    if (period.status === 'OPEN') throw new ConflictError('Kỳ đang mở');
    const updated = await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: 'OPEN', closedAt: null, closedBy: null, version: { increment: 1 } },
    });
    writeAuditLog(prisma, { userId: req.user?.userId, action: 'UPDATE', tableName: 'AccountingPeriod', recordId: period.id, oldValues: { status: 'CLOSED' }, newValues: { status: 'OPEN' } }).catch(() => {});
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
