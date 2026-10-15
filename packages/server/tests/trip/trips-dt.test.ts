import { describe, it, expect } from 'vitest';
import { buildWhere } from '../../src/modules/trip/trips-dt.service.js';
import type { DTParams } from '../../src/modules/trip/trips-dt.service.js';

const base: DTParams = { draw: 1, start: 0, length: 100, search: '', orderCol: -1, orderDir: 'desc' };

describe('trips /dt where builder', () => {
  it('multi-value status becomes an in filter', () => {
    expect(buildWhere({ ...base, status: ['PLANNED', 'DISPATCHED'] }).status).toEqual({ in: ['PLANNED', 'DISPATCHED'] });
  });

  it('status is omitted for the stats base set', () => {
    expect(buildWhere({ ...base, status: ['PLANNED'] }, false).status).toBeUndefined();
  });

  it('search is a case-insensitive contains', () => {
    const where = buildWhere({ ...base, search: 'abc' });
    expect(JSON.stringify(where.AND)).toContain('"contains":"abc","mode":"insensitive"');
  });

  it('driver filter matches primary or secondary driver', () => {
    const where = buildWhere({ ...base, driverId: 9 });
    expect(where.OR).toEqual([{ primaryDriverId: 9 }, { secondaryDriverId: 9 }]);
  });
});
