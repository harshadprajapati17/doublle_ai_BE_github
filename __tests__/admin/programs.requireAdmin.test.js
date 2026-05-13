import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");

describe("Admin programs auth", () => {
  test("GET /api/v1/admin/programs returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/v1/admin/programs");
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  test("GET /api/v1/admin/programs returns 401 for invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", "Bearer not-a-jwt");
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  test("GET /api/v1/admin/programs returns 401 for expired token", async () => {
    const token = jwt.sign(
      { sub: "a1", role: "admin" },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "-1s", algorithm: "HS256" }
    );
    const res = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  test("GET /api/v1/admin/programs returns 403 when role is not admin", async () => {
    const token = jwt.sign({ sub: "u1", role: "user" }, process.env.ADMIN_JWT_SECRET, {
      algorithm: "HS256",
    });
    const res = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("GET /api/v1/admin/programs returns 403 when sub missing", async () => {
    const token = jwt.sign({ role: "admin" }, process.env.ADMIN_JWT_SECRET, { algorithm: "HS256" });
    const res = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
