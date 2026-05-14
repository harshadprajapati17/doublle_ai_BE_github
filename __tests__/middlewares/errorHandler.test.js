import { jest } from "@jest/globals";
import { ZodError } from "zod";

import { errorHandler, notFoundHandler } from "../../middlewares/errorHandler.js";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from "../../errors/index.js";

/**
 * @returns {{
 *   status: jest.Mock,
 *   json: jest.Mock,
 *   send: jest.Mock,
 * }}
 */
function fakeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

function fakeReq(overrides = {}) {
  return {
    method: "POST",
    path: "/api/v1/admin/programs",
    originalUrl: "/api/v1/admin/programs",
    admin: { id: "admin-1" },
    ...overrides,
  };
}

function makeFakePrismaError(name, props = {}) {
  const err = new Error(props.message || name);
  err.name = name;
  Object.assign(err, props);
  return err;
}

describe("errorHandler", () => {
  let errSpy;

  beforeEach(() => {
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    errSpy.mockRestore();
  });

  test("returns 400 with flattened details for ZodError", () => {
    const zodErr = new ZodError([
      {
        code: "invalid_type",
        path: ["name"],
        message: "Required",
        expected: "string",
        received: "undefined",
      },
    ]);
    const res = fakeRes();
    errorHandler(zodErr, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "Invalid request.",
        details: expect.any(Object),
      }),
    });
    expect(errSpy).not.toHaveBeenCalled();
  });

  test("passes through typed AppError (ValidationError -> 400)", () => {
    const err = new ValidationError("Bad request.", { field: "x" });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "Bad request.", details: { field: "x" } },
    });
    expect(errSpy).not.toHaveBeenCalled();
  });

  test("passes through NotFoundError -> 404", () => {
    const res = fakeRes();
    errorHandler(new NotFoundError("Program not found."), fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Program not found." },
    });
  });

  test("passes through UnauthorizedError -> 401", () => {
    const res = fakeRes();
    errorHandler(new UnauthorizedError("Token expired."), fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "UNAUTHENTICATED", message: "Token expired." },
    });
  });

  test("passes through ConflictError -> 409", () => {
    const res = fakeRes();
    errorHandler(
      new ConflictError("Another program is active.", { activeProgramIds: ["x"] }),
      fakeReq(),
      res,
      jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "CONFLICT_ACTIVE_PROGRAM_EXISTS",
        message: "Another program is active.",
        details: { activeProgramIds: ["x"] },
      },
    });
  });

  test("maps Prisma P1000 (DB auth failed) -> 503 DATABASE_AUTHENTICATION_FAILED and logs", () => {
    const err = makeFakePrismaError("PrismaClientKnownRequestError", {
      code: "P1000",
      message: "Authentication failed against the database server",
    });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "DATABASE_AUTHENTICATION_FAILED",
        message:
          "The application could not authenticate with the database. Verify DATABASE_URL user and password.",
      },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  test("maps Prisma P2002 (unique violation) -> 409 UNIQUE_CONSTRAINT_VIOLATION (no server log)", () => {
    const err = makeFakePrismaError("PrismaClientKnownRequestError", {
      code: "P2002",
      meta: { target: ["email"] },
    });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "UNIQUE_CONSTRAINT_VIOLATION",
        message: "Resource already exists.",
        details: { target: ["email"] },
      },
    });
    expect(errSpy).not.toHaveBeenCalled();
  });

  test("maps Prisma P2025 (record not found) -> 404 NOT_FOUND", () => {
    const err = makeFakePrismaError("PrismaClientKnownRequestError", { code: "P2025" });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "Record not found." },
    });
  });

  test("maps Prisma P2003 (FK violation) -> 409 FOREIGN_KEY_VIOLATION", () => {
    const err = makeFakePrismaError("PrismaClientKnownRequestError", {
      code: "P2003",
      meta: { field_name: "programId" },
    });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "FOREIGN_KEY_VIOLATION",
        message: "Referenced resource does not exist.",
        details: { field: "programId" },
      },
    });
  });

  test("maps unknown Prisma P-code -> 500 DATABASE_ERROR and logs", () => {
    const err = makeFakePrismaError("PrismaClientKnownRequestError", { code: "P9999" });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "DATABASE_ERROR",
        message: "Database error.",
        details: { prismaCode: "P9999" },
      },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(errSpy.mock.calls[0][0]);
    expect(logged).toMatchObject({
      level: "error",
      method: "POST",
      statusCode: 500,
      actorId: "admin-1",
      name: "PrismaClientKnownRequestError",
      code: "P9999",
    });
  });

  test("maps PrismaClientValidationError -> 500 DATABASE_VALIDATION_ERROR and logs", () => {
    const err = makeFakePrismaError("PrismaClientValidationError", {
      message: "Argument program is missing",
    });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "DATABASE_VALIDATION_ERROR", message: "Invalid database query." },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  test("maps PrismaClientInitializationError -> 503 DATABASE_UNAVAILABLE and logs", () => {
    const err = makeFakePrismaError("PrismaClientInitializationError", {
      message: "Can't reach database server",
    });
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database connection failed." },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  test("falls back to generic 500 INTERNAL_ERROR and logs full context for unknown errors", () => {
    const err = new Error("boom");
    const res = fakeRes();
    errorHandler(err, fakeReq({ method: "GET", path: "/x", originalUrl: "/x?y=1" }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
    });
    expect(errSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(errSpy.mock.calls[0][0]);
    expect(logged).toMatchObject({
      level: "error",
      method: "GET",
      path: "/x?y=1",
      statusCode: 500,
      actorId: "admin-1",
      message: "boom",
    });
    expect(logged.stack).toEqual(expect.any(String));
  });

  test("does not crash when req has no admin (unauthenticated path)", () => {
    const err = new Error("boom");
    const res = fakeRes();
    errorHandler(err, fakeReq({ admin: undefined }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    const logged = JSON.parse(errSpy.mock.calls[0][0]);
    expect(logged.actorId).toBeUndefined();
  });

  test("AppError subclasses with no details omit the details field", () => {
    const err = new AppError("X_ERR", "x message", 418);
    const res = fakeRes();
    errorHandler(err, fakeReq(), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "X_ERR", message: "x message" },
    });
  });
});

describe("notFoundHandler", () => {
  test("returns 404 NOT_FOUND with method + path", () => {
    const res = fakeRes();
    notFoundHandler(fakeReq({ method: "GET", path: "/nope" }), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        details: { method: "GET", path: "/nope" },
      },
    });
  });
});
