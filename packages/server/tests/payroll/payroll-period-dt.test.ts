import { describe, it, expect } from 'vitest';
import { SORTABLE_COLUMNS, buildWhere, buildOrderBy } from '../../src/modules/payroll/payroll-period-dt.service.js';

describe('payroll-period /dt', () => {
  it('SORTABLE_COLUMNS matches the web column order', () => {
    expect([...SORTABLE_COLUMNS]).toEqual(['year', 'month', 'type', 'status']);
  });

  it('multi-value status becomes an in filter', () => {
    const where = buildWhere('', { status: ['A', 'B'] });
    expect(where.status).toEqual({ in: ['A', 'B'] });
  });

  it('status filter is skipped for the stats base set', () => {
    const where = buildWhere('', { status: ['A'] }, false);
    expect(where.status).toBeUndefined();
  });

  it('search is a case-insensitive contains', () => {
    const where = buildWhere('abc', {});
    expect(JSON.stringify(where.OR)).toContain('"contains":"abc","mode":"insensitive"');
  });

  it('unknown sort index falls back to the default order without throwing', () => {
    expect(buildOrderBy(99, 'asc')).toEqual(buildOrderBy(-1, 'desc'));
  });
});
