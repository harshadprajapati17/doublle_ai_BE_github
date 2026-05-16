export class AppError extends Error {
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

export class ValidationError extends AppError {
  /** @param {string} message @param {unknown} [details] */
  constructor(message, details) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.") {
    super("UNAUTHENTICATED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message, details) {
    super("CONFLICT_ACTIVE_PROGRAM_EXISTS", message, 409, details);
    this.name = "ConflictError";
  }
}

export class NoActiveReferralProgramError extends AppError {
  constructor(message = "No active referral program.") {
    super("NO_ACTIVE_REFERRAL_PROGRAM", message, 404);
    this.name = "NoActiveReferralProgramError";
  }
}

export class SelfReferralError extends ValidationError {
  constructor(message = "Self-referral is not allowed.") {
    super(message, { reason: "SELF_REFERRAL" });
    this.name = "SelfReferralError";
  }
}

export class ReferralAlreadyAttributedError extends AppError {
  constructor(message = "This referee is already attributed for the active program.") {
    super("REFERRAL_ALREADY_ATTRIBUTED", message, 409);
    this.name = "ReferralAlreadyAttributedError";
  }
}

/** Missing or invalid required environment configuration (e.g. public base URL). */
export class ServiceMisconfiguredError extends AppError {
  constructor(message) {
    super("SERVICE_MISCONFIGURED", message, 503);
    this.name = "ServiceMisconfiguredError";
  }
}

export class SubscriptionAlreadyActiveError extends AppError {
  constructor(
    message = "A subscription is already in progress or active for this account."
  ) {
    super("SUBSCRIPTION_ALREADY_ACTIVE", message, 409);
    this.name = "SubscriptionAlreadyActiveError";
  }
}

export class WebhookSignatureInvalidError extends AppError {
  constructor(message = "Invalid webhook signature.") {
    super("WEBHOOK_SIGNATURE_INVALID", message, 401);
    this.name = "WebhookSignatureInvalidError";
  }
}

export class BillingProviderError extends AppError {
  /** @param {string} message @param {unknown} [details] */
  constructor(message = "Billing provider rejected the request.", details) {
    super("BILLING_PROVIDER_ERROR", message, 502, details);
    this.name = "BillingProviderError";
  }
}

export class SubscriptionNotModifiableError extends AppError {
  constructor(message = "Subscription cannot be modified in its current state.") {
    super("SUBSCRIPTION_NOT_MODIFIABLE", message, 409);
    this.name = "SubscriptionNotModifiableError";
  }
}
