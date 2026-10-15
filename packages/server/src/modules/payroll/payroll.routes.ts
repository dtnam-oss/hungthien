import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { PayrollPeriodService } from './payroll-period.service.js';
import { PayrollCalcService } from './payroll-calc.service.js';

const router = Router();
const periodService = new PayrollPeriodService(prisma);
const calcService = new PayrollCalcService(prisma);

router.use(requireAuth);

// ── Periods ──────────────────────────────────────────────────────

// List periods
router.get('/periods', requirePermission('payroll', 'canView'), async (req, res, next) => {
  try {
    const filters = {
      year: req.query.year ? Number(req.query.year) : undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      regionId: req.query.regionId ? Number(req.query.regionId) : undefined,
    };
    const data = await periodService.list(filters);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Create period + roster
router.post('/periods', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const result = await periodService.create(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Get period by id
router.get('/periods/:id', requirePermission('payroll', 'canView'), async (req, res, next) => {
  try {
    const data = await periodService.getById(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Update period (notes, mode)
router.put('/periods/:id', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.update(Number(req.params.id), req.body, req.user?.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Delete period (DRAFT only)
router.delete('/periods/:id', requirePermission('payroll', 'canDelete'), async (req, res, next) => {
  try {
    await periodService.delete(Number(req.params.id), req.user?.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Confirm: DRAFT → CONFIRMED
router.post('/periods/:id/confirm', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.confirm(Number(req.params.id), req.user?.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Pay: CONFIRMED → PAID
router.post('/periods/:id/pay', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.markPaid(Number(req.params.id), req.user?.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Reopen: CONFIRMED → DRAFT
router.post('/periods/:id/reopen', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.reopen(Number(req.params.id), req.user?.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Calculate (AUTO)
router.post('/periods/:id/calculate', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const result = await calcService.calculate(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Refresh roster
router.post('/periods/:id/refresh-roster', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const result = await periodService.refreshRoster(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Diff check
router.get('/periods/:id/diff', requirePermission('payroll', 'canView'), async (req, res, next) => {
  try {
    const result = await calcService.diffCheck(Number(req.params.id));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── Entries ──────────────────────────────────────────────────────

// List entries for a period
router.get('/entries', requirePermission('payroll', 'canView'), async (req, res, next) => {
  try {
    const periodId = Number(req.query.periodId);
    if (!periodId) { res.status(400).json({ success: false, error: { message: 'periodId bắt buộc' } }); return; }
    const data = await periodService.listEntries(periodId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Get entry detail with lines
router.get('/entries/:id', requirePermission('payroll', 'canView'), async (req, res, next) => {
  try {
    const data = await periodService.getEntry(Number(req.params.id));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── Lines ────────────────────────────────────────────────────────

// Add line to entry
router.post('/entries/:entryId/lines', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.addLine(Number(req.params.entryId), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Update line
router.put('/lines/:id', requirePermission('payroll', 'canEdit'), async (req, res, next) => {
  try {
    const data = await periodService.updateLine(Number(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Delete line
router.delete('/lines/:id', requirePermission('payroll', 'canDelete'), async (req, res, next) => {
  try {
    await periodService.deleteLine(Number(req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Regions (helper) ─────────────────────────────────────────────

router.get('/regions', requirePermission('payroll', 'canView'), async (_req, res, next) => {
  try {
    const data = await prisma.region.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
