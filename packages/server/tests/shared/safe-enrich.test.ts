/**
 * R9 — Secondary data failures must not crash the primary response.
 *
 * WHY THIS TEST EXISTS:
 * NAK had pages that added "extra info" blocks (e.g., driver stats on a trip
 * detail view). When the stats query failed, the entire API returned 500,
 * making the primary trip data inaccessible. A decoration error should never
 * propagate to the user.
 */

import { describe, it, expect, vi } from 'vitest';
import { safeEnrich, safeEnrichSync } from '../../src/shared/safe-enrich.js';

describe('R9: safeEnrich — secondary failures return fallback', () => {
  it('returns the function result on success', async () => {
    const result = await safeEnrich(() => Promise.resolve('stats'), null);
    expect(result).toBe('stats');
  });

  it('returns fallback when the function throws', async () => {
    const result = await safeEnrich(
      () => Promise.reject(new Error('DB connection lost')),
      { count: 0 },
    );
    expect(result).toEqual({ count: 0 });
  });

  it('returns null fallback when function throws', async () => {
    const result = await safeEnrich(
      () => { throw new Error('Unexpected'); },
      null,
    );
    expect(result).toBeNull();
  });

  it('logs the error but does not rethrow', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await safeEnrich(
      () => Promise.reject(new Error('Stats failed')),
      null,
      'driver-stats',
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('R9: safeEnrichSync — sync version', () => {
  it('returns value on success', () => {
    const result = safeEnrichSync(() => 42, 0);
    expect(result).toBe(42);
  });

  it('returns fallback on throw', () => {
    const result = safeEnrichSync(
      () => { throw new Error('oops'); },
      -1,
    );
    expect(result).toBe(-1);
  });
});
