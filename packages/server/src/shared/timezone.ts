/**
 * toVNDate — Convert a UTC instant to the calendar date in Asia/Ho_Chi_Minh,
 * then anchor that date to 00:00Z so it stores cleanly as a Postgres DATE.
 *
 * WHY THIS EXISTS (R2):
 * Postgres DATE extracts the date part from the instant in UTC. A trip at
 * 00:30 Vietnam time has a UTC instant of 17:30 the previous day. Writing
 * `new Date()` directly shifts the operational date by one day. This caused
 * period-boundary errors in NAK — entire report periods were off, not just
 * single rows.
 *
 * Uses 'sv-SE' locale for deterministic YYYY-MM-DD formatting — it does not
 * depend on the server's system locale.
 */

/**
 * Convert a UTC instant to the Vietnam calendar date anchored at 00:00Z.
 * @example
 * // 2026-01-16 00:30 VN = 2026-01-15 17:30 UTC
 * toVNDate(new Date('2026-01-15T17:30:00Z'))
 * // → Date('2026-01-16T00:00:00.000Z')
 */
export function toVNDate(instant: Date): Date {
  const vnDateStr = instant.toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  return new Date(vnDateStr + 'T00:00:00.000Z');
}

/**
 * Get the Vietnam calendar date string (YYYY-MM-DD) from a UTC instant.
 */
export function toVNDateString(instant: Date): string {
  return instant.toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/**
 * Build a date range [start, end) in Vietnam time, anchored at 00:00Z.
 * Useful for period boundaries in reports and accounting.
 *
 * @param year - calendar year in VN
 * @param month - 1-based month in VN
 * @returns { start: first day of month at 00:00Z, end: first day of next month at 00:00Z }
 */
export function toVNMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`);
  return { start, end };
}

/**
 * Get current Vietnam date (today) anchored at 00:00Z.
 */
export function vnToday(): Date {
  return toVNDate(new Date());
}
