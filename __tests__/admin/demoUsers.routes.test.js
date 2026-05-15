import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const DEMO_ID = "550e8400-e29b-41d4-a716-4466554400aa";
const DEMO_ROW = {
  id: DEMO_ID,
  sub: "demo-user-1",
  email: "testuser1@test.com",
  name: "One",
  isEnabled: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function adminToken() {
  return jwt.sign({ sub: "admin-1", role: "admin" }, process.env.ADMIN_JWT_SECRET, {
    algorithm: "HS256",
  });
}

beforeEach(() => {
  prisma.demoUser.findMany.mockResolvedValue([]);
  prisma.demoUser.findUnique.mockReset();
  prisma.demoUser.create.mockReset();
  prisma.demoUser.update.mockReset();
  prisma.demoUser.delete.mockReset();
});

describe("Admin demo users", () => {
  test("GET /api/v1/admin/demo-users requires admin auth", async () => {
    const res = await request(app).get("/api/v1/admin/demo-users");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/v1/admin/demo-users returns list", async () => {
    prisma.demoUser.findMany.mockResolvedValueOnce([DEMO_ROW]);
    const res = await request(app)
      .get("/api/v1/admin/demo-users")
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: DEMO_ID,
      sub: "demo-user-1",
      email: "testuser1@test.com",
      isEnabled: true,
    });
    expect(res.body.data[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  test("POST /api/v1/admin/demo-users creates row", async () => {
    prisma.demoUser.create.mockResolvedValueOnce(DEMO_ROW);
    const res = await request(app)
      .post("/api/v1/admin/demo-users")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ sub: "demo-user-1", email: "testuser1@test.com", name: "One" });
    expect(res.statusCode).toBe(201);
    expect(res.body.data?.id).toBe(DEMO_ID);
    expect(prisma.demoUser.create).toHaveBeenCalledWith({
      data: { sub: "demo-user-1", email: "testuser1@test.com", name: "One" },
    });
  });

  test("POST /api/v1/admin/demo-users returns 409 on unique violation", async () => {
    const err = new Error("Unique");
    err.code = "P2002";
    prisma.demoUser.create.mockRejectedValueOnce(err);
    const res = await request(app)
      .post("/api/v1/admin/demo-users")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ sub: "demo-user-1", email: "testuser1@test.com" });
    expect(res.statusCode).toBe(409);
    expect(res.body.error?.code).toBe("CONFLICT_ACTIVE_PROGRAM_EXISTS");
  });

  test("GET /api/v1/admin/demo-users/:id returns 404 when missing", async () => {
    prisma.demoUser.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get(`/api/v1/admin/demo-users/${DEMO_ID}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(404);
  });

  test("PATCH /api/v1/admin/demo-users/:id updates row", async () => {
    prisma.demoUser.findUnique.mockResolvedValueOnce(DEMO_ROW);
    const updated = { ...DEMO_ROW, isEnabled: false };
    prisma.demoUser.update.mockResolvedValueOnce(updated);
    const res = await request(app)
      .patch(`/api/v1/admin/demo-users/${DEMO_ID}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ isEnabled: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.data?.isEnabled).toBe(false);
  });

  test("DELETE /api/v1/admin/demo-users/:id returns 204", async () => {
    prisma.demoUser.findUnique.mockResolvedValueOnce(DEMO_ROW);
    prisma.demoUser.delete.mockResolvedValueOnce(DEMO_ROW);
    const res = await request(app)
      .delete(`/api/v1/admin/demo-users/${DEMO_ID}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(204);
  });
});
