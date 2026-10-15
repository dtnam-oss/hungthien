/**
 * R7 — Backend validation must reject bad data regardless of frontend.
 *
 * WHY THIS TEST EXISTS:
 * Frontend doing the right thing doesn't mean data is right. Direct API calls
 * (curl, scripts, old clients) must also be blocked with clear error messages.
 * NAK had cases where a direct API call bypassed all validation and inserted
 * garbage data that only showed up weeks later in reports.
 */

import { describe, it, expect } from 'vitest';
import { validatePayload, validateEnum } from '../../src/shared/validation.js';
import { ValidationError } from '../../src/shared/errors.js';

describe('R7: validatePayload — backend validation', () => {
  const rules = [
    { field: 'code', label: 'Mã nhân viên', required: true, type: 'string' as const, minLength: 1, maxLength: 50 },
    { field: 'fullName', label: 'Họ tên', required: true, type: 'string' as const },
    { field: 'phone', label: 'SĐT', type: 'string' as const, maxLength: 20 },
  ];

  it('passes valid data without throwing', () => {
    expect(() => validatePayload({ code: 'NV001', fullName: 'Test' }, rules)).not.toThrow();
  });

  it('throws ValidationError when required field is missing', () => {
    expect(() => validatePayload({ fullName: 'Test' }, rules))
      .toThrow(ValidationError);
  });

  it('throws ValidationError when required field is empty string', () => {
    expect(() => validatePayload({ code: '', fullName: 'Test' }, rules))
      .toThrow(ValidationError);
  });

  it('includes field-level error details in Vietnamese', () => {
    try {
      validatePayload({}, rules);
      expect.fail('Should have thrown');
    } catch (err) {
      const ve = err as ValidationError;
      expect(ve.statusCode).toBe(400);
      expect(ve.details?.fields).toBeDefined();
      const fields = ve.details!.fields as Record<string, string>;
      expect(fields.code).toContain('bắt buộc');
      expect(fields.fullName).toContain('bắt buộc');
    }
  });

  it('rejects string exceeding maxLength', () => {
    expect(() => validatePayload(
      { code: 'NV001', fullName: 'Test', phone: 'x'.repeat(21) },
      rules,
    )).toThrow(ValidationError);
  });

  it('rejects wrong type', () => {
    expect(() => validatePayload(
      { code: 123, fullName: 'Test' },
      rules,
    )).toThrow(ValidationError);
  });
});

describe('R7: validateEnum', () => {
  it('passes valid enum value', () => {
    expect(() => validateEnum('status', 'ACTIVE', ['ACTIVE', 'INACTIVE'], 'Trạng thái')).not.toThrow();
  });

  it('throws for invalid enum value', () => {
    expect(() => validateEnum('status', 'INVALID', ['ACTIVE', 'INACTIVE'], 'Trạng thái'))
      .toThrow(ValidationError);
  });

  it('allows null/undefined (field is optional)', () => {
    expect(() => validateEnum('status', null, ['ACTIVE', 'INACTIVE'], 'Trạng thái')).not.toThrow();
    expect(() => validateEnum('status', undefined, ['ACTIVE', 'INACTIVE'], 'Trạng thái')).not.toThrow();
  });
});
