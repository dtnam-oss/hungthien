/**
 * Employee routes — CRUD API for employee management.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { EmployeeService } from './employee.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission, stripHiddenColumns, getHiddenColumns } from '../../middleware/rbac.js';
import { parsePagination, paginatedResponse } from '../../shared/index.js';
import { parseDTParams, multiParam, multiBoolParam } from '../../shared/index.js';
import { EmployeeDTService } from './employee-dt.service.js';
const dtService = new EmployeeDTService(prisma);

const router = Router();
const service = new EmployeeService(prisma);

// All employee routes require authentication
router.use(requireAuth);

/**
 * GET /api/employees/dt — DataTables server-side listing (must precede /:id)
 */
router.get('/dt', requirePermission('employee', 'canView'), async (req: Request, res: Response, next) => {
  try {
    const params = parseDTParams(req.query);
    // Cột bị ẩn theo vai trò không được dùng để tìm, sắp xếp hay lọc (tránh suy ra giá trị)
    const hidden = req.user && req.user.roleName !== 'admin' ? await getHiddenColumns(req.user.roleId, 'employee') : null;
    const result = await dtService.query(params, {
      status: multiParam(req.query, 'status'),
      isDriver: multiBoolParam(req.query, 'isDriver'),
      department: hidden?.has('department') ? undefined : multiParam(req.query, 'department'),
    }, hidden ?? undefined);
    const data = await stripHiddenColumns(req.user, 'employee', result.data as unknown as Record<string, unknown>[]);
    res.json({ ...result, data });
  } catch (err) { next(err); }
});

/**
 * GET /api/employees — paginated list with search and filters
 */
router.get(
  '/',
  requirePermission('employee', 'canView'),
  async (req: Request, res: Response) => {
    const pagination = parsePagination(req.query as Record<string, unknown>);
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      isDriver: req.query.isDriver === 'true' ? true : req.query.isDriver === 'false' ? false : undefined,
      department: req.query.department as string | undefined,
    };

    const { data, total } = await service.list(pagination, filters);
    const sanitized = await stripHiddenColumns(req.user, 'employee', data as unknown as Record<string, unknown>[]);

    res.json({
      success: true,
      ...paginatedResponse(sanitized, total, pagination),
    });
  },
);

/**
 * GET /api/employees/:id — single employee detail
 */
router.get(
  '/:id',
  requirePermission('employee', 'canView'),
  async (req: Request, res: Response) => {
    const employee = await service.getById(Number(req.params.id));
    const sanitized = await stripHiddenColumns(req.user, 'employee', employee as unknown as Record<string, unknown>);

    res.json({ success: true, data: sanitized });
  },
);

/**
 * POST /api/employees — create new employee
 */
router.post(
  '/',
  requirePermission('employee', 'canEdit'),
  async (req: Request, res: Response) => {
    const employee = await service.create(req.body, req.user?.userId ?? null);
    res.status(201).json({ success: true, data: employee });
  },
);

/**
 * PUT /api/employees/:id — update employee (patch semantics: R8)
 */
router.put(
  '/:id',
  requirePermission('employee', 'canEdit'),
  async (req: Request, res: Response) => {
    const employee = await service.update(
      Number(req.params.id),
      req.body,
      req.user?.userId ?? null,
    );
    res.json({ success: true, data: employee });
  },
);

/**
 * DELETE /api/employees/:id — soft delete (set INACTIVE)
 */
router.delete(
  '/:id',
  requirePermission('employee', 'canDelete'),
  async (req: Request, res: Response) => {
    await service.delete(Number(req.params.id), req.user?.userId ?? null);
    res.json({ success: true, message: 'Nhân viên đã được vô hiệu hóa' });
  },
);

export default router;
