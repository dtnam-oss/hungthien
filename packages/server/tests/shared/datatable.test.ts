import { describe, it, expect } from 'vitest';
import {
  parseDTParams, parseMulti, multiParam, multiIntParam, multiBoolParam, sortColumn, buildDTResponse,
} from '../../src/shared/datatable.js';

describe('parseMulti', () => {
  it('splits CSV', () => expect(parseMulti('A,B')).toEqual(['A', 'B']));
  it('accepts arrays', () => expect(parseMulti(['A', 'B'])).toEqual(['A', 'B']));
  it('accepts arrays holding CSV and dedupes', () => expect(parseMulti(['A,B', 'B', 'C'])).toEqual(['A', 'B', 'C']));
  it('accepts a single value', () => expect(parseMulti('A')).toEqual(['A']));
  it('returns undefined for undefined', () => expect(parseMulti(undefined)).toBeUndefined());
  it('returns undefined for empty string and blanks', () => {
    expect(parseMulti('')).toBeUndefined();
    expect(parseMulti(' , ')).toBeUndefined();
    expect(parseMulti([])).toBeUndefined();
  });
});

describe('multiParam helpers', () => {
  it('reads the bracketed array key', () => {
    expect(multiParam({ 'status[]': ['A', 'B'] }, 'status')).toEqual(['A', 'B']);
  });
  it('prefers the plain key', () => {
    expect(multiParam({ status: 'A,B' }, 'status')).toEqual(['A', 'B']);
  });
  it('parses ints and drops junk', () => {
    expect(multiIntParam({ id: '1,x,3' }, 'id')).toEqual([1, 3]);
    expect(multiIntParam({ id: 'x' }, 'id')).toBeUndefined();
  });
  it('parses booleans; both values means no filter', () => {
    expect(multiBoolParam({ f: 'true' }, 'f')).toEqual([true]);
    expect(multiBoolParam({ f: 'false' }, 'f')).toEqual([false]);
    expect(multiBoolParam({ f: 'true,false' }, 'f')).toBeUndefined();
    expect(multiBoolParam({}, 'f')).toBeUndefined();
  });
});

describe('parseDTParams', () => {
  it('applies defaults', () => {
    expect(parseDTParams({})).toEqual({
      draw: 1, start: 0, length: 100, search: '', orderCol: -1, orderDir: 'asc',
    });
  });
  it('honours defaultLength and defaultDir', () => {
    const p = parseDTParams({}, { defaultLength: 50, defaultDir: 'desc' });
    expect(p.length).toBe(50);
    expect(p.orderDir).toBe('desc');
  });
  it('clamps length to 1..500', () => {
    expect(parseDTParams({ length: '600' }).length).toBe(500);
    expect(parseDTParams({ length: '-5' }).length).toBe(1);
    expect(parseDTParams({ length: 'abc' }).length).toBe(100);
  });
  it('clamps negative start', () => {
    expect(parseDTParams({ start: '-10' }).start).toBe(0);
    expect(parseDTParams({ start: '40' }).start).toBe(40);
  });
  it('reads search and order', () => {
    const p = parseDTParams({
      draw: '7', 'search[value]': '  abc ', 'order[0][column]': '2', 'order[0][dir]': 'desc',
    });
    expect(p).toMatchObject({ draw: 7, search: 'abc', orderCol: 2, orderDir: 'desc' });
  });
  it('treats a bad order index or dir as absent', () => {
    expect(parseDTParams({ 'order[0][column]': 'zz' }).orderCol).toBe(-1);
    expect(parseDTParams({ 'order[0][column]': '-3' }).orderCol).toBe(-1);
    expect(parseDTParams({ 'order[0][dir]': 'sideways' }).orderDir).toBe('asc');
  });
});

describe('sortColumn', () => {
  const cols = ['a', 'b'] as const;
  it('maps in-range index', () => expect(sortColumn(cols, 1)).toBe('b'));
  it('returns undefined out of range', () => {
    expect(sortColumn(cols, 2)).toBeUndefined();
    expect(sortColumn(cols, -1)).toBeUndefined();
  });
});

describe('buildDTResponse', () => {
  it('merges extra keys', () => {
    const r = buildDTResponse({
      draw: 1, recordsTotal: 3, recordsFiltered: 2, data: [{ id: 1 }],
      statusStats: [{ status: 'A', count: 2 }], extra: { customerStats: [] },
    });
    expect(r).toEqual({
      draw: 1, recordsTotal: 3, recordsFiltered: 2, data: [{ id: 1 }],
      statusStats: [{ status: 'A', count: 2 }], customerStats: [],
    });
  });
});
