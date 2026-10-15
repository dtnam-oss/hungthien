/**
 * AppError hierarchy — structured errors for consistent API responses.
 *
 * Every error carries an HTTP status code and a machine-readable error code
 * so the frontend can show localized messages without parsing strings.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/** 400 — request payload is invalid */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/** 401 — not authenticated */
export class AuthenticationError extends AppError {
  constructor(message = 'Chưa đăng nhập') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/** 403 — authenticated but not authorized */
export class AuthorizationError extends AppError {
  constructor(message = 'Không có quyền truy cập') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/** 403 — forbidden action (e.g., editing locked trip) */
export class ForbiddenError extends AppError {
  constructor(message = 'Hành động bị cấm') {
    super(message, 403, 'FORBIDDEN_ERROR');
    this.name = 'ForbiddenError';
  }
}

/** 404 — resource not found */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: number | string) {
    const msg = id ? `${resource} #${id} không tồn tại` : `${resource} không tồn tại`;
    super(msg, 404, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * 409 — optimistic locking conflict.
 * WHY: version field on every mutable record. If the version in the payload
 * doesn't match the DB, someone else edited it first. Reject instead of
 * silently overwriting.
 */
export class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã được chỉnh sửa bởi người khác. Vui lòng tải lại.') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * 422 — business rule violation.
 * Distinct from ValidationError (format) — this is semantically valid data
 * that violates a domain invariant (e.g., editing a closed accounting period).
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'BUSINESS_RULE_ERROR', details);
    this.name = 'BusinessRuleError';
  }
}
