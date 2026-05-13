import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const IDS = {
  list404: "5a1b2c61-06da-42ab-8ec8-8199610fdd95",
  getWithVersions: "e8c629a5-f4a3-491f-b2fc-adcd4c2a9324",
  patchBase: "f7aa17f4-3dd4-4e57-a485-cb4f2375f573",
  patchOk: "1ff9a1bb-aed8-4f12-9b81-829964df1e58",
  activateSelf: "cdb19e0e-ac01-4daf-a790-2439bf4a1337",
  activateOther: "5b26c851-287e-43c7-b22e-5b75dbdcbf0a",
  activateNoop: "c46cd602-cc10-4082-8e34-9a7477726fcc",
  deleteDisabled: "6de6a98a-5b07-453f-b9af-de873790f046",
  createResult: "5ee6299e-1be5-41ec-9c18-cdc67e5a4edd",
  versionRow: "460e56cf-a812-418c-8737-66aea994aa81",
};

function adminToken() {
  return jwt.sign({ sub: "admin-1", role: "admin" }, process.env.ADMIN_JWT_SECRET, {
    algorithm: "HS256",
  });
}

function fakeProgram(overrides = {}) {
  const d = new Date("2025-01-01T00:00:00.000Z");
  return {
    id: IDS.patchBase,
    name: "Standard",
    status: "DRAFT",
    rewardPct: { toString: () => "5.00" },
    rewardDurationMonths: 12,
    cookieDays: 30,
    attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
    refereeBenefitType: "NONE",
    refereeBenefitValue: null,
    refereeBenefitTrialDays: null,
    holdPeriodDays: 30,
    monthlyCap: null,
    lifetimeCap: null,
    capBehavior: "ROLL_FORWARD",
    refereeMinSpendAmount: null,
    refereeMinSpendWindowDays: null,
    currency: "USD",
    termsVersion: "v1",
    currentVersion: 1,
    createdAt: d,
    updatedAt: d,
    createdByAdminId: "admin-1",
    disabledAt: null,
    ...overrides,
  };
}

const sampleCreateBody = {
  name: "Standard",
  rewardPct: 5,
  rewardDurationMonths: 12,
  cookieDays: 30,
  attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
  refereeBenefitType: "NONE",
  holdPeriodDays: 30,
  capBehavior: "ROLL_FORWARD",
  termsVersion: "v1",
};

describe("GET /api/v1/admin/programs", () => {
  beforeEach(() => {
    prisma.program.findMany.mockResolvedValue([]);
  });

  test("returns 200 with data and meta.nextCursor", async () => {
    const res = await request(app)
      .get("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { nextCursor: null } });
  });

  test("returns 400 when limit out of range", async () => {
    const res = await request(app)
      .get("/api/v1/admin/programs?limit=101")
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 for invalid cursor", async () => {
    const res = await request(app)
      .get("/api/v1/admin/programs?cursor=not-valid")
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/admin/programs", () => {
  beforeEach(() => {
    prisma.program.create.mockReset();
    prisma.programVersion.create.mockReset();
    prisma.adminAuditLog.create.mockReset();
    prisma.program.create.mockImplementation(async (args) => ({
      ...fakeProgram({ id: IDS.createResult }),
      ...args.data,
      id: IDS.createResult,
    }));
  });

  test("returns 201 on valid body", async () => {
    const res = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send(sampleCreateBody);
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      id: IDS.createResult,
      name: "Standard",
      status: "DRAFT",
    });
    expect(prisma.program.create).toHaveBeenCalled();
    expect(prisma.programVersion.create).toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).toHaveBeenCalled();
  });

  test("returns 400 for unknown body field", async () => {
    const res = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ ...sampleCreateBody, extraField: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/admin/programs/:id", () => {
  test("returns 404 when missing", async () => {
    prisma.program.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .get(`/api/v1/admin/programs/${IDS.list404}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(404);
  });

  test("returns 200 with versions when include=versions", async () => {
    const row = {
      ...fakeProgram({ id: IDS.getWithVersions }),
      versions: [
        {
          id: IDS.versionRow,
          programId: IDS.getWithVersions,
          version: 1,
          payload: { id: IDS.getWithVersions },
          changedByAdminId: "admin-1",
          changeReason: "initial",
          createdAt: new Date("2025-01-01T00:00:00.000Z"),
        },
      ],
    };
    prisma.program.findUnique.mockResolvedValueOnce(row);
    const res = await request(app)
      .get(`/api/v1/admin/programs/${IDS.getWithVersions}?include=versions`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.versions).toHaveLength(1);
  });
});

describe("PATCH /api/v1/admin/programs/:id", () => {
  test("returns 400 for empty body", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/programs/${IDS.patchBase}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  test("returns 400 when status is sent in body", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/programs/${IDS.patchBase}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "X", status: "ACTIVE" });
    expect(res.statusCode).toBe(400);
  });

  test("returns 200 and bumps version", async () => {
    const existing = fakeProgram({ id: IDS.patchOk, currentVersion: 1 });
    const updated = fakeProgram({
      id: IDS.patchOk,
      name: "Renamed",
      currentVersion: 2,
    });
    prisma.program.findUnique.mockResolvedValueOnce(existing);
    prisma.program.findUnique.mockResolvedValueOnce(existing);
    prisma.program.update.mockResolvedValueOnce(updated);
    const res = await request(app)
      .patch(`/api/v1/admin/programs/${IDS.patchOk}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ name: "Renamed" });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.name).toBe("Renamed");
    expect(res.body.data.currentVersion).toBe(2);
  });
});

describe("POST /api/v1/admin/programs/:id/activate", () => {
  test("returns 409 when another program is ACTIVE and force=false", async () => {
    const self = fakeProgram({
      id: IDS.activateSelf,
      status: "DRAFT",
    });
    const other = fakeProgram({
      id: IDS.activateOther,
      status: "ACTIVE",
    });
    prisma.program.findUnique.mockResolvedValue(self);
    prisma.program.findMany.mockResolvedValueOnce([other]);
    const res = await request(app)
      .post(`/api/v1/admin/programs/${IDS.activateSelf}/activate`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT_ACTIVE_PROGRAM_EXISTS");
  });

  test("returns 200 with meta.noOp when already ACTIVE", async () => {
    const self = fakeProgram({
      id: IDS.activateNoop,
      status: "ACTIVE",
    });
    prisma.program.findUnique.mockResolvedValue(self);
    const res = await request(app)
      .post(`/api/v1/admin/programs/${IDS.activateNoop}/activate`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.meta).toEqual({ noOp: true });
  });
});

describe("DELETE /api/v1/admin/programs/:id", () => {
  test("returns 204 when already DISABLED (idempotent)", async () => {
    prisma.program.findUnique.mockResolvedValueOnce(
      fakeProgram({ id: IDS.deleteDisabled, status: "DISABLED" })
    );
    const res = await request(app)
      .delete(`/api/v1/admin/programs/${IDS.deleteDisabled}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    expect(res.statusCode).toBe(204);
    expect(res.text).toBe("");
  });
});
