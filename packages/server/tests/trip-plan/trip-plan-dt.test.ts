import { describe, it, expect } from 'vitest';
import { SORTABLE_COLUMNS, buildWhere, buildOrderBy } from '../../src/modules/trip-plan/trip-plan-dt.service.js';

describe('trip-plan /dt', () => {
  it('SORTABLE_COLUMNS matches the web column order', () => {
    expect([...SORTABLE_COLUMNS]).toEqual(['customerName', 'routeName', 'plateNumber', 'isActive']);
  });

  it('multi-value id filters become in filters', () => {
    const where = buildWhere('', { customerId: [1, 2], vehicleId: [3] });
    expect(where.customerId).toEqual({ in: [1, 2] });
    expect(where.vehicleId).toEqual({ in: [3] });
  });

  it('driverId matches primary or secondary driver', () => {
    const where = buildWhere('', { driverId: [5, 6] });
    expect(JSON.stringify(where.AND)).toContain('"primaryDriverId":{"in":[5,6]}');
    expect(JSON.stringify(where.AND)).toContain('"secondaryDriverId":{"in":[5,6]}');
  });

  it('isActive applies to rows but not to the stats base set', () => {
    expect(buildWhere('', { isActive: [true] }).isActive).toBe(true);
    expect(buildWhere('', { isActive: [true] }, false).isActive).toBeUndefined();
  });

  it('search is a case-insensitive contains and keeps the driver filter', () => {
    const where = buildWhere('abc', { driverId: [5] });
    expect(where.AND).toHaveLength(2);
    expect(JSON.stringify(where.AND)).toContain('"contains":"abc","mode":"insensitive"');
  });

  it('sorts through relations; unknown index falls back to newest first', () => {
    expect(buildOrderBy(2, 'asc')).toEqual({ Vehicle: { plateNumber: 'asc' } });
    expect(buildOrderBy(99, 'asc')).toEqual({ id: 'desc' });
  });
});
