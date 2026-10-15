import { describe, it, expect } from 'vitest';
import { SORTABLE_COLUMNS, buildWhere, buildOrderBy } from '../../src/modules/pricing/pricing-dt.service.js';
import { ValidationError } from '../../src/shared/errors.js';

describe('pricing /dt', () => {
  it('SORTABLE_COLUMNS matches the web column order', () => {
    expect([...SORTABLE_COLUMNS]).toEqual(['customerName', 'routeName', 'tripType', 'unitPrice', 'validFrom', 'status']);
  });

  it('priceType is required', () => {
    expect(() => buildWhere('', {})).toThrow(ValidationError);
    expect(() => buildWhere('', { priceType: [] })).toThrow(ValidationError);
  });

  it('multi-value status/customerId/routeId become in filters', () => {
    const where = buildWhere('', { priceType: ['CUSTOMER'], status: ['ACTIVE', 'INACTIVE'], customerId: [1, 2], routeId: [3] });
    expect(where.priceType).toEqual({ in: ['CUSTOMER'] });
    expect(where.status).toEqual({ in: ['ACTIVE', 'INACTIVE'] });
    expect(where.customerId).toEqual({ in: [1, 2] });
    expect(where.routeId).toEqual({ in: [3] });
  });

  it('status filter is skipped for the stats base set', () => {
    expect(buildWhere('', { priceType: ['CUSTOMER'], status: ['ACTIVE'] }, false).status).toBeUndefined();
  });

  it('search is a case-insensitive contains over relation names', () => {
    const where = buildWhere('abc', { priceType: ['CUSTOMER'] });
    expect(JSON.stringify(where.OR)).toContain('"contains":"abc","mode":"insensitive"');
  });

  it('name columns sort through the relation', () => {
    expect(buildOrderBy(0, 'asc')).toEqual({ Customer: { name: 'asc' } });
    expect(buildOrderBy(1, 'desc')).toEqual({ Route: { name: 'desc' } });
  });

  it('unknown sort index falls back to the default order', () => {
    expect(buildOrderBy(99, 'asc')).toEqual({ validFrom: 'desc' });
  });
});
