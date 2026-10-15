/**
 * Auth middleware — JWT-based authentication.
 *
 * The token payload carries: { userId, roleId, employeeId?, isDriver }
 * This lets us route drivers to the driver portal and check permissions
 * without an extra DB call on every request.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../shared/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ht-tms-dev-secret-change-in-production';

export interface TokenPayload {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
  employeeId: number | null;
  isDriver: boolean;
}

// Extend Express Request to carry authenticated user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Generate a JWT for a successfully authenticated user.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify and decode a JWT. Returns the payload or throws.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Express middleware: require a valid JWT in the Authorization header.
 * Sets req.user on success.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AuthenticationError('Token không hợp lệ hoặc đã hết hạn');
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw new AuthenticationError('Token không hợp lệ hoặc đã hết hạn');
  }
}

/**
 * Optional auth: sets req.user if token present, but doesn't block if absent.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // Token invalid — treat as unauthenticated
    }
  }
  next();
}
