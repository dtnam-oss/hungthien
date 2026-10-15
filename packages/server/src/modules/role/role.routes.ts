/**
 * Role routes — CRUD for roles, permission matrix, and user-role assignment.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { RoleService } from './role.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

const router = Router();
const service = new RoleService(prisma);

router.use(requireAuth);

/* ── Role CRUD ─────────────────────────────────────────────────────── */

/** GET /api/roles — list all roles */
router.get('/', requirePermission('role', 'canView'), async (_req: Request, res: Response) => {
  const roles = await service.list();
  res.json({ success: true, data: roles });
});

/** GET /api/roles/employees — list employees with user accounts */
router.get('/employees', requirePermission('role', 'canView'), async (_req: Request, res: Response) => {
  const employees = await service.listEmployeesWithUsers();
  res.json({ success: true, data: employees });
});

/** GET /api/roles/users — list all user accounts */
router.get('/users', requirePermission('role', 'canView'), async (_req: Request, res: Response) => {
  const users = await service.listUsers();
  res.json({ success: true, data: users });
});

/** GET /api/roles/:id — role detail with permissions */
router.get('/:id', requirePermission('role', 'canView'), async (req: Request, res: Response) => {
  const role = await service.getById(Number(req.params.id));
  if (!role) { res.status(404).json({ success: false, error: 'Vai trò không tồn tại' }); return; }
  res.json({ success: true, data: role });
});

/** POST /api/roles — create role */
router.post('/', requirePermission('role', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const role = await service.create(req.body);
    res.status(201).json({ success: true, data: role });
  } catch (err: any) {
    const msg = err.code === 'P2002' ? 'Tên vai trò đã tồn tại' : err.message;
    res.status(400).json({ success: false, error: msg });
  }
});

/* ── User-Role Assignment (must be before /:id) ────────────────────── */

/** PUT /api/roles/assign/:userId — assign role to user */
router.put('/assign/:userId', requirePermission('role', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { roleId } = req.body;
    if (!roleId) { res.status(400).json({ success: false, error: 'Thiếu roleId' }); return; }
    const user = await service.assignRole(Number(req.params.userId), Number(roleId));
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/** PUT /api/roles/:id — update role name/description */
router.put('/:id', requirePermission('role', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const role = await service.update(Number(req.params.id), req.body);
    res.json({ success: true, data: role });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/** DELETE /api/roles/:id — delete role */
router.delete('/:id', requirePermission('role', 'canDelete'), async (req: Request, res: Response) => {
  try {
    await service.delete(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ── Permission Matrix ─────────────────────────────────────────────── */

/** PUT /api/roles/:id/permissions — save permission matrix */
router.put('/:id/permissions', requirePermission('role', 'canEdit'), async (req: Request, res: Response) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, error: 'permissions phải là mảng' });
      return;
    }
    const role = await service.savePermissions(Number(req.params.id), permissions);
    res.json({ success: true, data: role });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
