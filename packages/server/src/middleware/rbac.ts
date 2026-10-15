/**
 * RBAC middleware — Module permission & Column permission enforcement.
 *
 * Module permission: controls whether a role can view/edit/delete within a module.
 * Column permission: controls which sensitive fields a role can see in API responses.
 *
 * Column permission is implemented as a response serializer: the API returns
 * full data, then the serializer strips fields the role can't see. This keeps
 * the business logic clean and permission logic centralized.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { AuthorizationError } from '../shared/errors.js';
import { safeEnrich } from '../shared/safe-enrich.js';

type PermissionLevel = 'canView' | 'canEdit' | 'canDelete';

/**
 * Check module-level permission. Use as route middleware.
 *
 * @example
 * router.get('/employees', requireAuth, requirePermission('employee', 'canView'), handler)
 */
export function requirePermission(module: string, level: PermissionLevel) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AuthorizationError();
    }

    // Admin bypasses all permission checks
    if (req.user.roleName === 'admin') {
      return next();
    }

    const permission = await prisma.modulePermission.findUnique({
      where: {
        roleId_module: {
          roleId: req.user.roleId,
          module,
        },
      },
    });

    if (!permission || !permission[level]) {
      throw new AuthorizationError(`Không có quyền ${level} cho module ${module}`);
    }

    next();
  };
}

/**
 * Get the list of columns a role can view for a module.
 * Returns null if role has no column restrictions (can see everything).
 */
export async function getHiddenColumns(roleId: number, module: string): Promise<Set<string> | null> {
  // Admin sees everything
  const columnPerms = await prisma.columnPermission.findMany({
    where: { roleId, module },
  });

  if (columnPerms.length === 0) {
    // No column permissions defined = no restrictions
    return null;
  }

  const hidden = new Set<string>();
  for (const cp of columnPerms) {
    if (!cp.canView) {
      hidden.add(cp.column);
    }
  }

  return hidden.size > 0 ? hidden : null;
}

/**
 * Strip sensitive columns from a response object based on the user's role.
 * Used by API handlers before sending the response.
 *
 * @example
 * const sanitized = await stripHiddenColumns(req.user, 'vehicle', vehicleData);
 */
export async function stripHiddenColumns<T extends Record<string, unknown>>(
  user: { roleId: number; roleName: string } | undefined,
  module: string,
  data: T,
): Promise<T>;
export async function stripHiddenColumns<T extends Record<string, unknown>>(
  user: { roleId: number; roleName: string } | undefined,
  module: string,
  data: T[],
): Promise<T[]>;
export async function stripHiddenColumns<T extends Record<string, unknown>>(
  user: { roleId: number; roleName: string } | undefined,
  module: string,
  data: T | T[],
): Promise<T | T[]> {
  if (!user || user.roleName === 'admin') return data;

  // R9: if column permission lookup fails, return data as-is rather than crashing
  const hidden = await safeEnrich(
    () => getHiddenColumns(user.roleId, module),
    null,
    'column-permission-lookup',
  );

  if (!hidden) return data;

  const strip = (record: T): T => {
    const result = { ...record };
    for (const col of hidden) {
      delete result[col];
    }
    return result;
  };

  return Array.isArray(data) ? data.map(strip) : strip(data);
}
