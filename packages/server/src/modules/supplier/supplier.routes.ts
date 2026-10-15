import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { SupplierService } from './supplier.service.js';

const router = Router();
const service = new SupplierService(prisma);

router.use(requireAuth);

router.get('/', requirePermission('supplier', 'canView'), async (req, res, next) => {
  try {
    const pagination = {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    };
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
    };
    const result = await service.list(pagination, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.get('/:id', requirePermission('supplier', 'canView'), async (req, res, next) => {
  try {
    const supplier = await service.getById(Number(req.params.id));
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

router.post('/', requirePermission('supplier', 'canEdit'), async (req, res, next) => {
  try {
    const supplier = await service.create(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

router.put('/:id', requirePermission('supplier', 'canEdit'), async (req, res, next) => {
  try {
    const supplier = await service.update(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data: supplier });
  } catch (err) { next(err); }
});

router.delete('/:id', requirePermission('supplier', 'canDelete'), async (req, res, next) => {
  try {
    await service.delete(Number(req.params.id), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
