import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { TripService } from './trip.service.js';
import { TripsDTService } from './trips-dt.service.js';
import type { DTParams } from './trips-dt.service.js';
import { parseDTParams, multiParam } from '../../shared/index.js';

const router = Router();
const service = new TripService(prisma);
const dtService = new TripsDTService(prisma);

router.use(requireAuth);

// DataTables server-side endpoint
router.get('/dt', requirePermission('trip', 'canView'), async (req, res, next) => {
  try {
    const params: DTParams = {
      ...parseDTParams(req.query, { defaultLength: 100, defaultDir: 'desc' }),
      customerId: req.query.customerId ? Number(req.query.customerId) : undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
      supplierId: req.query.supplierId ? Number(req.query.supplierId) : undefined,
      status: multiParam(req.query, 'status'),
    };
    const result = await dtService.query(params);
    res.json(result);
  } catch (err) { next(err); }
});

// Dashboard
router.get('/dashboard', requirePermission('trip', 'canView'), async (req, res, next) => {
  try {
    const data = await service.getDashboard(
      req.query.dateFrom as string | undefined,
      req.query.dateTo as string | undefined,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Driver's trips
router.get('/my-trips', async (req, res, next) => {
  try {
    const employeeId = req.user?.employeeId;
    if (!employeeId) { res.status(403).json({ success: false, error: { message: 'Không có thông tin nhân viên' } }); return; }
    const pagination = {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
    };
    const result = await service.listDriverTrips(employeeId, pagination);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// Update trip status (for drivers)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = await service.updateTripStatus(Number(req.params.id), req.body.status, req.user?.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// List
router.get('/', requirePermission('trip', 'canView'), async (req, res, next) => {
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
      vehicleId: req.query.vehicleId ? Number(req.query.vehicleId) : undefined,
      driverId: req.query.driverId ? Number(req.query.driverId) : undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };
    const result = await service.list(pagination, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// Get by id
router.get('/:id', requirePermission('trip', 'canView'), async (req, res, next) => {
  try {
    const trip = await service.getById(Number(req.params.id));
    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

// Create
router.post('/', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const trip = await service.create(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: trip });
  } catch (err) { next(err); }
});

// Update
router.put('/:id', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const trip = await service.update(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data: trip });
  } catch (err) { next(err); }
});

// Delete
router.delete('/:id', requirePermission('trip', 'canDelete'), async (req, res, next) => {
  try {
    await service.delete(Number(req.params.id), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// TripCost
router.post('/:id/costs', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    const cost = await service.addCost(Number(req.params.id), req.body, req.user?.userId);
    res.status(201).json({ success: true, data: cost });
  } catch (err) { next(err); }
});

router.delete('/:id/costs/:costId', requirePermission('trip', 'canEdit'), async (req, res, next) => {
  try {
    await service.deleteCost(Number(req.params.id), Number(req.params.costId), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
