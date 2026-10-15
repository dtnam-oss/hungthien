/**
 * Validation helpers — R7: all business rules enforced at the API layer.
 *
 * WHY THIS EXISTS:
 * Frontend doing the right thing doesn't mean data is right — direct API
 * calls must also be blocked, with clear error messages instead of silently
 * fixing user data.
 */

import { ValidationError } from './errors.js';

export interface FieldRule {
  field: string;
  label: string;  // Vietnamese label for error messages
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown) => string | null;  // return error message or null
}

/**
 * Validate a payload against a set of field rules.
 * Throws ValidationError with all violations listed.
 */
export function validatePayload(
  payload: Record<string, unknown>,
  rules: FieldRule[],
): void {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = payload[rule.field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[rule.field] = `${rule.label} là bắt buộc`;
      continue;
    }

    // Skip further checks if value is absent and not required
    if (value === undefined || value === null) continue;

    // Type checks
    if (rule.type === 'string' && typeof value !== 'string') {
      errors[rule.field] = `${rule.label} phải là chuỗi ký tự`;
      continue;
    }
    if (rule.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
      errors[rule.field] = `${rule.label} phải là số`;
      continue;
    }
    if (rule.type === 'boolean' && typeof value !== 'boolean') {
      errors[rule.field] = `${rule.label} phải là true/false`;
      continue;
    }

    // String constraints
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors[rule.field] = `${rule.label} phải có ít nhất ${rule.minLength} ký tự`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors[rule.field] = `${rule.label} không được quá ${rule.maxLength} ký tự`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors[rule.field] = rule.patternMessage || `${rule.label} không đúng định dạng`;
      }
    }

    // Number constraints
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors[rule.field] = `${rule.label} phải lớn hơn hoặc bằng ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors[rule.field] = `${rule.label} phải nhỏ hơn hoặc bằng ${rule.max}`;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors[rule.field] = customError;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Dữ liệu không hợp lệ', { fields: errors });
  }
}

/**
 * Validate that a value is one of the allowed enum values.
 */
export function validateEnum(field: string, value: unknown, allowed: string[], label: string): void {
  if (value !== undefined && value !== null && !allowed.includes(value as string)) {
    throw new ValidationError(`${label} không hợp lệ`, {
      fields: { [field]: `${label} phải là một trong: ${allowed.join(', ')}` },
    });
  }
}
