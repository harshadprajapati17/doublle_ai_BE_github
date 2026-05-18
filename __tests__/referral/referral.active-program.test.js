import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function userToken() {
  return jwt.sign({ sub: "user-99", role: "user" }, process.env.USER_JWT_SECRET, {
    algorithm: "HS256",
  });
}

function activeProgram(overrides = {}) {
  const d = new Date("2026-01-15T12:00:00.000Z");
  return {
    id: PROGRAM_ID,
    name: "Standard",
    status: "ACTIVE",
    rewardPct: { toString: () => "5" },
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
    currency: "USD",
    termsVersion: "v1",
    currentVersion: 2,
    createdAt: d,
    updatedAt: d,
    createdByAdminId: "admin-1",
    disabledAt: null,
    ...overrides,
  };
}

describe("Referral: GET /api/v1/referral/program", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
  });

  test("returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/v1/referral/program");
    expect(res.status).toBe(401);
  });

  test("returns 200 with active program (no admin fields)", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());

    const res = await request(app)
      .get("/api/v1/referral/program")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: PROGRAM_ID,
      name: "Standard",
      status: "ACTIVE",
      referrerRewardPct: "5",
      referrerRewardDurationMonths: 12,
      cookieDays: 30,
      attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
      termsVersion: "v1",
      currentVersion: 2,
      currency: "USD",
      refereeBenefit: { type: "NONE", value: null, currency: "USD", trialDays: null },
    });
    expect(res.body.data.createdByAdminId).toBeUndefined();
    expect(prisma.program.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      })
    );
  });

  test("returns 404 when no active program", async () => {
    prisma.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/referral/program")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NO_ACTIVE_REFERRAL_PROGRAM");
  });
});
