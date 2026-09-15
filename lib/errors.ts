/**
 * Base Application Error Class
 * Prevents internal details (SQL messages, stack traces) from leaking to end users.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class TenantAccessDeniedError extends AppError {
  constructor(message = "Access denied: Invalid tenant context or permissions") {
    super(message, 403, "TENANT_ACCESS_DENIED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Operation not permitted for actor role") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  public readonly errors?: Record<string, string[]>;

  constructor(message = "Validation failed", errors?: Record<string, string[]>) {
    super(message, 422, "VALIDATION_ERROR");
    this.errors = errors;
  }
}

export class TenantSuspendedError extends AppError {
  constructor(message = "Tenant account is suspended") {
    super(message, 403, "TENANT_SUSPENDED");
  }
}
