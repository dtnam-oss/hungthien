import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { VehicleService } from './vehicle.service.js';

const router = Router();
const service = new VehicleService(prisma);

// All routes require auth + vehicle module permission
router.use(requireAuth);

// GET /api/vehicles — list
router.get('/', requirePermission('vehicle', 'canView'), async (req, res, next) => {
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
      ownerType: req.query.ownerType as string | undefined,
      primaryDriverId: req.query.primaryDriverId ? Number(req.query.primaryDriverId) : undefined,
    };
    const result = await service.list(pagination, filters);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/vehicles/drivers — get available drivers for assignment
router.get('/drivers', requirePermission('vehicle', 'canView'), async (_req, res, next) => {
  try {
    const drivers = await service.getDriversForAssignment();
    res.json({ success: true, data: drivers });
  } catch (err) { next(err); }
});

// GET /api/vehicles/:id — detail
router.get('/:id', requirePermission('vehicle', 'canView'), async (req, res, next) => {
  try {
    const vehicle = await service.getById(Number(req.params.id));
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
});

// POST /api/vehicles — create
router.post('/', requirePermission('vehicle', 'canEdit'), async (req, res, next) => {
  try {
    const vehicle = await service.create(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) { next(err); }
});

// PUT /api/vehicles/:id — update
router.put('/:id', requirePermission('vehicle', 'canEdit'), async (req, res, next) => {
  try {
    const vehicle = await service.update(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data: vehicle });
  } catch (err) { next(err); }
});

// DELETE /api/vehicles/:id — delete
router.delete('/:id', requirePermission('vehicle', 'canDelete'), async (req, res, next) => {
  try {
    await service.delete(Number(req.params.id), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ---- Finance sub-routes ----

// GET /api/vehicles/:id/finance
router.get('/:id/finance', requirePermission('vehicle', 'canView'), async (req, res, next) => {
  try {
    const finance = await service.getFinance(Number(req.params.id));
    res.json({ success: true, data: finance });
  } catch (err) { next(err); }
});

// PUT /api/vehicles/:id/finance
router.put('/:id/finance', requirePermission('vehicle', 'canEdit'), async (req, res, next) => {
  try {
    const finance = await service.upsertFinance(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data: finance });
  } catch (err) { next(err); }
});

// ---- Inspection sub-routes ----

// GET /api/vehicles/:id/inspections
router.get('/:id/inspections', requirePermission('vehicle', 'canView'), async (req, res, next) => {
  try {
    const inspections = await service.listInspections(Number(req.params.id));
    res.json({ success: true, data: inspections });
  } catch (err) { next(err); }
});

// POST /api/vehicles/:id/inspections
router.post('/:id/inspections', requirePermission('vehicle', 'canEdit'), async (req, res, next) => {
  try {
    const inspection = await service.createInspection(Number(req.params.id), req.body, req.user?.userId);
    res.status(201).json({ success: true, data: inspection });
  } catch (err) { next(err); }
});

export default router;
