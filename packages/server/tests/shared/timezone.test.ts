/**
 * R2 — Timezone tests: toVNDate must convert UTC instants to Vietnam calendar dates.
 *
 * WHY THIS TEST EXISTS:
 * Postgres DATE extracts the date part in UTC. A trip at 00:30 Vietnam time
 * has a UTC instant of 17:30 the *previous* day. Using `new Date()` directly
 * shifts the operational date by one day, which causes entire report periods
 * to be off — not just one row. This happened in NAK production.
 */

import { describe, it, expect } from 'vitest';
import { toVNDate, toVNDateString, toVNMonthRange } from '../../src/shared/timezone.js';

describe('R2: toVNDate — Vietnam timezone anchoring', () => {
  it('converts 00:30 VN (17:30 UTC previous day) to the correct VN date', () => {
    // 2026-01-16 00:30 VN = 2026-01-15 17:30 UTC
    const instant = new Date('2026-01-15T17:30:00.000Z');
    const vnDate = toVNDate(instant);

    expect(vnDate.toISOString()).toBe('2026-01-16T00:00:00.000Z');
  });

  it('keeps 23:59 VN on the same VN date', () => {
    // 2026-01-16 23:59 VN = 2026-01-16 16:59 UTC
    const instant = new Date('2026-01-16T16:59:00.000Z');
    const vnDate = toVNDate(instant);

    expect(vnDate.toISOString()).toBe('2026-01-16T00:00:00.000Z');
  });

  it('handles midnight VN exactly (00:00 VN = 17:00 UTC prev day)', () => {
    // 2026-03-01 00:00 VN = 2026-02-28 17:00 UTC
    const instant = new Date('2026-02-28T17:00:00.000Z');
    const vnDate = toVNDate(instant);

    expect(vnDate.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('handles year boundary correctly', () => {
    // 2027-01-01 00:30 VN = 2026-12-31 17:30 UTC
    const instant = new Date('2026-12-31T17:30:00.000Z');
    const vnDate = toVNDate(instant);

    expect(vnDate.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('handles daytime UTC correctly (no shift needed)', () => {
    // 2026-06-15 10:00 UTC = 2026-06-15 17:00 VN — same date
    const instant = new Date('2026-06-15T10:00:00.000Z');
    const vnDate = toVNDate(instant);

    expect(vnDate.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
});

describe('R2: toVNDateString', () => {
  it('returns YYYY-MM-DD string in VN timezone', () => {
    const instant = new Date('2026-01-15T17:30:00.000Z');
    expect(toVNDateString(instant)).toBe('2026-01-16');
  });
});

describe('R2: toVNMonthRange — period boundaries for reports', () => {
  it('returns correct range for January 2026', () => {
    const { start, end } = toVNMonthRange(2026, 1);
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('handles December → January year boundary', () => {
    const { start, end } = toVNMonthRange(2026, 12);
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
