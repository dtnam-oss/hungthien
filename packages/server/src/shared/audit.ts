/**
 * Audit log service — records WHO changed WHAT, WHEN, and HOW.
 *
 * WHY THIS EXISTS:
 * Every change to money-related fields and status fields must be traceable.
 * This is not optional — it's how you detect when a number changed
 * unexpectedly and who did it.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { createLogger } from './logger.js';

const logger = createLogger('audit');

export interface AuditEntry {
  /** Lấy từ req.user?.userId nên có thể undefined; ghi null khi không xác định */
  userId?: number | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT';
  tableName: string;
  recordId: number;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
}

/**
 * Write an audit log entry. This is fire-and-forget: a failure here must
 * never block the primary operation (R9 — secondary failures don't crash primary).
 */
export async function writeAuditLog(prisma: PrismaClient, entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        tableName: entry.tableName,
        recordId: entry.recordId,
        oldValues: (entry.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
        newValues: (entry.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (err) {
    // R9: audit write failure must not crash the primary operation
    logger.error('Failed to write audit log', {
      entry,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Compute the diff between old and new values for audit logging.
 * Only records fields that actually changed.
 */
export function auditDiff(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  trackedFields?: string[],
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } | null {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const fields = trackedFields ?? Object.keys(newRecord);

  for (const key of fields) {
    const oldVal = oldRecord[key];
    const newVal = newRecord[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  }

  if (Object.keys(oldValues).length === 0) return null;
  return { oldValues, newValues };
}
