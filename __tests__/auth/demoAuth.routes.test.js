import { jest, describe, test, expect, afterEach, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const DEMO_ROW = {
  id: "550e8400-e29b-41d4-a716-446655440099",
  sub: "demo-user-1",
  email: "testuser1@test.com",
  name: null,
  isEnabled: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

afterEach(() => {
  delete process.env.DEMO_AUTH_ENABLED;
  delete process.env.DEMO_AUTH_ALLOW_PRODUCTION;
  delete process.env.DEMO_AUTH_PASSWORD;
  process.env.NODE_ENV = "test";
  jest.resetModules();
});

describe("POST /api/v1/auth/demo", () => {
  test("returns 404 when demo auth is not enabled", async () => {
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "testuser1@test.com" });
    expect(res.statusCode).toBe(404);
  });

  test("returns 404 in production when DEMO_AUTH_ALLOW_PRODUCTION is not true", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    process.env.NODE_ENV = "production";
    delete process.env.DEMO_AUTH_ALLOW_PRODUCTION;
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "testuser1@test.com" });
    expect(res.statusCode).toBe(404);
  });

  test("mounts in production when DEMO_AUTH_ALLOW_PRODUCTION=true", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    process.env.DEMO_AUTH_ALLOW_PRODUCTION = "true";
    process.env.NODE_ENV = "production";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockResolvedValueOnce(DEMO_ROW);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "testuser1@test.com" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.accessToken).toBeTruthy();
    const setCookie = res.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    const cookieLine = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieLine).toContain("doublle_access_token=");
    expect(cookieLine.toLowerCase()).toContain("httponly");
  });

  test("returns 200 and HS256 JWT when demo_users row exists (case-insensitive input)", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockResolvedValueOnce(DEMO_ROW);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "TestUser1@Test.COM" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.tokenType).toBe("Bearer");
    expect(res.body.data?.expiresInSeconds).toBe(86400);
    const decoded = jwt.verify(res.body.data.accessToken, process.env.USER_JWT_SECRET);
    expect(decoded).toMatchObject({
      sub: "demo-user-1",
      role: "user",
      email: "testuser1@test.com",
    });
    expect(typeof decoded.exp).toBe("number");
    const setCookie = res.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(String(setCookie).toLowerCase()).toContain("httponly");
    expect(prisma.demoUser.findFirst).toHaveBeenCalledWith({
      where: { email: "testuser1@test.com", isEnabled: true },
    });
  });

  test("returns 401 when no enabled demo user row", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockResolvedValueOnce(null);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "other@test.com" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  test("accepts optional password field when DEMO_AUTH_PASSWORD is unset", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockResolvedValueOnce(DEMO_ROW);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo")
      .send({ email: "testuser1@test.com", password: "ignored" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.accessToken).toBeTruthy();
  });

  test("returns 401 when DEMO_AUTH_PASSWORD is set and password does not match", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    process.env.DEMO_AUTH_PASSWORD = "demo-secret";
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo")
      .send({ email: "testuser1@test.com", password: "wrong" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  test("returns 200 when DEMO_AUTH_PASSWORD matches", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    process.env.DEMO_AUTH_PASSWORD = "demo-secret";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockResolvedValueOnce(DEMO_ROW);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo")
      .send({ email: "testuser1@test.com", password: "demo-secret" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.accessToken).toBeTruthy();
  });

  test("returns 400 for unknown JSON fields (strict body)", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo")
      .send({ email: "testuser1@test.com", extra: "nope" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  test("returns 500 when database lookup fails", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoUser.findFirst.mockRejectedValueOnce(new Error("db unavailable"));
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app).post("/api/v1/auth/demo").send({ email: "testuser1@test.com" });
    expect(res.statusCode).toBe(500);
    expect(res.body.error?.code).toBe("INTERNAL_ERROR");
  });
});
