import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { PricingService } from './pricing.service.js';
import { parseDTParams, multiParam, multiIntParam } from '../../shared/index.js';
import { PricingDTService } from './pricing-dt.service.js';
const dtService = new PricingDTService(prisma);

const router = Router();
const service = new PricingService(prisma);

router.use(requireAuth);

// GET /api/pricing/dt — DataTables server-side listing (priceType required)
router.get('/dt', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const params = parseDTParams(req.query);
    res.json(await dtService.query(params, {
      priceType: multiParam(req.query, 'priceType'),
      status: multiParam(req.query, 'status'),
      customerId: multiIntParam(req.query, 'customerId'),
      routeId: multiIntParam(req.query, 'routeId'),
    }));
  } catch (err) { next(err); }
});

// GET /api/pricing — list
router.get('/', requirePermission('pricing', 'canView'), async (req, res, next) => {
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
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      routeId: req.query.routeId ? Number(req.query.routeId) : undefined,
      priceType: req.query.priceType as string | undefined,
    };
    const result = await service.list(pagination, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/pricing/lookup — tra giá (R1)
router.get('/lookup', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const { customerId, routeId, tripType, referenceDate } = req.query;
    if (!customerId || !routeId) {
      res.status(400).json({ success: false, error: { message: 'customerId và routeId bắt buộc' } });
      return;
    }
    const result = await service.lookup({
      customerId: Number(customerId),
      routeId: Number(routeId),
      tripType: (tripType as string) || 'STANDARD',
      referenceDate: referenceDate ? new Date(referenceDate as string) : new Date(),
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/pricing/:id
router.get('/:id', requirePermission('pricing', 'canView'), async (req, res, next) => {
  try {
    const row = await service.getById(Number(req.params.id));
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// POST /api/pricing
router.post('/', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    const row = await service.create(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: row });
  } catch (err) { next(err); }
});

// PUT /api/pricing/:id
router.put('/:id', requirePermission('pricing', 'canEdit'), async (req, res, next) => {
  try {
    const row = await service.update(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// DELETE /api/pricing/:id
router.delete('/:id', requirePermission('pricing', 'canDelete'), async (req, res, next) => {
  try {
    await service.delete(Number(req.params.id), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
