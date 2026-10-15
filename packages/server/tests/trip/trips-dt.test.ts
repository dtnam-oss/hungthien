import { describe, it, expect } from 'vitest';
import { buildOrderBy, buildWhere, SORTABLE_COLUMNS } from '../../src/modules/trip/trips-dt.service.js';
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

  it('multi-value driver filter matches primary or secondary driver', () => {
    const where = buildWhere({ ...base, driverId: [9, 10] });
    expect(where.OR).toEqual([{ primaryDriverId: { in: [9, 10] } }, { secondaryDriverId: { in: [9, 10] } }]);
  });
});

describe('trips /dt multi filters', () => {
  it('customer and supplier become in filters', () => {
    const where = buildWhere({ ...base, customerId: [1, 2], supplierId: [3] });
    expect(where.customerId).toEqual({ in: [1, 2] });
    expect(where.Vehicle).toEqual({ supplierId: { in: [3] } });
  });
});

describe('trips /dt sorting', () => {
  it('exposes a contiguous sortable column list', () => {
    expect([...SORTABLE_COLUMNS]).toEqual(['route', 'customer', 'plate', 'status', 'supplier']);
  });

  it('maps each index to its column', () => {
    expect(buildOrderBy(0, 'asc')[0]).toEqual({ Route: { name: 'asc' } });
    expect(buildOrderBy(1, 'desc')[0]).toEqual({ Customer: { name: 'desc' } });
    expect(buildOrderBy(2, 'asc')[0]).toEqual({ Vehicle: { plateNumber: 'asc' } });
    expect(buildOrderBy(3, 'asc')[0]).toEqual({ status: 'asc' });
    expect(buildOrderBy(4, 'desc')[0]).toEqual({ Vehicle: { Supplier: { name: 'desc' } } });
  });

  it('falls back to tripDate desc, id desc for unknown indexes', () => {
    const fallback = [{ tripDate: 'desc' }, { id: 'desc' }];
    expect(buildOrderBy(-1, 'asc')).toEqual(fallback);
    expect(buildOrderBy(5, 'asc')).toEqual(fallback);
  });
});
