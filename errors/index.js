class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} statusCode
   * @param {unknown} [details]
   */
  constructor(code, message, statusCode, details) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class ValidationError extends AppError {
  /** @param {string} message @param {unknown} [details] */
  constructor(message, details) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super("UNAUTHENTICATED", message, 401);
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super("CONFLICT_ACTIVE_PROGRAM_EXISTS", message, 409, details);
    this.name = "ConflictError";
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
