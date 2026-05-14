import { ZodError } from "zod";
import { AppError } from "../errors/index.js";

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      details: { method: req.method, path: req.path },
    },
  });
}

/**
 * Logs unhandled errors with request context. Never logs request bodies/headers
 * to avoid leaking secrets (tokens, payment data, etc.).
 * @param {import('express').Request} req
 * @param {unknown} err
 * @param {number} statusCode
 */
function logServerError(req, err, statusCode) {
  const e = /** @type {Error & { code?: string; meta?: unknown }} */ (
    err || {}
  );
  const entry = {
    level: "error",
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    actorId: /** @type {{ admin?: { id?: string } }} */ (req).admin?.id,
    name: e.name,
    code: e.code,
    message: e.message,
    meta: e.meta,
    stack: e.stack,
  };
  console.error(JSON.stringify(entry));
}

function isPrismaKnownRequestError(err) {
  return (
    err && typeof err === "object" && err.name === "PrismaClientKnownRequestError"
  );
}
function isPrismaValidationError(err) {
  return (
    err && typeof err === "object" && err.name === "PrismaClientValidationError"
  );
}
function isPrismaInitializationError(err) {
  return (
    err &&
    typeof err === "object" &&
    err.name === "PrismaClientInitializationError"
  );
}

/**
 * Maps a Prisma known-request error (P1xxx / P2xxx) to a public HTTP response.
 * @param {{ code?: string; meta?: Record<string, unknown> }} err
 * @returns {{ status: number; body: { code: string; message: string; details?: unknown } }}
 */
function mapPrismaKnownError(err) {
  switch (err.code) {
    case "P1000":
    case "P1010":
      return {
        status: 503,
        body: {
          code: "DATABASE_AUTHENTICATION_FAILED",
          message:
            "The application could not authenticate with the database. Verify DATABASE_URL user and password.",
        },
      };
    case "P1001":
    case "P1002":
    case "P1017":
      return {
        status: 503,
        body: {
          code: "DATABASE_UNAVAILABLE",
          message: "Could not reach the database server. Check host, port, and network.",
        },
      };
    case "P1003":
      return {
        status: 503,
        body: {
          code: "DATABASE_NOT_FOUND",
          message: "The database name in DATABASE_URL does not exist on the server.",
        },
      };
    case "P2002":
      return {
        status: 409,
        body: {
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          message: "Resource already exists.",
          details: { target: err.meta?.target },
        },
      };
    case "P2003":
      return {
        status: 409,
        body: {
          code: "FOREIGN_KEY_VIOLATION",
          message: "Referenced resource does not exist.",
          details: { field: err.meta?.field_name },
        },
      };
    case "P2025":
      return {
        status: 404,
        body: { code: "NOT_FOUND", message: "Record not found." },
      };
    default:
      return {
        status: 500,
        body: {
          code: "DATABASE_ERROR",
          message: "Database error.",
          details: { prismaCode: err.code },
        },
      };
  }
}

/**
 * Centralized Express error handler. Translates known error types into stable
 * JSON shapes, maps Prisma errors to proper HTTP statuses, and logs every
 * unexpected failure with request context. The public 500 response never leaks
 * internals.
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request.",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  if (isPrismaKnownRequestError(err)) {
    const { status, body } = mapPrismaKnownError(
      /** @type {{ code?: string; meta?: Record<string, unknown> }} */ (err)
    );
    if (status >= 500) logServerError(req, err, status);
    return res.status(status).json({ error: body });
  }

  if (isPrismaValidationError(err)) {
    logServerError(req, err, 500);
    return res.status(500).json({
      error: {
        code: "DATABASE_VALIDATION_ERROR",
        message: "Invalid database query.",
      },
    });
  }

  if (isPrismaInitializationError(err)) {
    logServerError(req, err, 503);
    return res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database connection failed.",
      },
    });
  }

  logServerError(req, err, 500);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}
