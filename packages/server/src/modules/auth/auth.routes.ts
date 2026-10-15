/**
 * Auth routes — login and current user info.
 *
 * Driver login: same credentials, same endpoint. After login, the frontend
 * checks `isDriver` in the token to route to the driver portal.
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../prisma.js';
import { generateToken, requireAuth } from '../../middleware/auth.js';
import { ValidationError, AuthenticationError } from '../../shared/errors.js';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token, user: { userId, username, roleName, employeeId, isDriver } }
 */
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ValidationError('Tên đăng nhập và mật khẩu là bắt buộc', {
      fields: {
        ...(username ? {} : { username: 'Tên đăng nhập là bắt buộc' }),
        ...(password ? {} : { password: 'Mật khẩu là bắt buộc' }),
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      Role: true,
      Employee: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không đúng');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không đúng');
  }

  // Update last login time (fire-and-forget, R9)
  prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});

  const payload = {
    userId: user.id,
    username: user.username,
    roleId: user.roleId,
    roleName: user.Role.name,
    employeeId: user.employeeId,
    isDriver: user.Employee?.isDriver ?? false,
  };

  const token = generateToken(payload);

  res.json({
    success: true,
    data: {
      token,
      user: payload,
    },
  });
});

/**
 * GET /api/auth/me — current authenticated user info
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      Role: {
        include: {
          ModulePermission: true,
          ColumnPermission: true,
        },
      },
      Employee: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('Tài khoản không tồn tại');
  }

  res.json({
    success: true,
    data: {
      userId: user.id,
      username: user.username,
      roleName: user.Role.name,
      employeeId: user.employeeId,
      isDriver: user.Employee?.isDriver ?? false,
      employee: user.Employee,
      permissions: user.Role.ModulePermission,
      columnPermissions: user.Role.ColumnPermission,
    },
  });
});

export default router;
