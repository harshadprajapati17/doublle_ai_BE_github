import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const DEMO_ID = "550e8400-e29b-41d4-a716-4466554400bb";
const DEMO_ROW = {
  id: DEMO_ID,
  sub: "demo-admin-1",
  email: "admin1@test.com",
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
  prisma.demoAdmin.findMany.mockResolvedValue([]);
  prisma.demoAdmin.findUnique.mockReset();
  prisma.demoAdmin.create.mockReset();
  prisma.demoAdmin.update.mockReset();
  prisma.demoAdmin.delete.mockReset();
});

describe("Admin demo admins", () => {
  test("GET /api/v1/admin/demo-admins requires admin auth", async () => {
    const res = await request(app).get("/api/v1/admin/demo-admins");
    expect(res.statusCode).toBe(401);
  });

  test("GET /api/v1/admin/demo-admins returns list", async () => {
    prisma.demoAdmin.findMany.mockResolvedValueOnce([DEMO_ROW]);
    const res = await request(app)
      .get("/api/v1/admin/demo-admins")
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: DEMO_ID,
      sub: "demo-admin-1",
      email: "admin1@test.com",
      isEnabled: true,
    });
  });

  test("POST /api/v1/admin/demo-admins creates row", async () => {
    prisma.demoAdmin.create.mockResolvedValueOnce(DEMO_ROW);
    const res = await request(app)
      .post("/api/v1/admin/demo-admins")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ sub: "demo-admin-1", email: "admin1@test.com", name: "One" });
    expect(res.statusCode).toBe(201);
    expect(res.body.data?.id).toBe(DEMO_ID);
    expect(prisma.demoAdmin.create).toHaveBeenCalledWith({
      data: { sub: "demo-admin-1", email: "admin1@test.com", name: "One" },
    });
  });

  test("POST /api/v1/admin/demo-admins returns 409 on unique violation", async () => {
    const err = new Error("Unique");
    err.code = "P2002";
    prisma.demoAdmin.create.mockRejectedValueOnce(err);
    const res = await request(app)
      .post("/api/v1/admin/demo-admins")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ sub: "demo-admin-1", email: "admin1@test.com" });
    expect(res.statusCode).toBe(409);
    expect(res.body.error?.code).toBe("CONFLICT_ACTIVE_PROGRAM_EXISTS");
  });

  test("DELETE /api/v1/admin/demo-admins/:id returns 204", async () => {
    prisma.demoAdmin.findUnique.mockResolvedValueOnce(DEMO_ROW);
    prisma.demoAdmin.delete.mockResolvedValueOnce(DEMO_ROW);
    const res = await request(app)
      .delete(`/api/v1/admin/demo-admins/${DEMO_ID}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(204);
  });
});
