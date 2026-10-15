import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { TripPlanService } from './trip-plan.service.js';
import { parseDTParams, multiBoolParam, multiIntParam, multiParam } from '../../shared/index.js';
import { TripPlanDTService } from './trip-plan-dt.service.js';
const dtService = new TripPlanDTService(prisma);

const router = Router();
const service = new TripPlanService(prisma);

router.use(requireAuth);

// DataTables server-side listing (must precede /:id)
router.get('/dt', requirePermission('trip', 'canView'), async (req, res, next) => {
  try {
    const params = parseDTParams(req.query);
    // Rail trạng thái gửi status=ACTIVE,INACTIVE; map về isActive (chọn cả hai → không lọc)
    const statusFilter = multiParam(req.query, 'status');
    const isActiveFromStatus: boolean[] | undefined = statusFilter
      ? (() => { const v = [...new Set(statusFilter.map((x) => x.toUpperCase() === 'ACTIVE'))]; return v.length === 1 ? v : undefined; })()
      : undefined;
    res.json(await dtService.query(params, {
      isActive: multiBoolParam(req.query, 'isActive') ?? isActiveFromStatus,
      customerId: multiIntParam(req.query, 'customerId'),
      vehicleId: multiIntParam(req.query, 'vehicleId'),
      driverId: multiIntParam(req.query, 'driverId'),
    }));
  } catch (err) { next(err); }
});

// List
router.get('/', requirePermission('trip', 'canView'), async (req, res) => {
  try {
    const { page, pageSize, search, customerId } = req.query;
    const result = await service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search as string | undefined,
      customerId: customerId ? Number(customerId) : undefined,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Get by ID
router.get('/:id', requirePermission('trip', 'canView'), async (req, res) => {
  try {
    const plan = await service.getById(Number(req.params.id));
    if (!plan) return res.status(404).json({ error: 'Không tìm thấy kế hoạch' });
    res.json(plan);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Create
router.post('/', requirePermission('trip', 'canEdit'), async (req, res) => {
  try {
    const plan = await service.create(req.body);
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Update
router.put('/:id', requirePermission('trip', 'canEdit'), async (req, res) => {
  try {
    const plan = await service.update(Number(req.params.id), req.body);
    res.json(plan);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', requirePermission('trip', 'canDelete'), async (req, res) => {
  try {
    const result = await service.remove(Number(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Toggle active
router.patch('/:id/toggle', requirePermission('trip', 'canEdit'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const plan = await service.toggleActive(Number(req.params.id), isActive);
    res.json(plan);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Generate trips from plans
router.post('/generate', requirePermission('trip', 'canEdit'), async (req, res) => {
  try {
    const { startDate, endDate, planIds } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'Vui lòng chọn khoảng ngày' });
    const result = await service.generateTrips({ startDate, endDate, planIds });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
