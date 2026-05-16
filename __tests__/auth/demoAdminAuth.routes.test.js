import { jest, describe, test, expect, afterEach } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const DEMO_ADMIN_ROW = {
  id: "550e8400-e29b-41d4-a716-446655440088",
  sub: "demo-admin-1",
  email: "admin1@test.com",
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

describe("POST /api/v1/auth/demo-admin", () => {
  test("returns 404 when demo auth is not enabled", async () => {
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo-admin")
      .send({ email: "admin1@test.com" });
    expect(res.statusCode).toBe(404);
  });

  test("returns 200 and HS256 admin JWT when demo_admins row exists", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoAdmin.findFirst.mockResolvedValueOnce(DEMO_ADMIN_ROW);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo-admin")
      .send({ email: "Admin1@Test.COM" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.tokenType).toBe("Bearer");
    const decoded = jwt.verify(res.body.data.accessToken, process.env.ADMIN_JWT_SECRET);
    expect(decoded).toMatchObject({
      sub: "demo-admin-1",
      role: "admin",
      email: "admin1@test.com",
    });
    const setCookie = res.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    const cookieLine = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
    expect(cookieLine).toContain("doublle_admin_access_token=");
    expect(prisma.demoAdmin.findFirst).toHaveBeenCalledWith({
      where: { email: "admin1@test.com", isEnabled: true },
    });
  });

  test("returns 401 when no enabled demo admin row", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoAdmin.findFirst.mockResolvedValueOnce(null);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const res = await request(app)
      .post("/api/v1/auth/demo-admin")
      .send({ email: "other@test.com" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error?.code).toBe("UNAUTHENTICATED");
  });

  test("requireAdmin accepts cookie from demo-admin login", async () => {
    process.env.DEMO_AUTH_ENABLED = "true";
    const { prisma } = await import("../../data/prismaClient.js");
    prisma.demoAdmin.findFirst.mockResolvedValueOnce(DEMO_ADMIN_ROW);
    prisma.demoAdmin.findMany.mockResolvedValueOnce([]);
    const request = (await import("supertest")).default;
    const { app } = await import("../../app.js");
    const login = await request(app)
      .post("/api/v1/auth/demo-admin")
      .send({ email: "admin1@test.com" });
    const cookie = login.headers["set-cookie"];
    const res = await request(app).get("/api/v1/admin/demo-admins").set("Cookie", cookie);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
