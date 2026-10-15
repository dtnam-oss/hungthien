/**
 * safeEnrich — R9: secondary data enrichment must not crash the primary response.
 *
 * WHY THIS EXISTS:
 * NAK had pages that added "extra info" blocks (e.g., driver stats on a trip
 * detail view). When the stats query failed, the entire API returned 500,
 * making the primary trip data inaccessible. The rule: decoration errors
 * return a fallback, never propagate.
 */

import { createLogger } from './logger.js';

const logger = createLogger('safeEnrich');

/**
 * Execute a secondary/decoration data fetch. On failure, log and return fallback.
 *
 * @example
 * const stats = await safeEnrich(() => getDriverStats(driverId), null);
 * // If getDriverStats throws, stats === null, and the main response still works.
 */
export async function safeEnrich<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`Enrichment failed${context ? ` (${context})` : ''}, using fallback`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Synchronous version for non-async decoration.
 */
export function safeEnrichSync<T>(fn: () => T, fallback: T, context?: string): T {
  try {
    return fn();
  } catch (err) {
    logger.warn(`Sync enrichment failed${context ? ` (${context})` : ''}, using fallback`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}
