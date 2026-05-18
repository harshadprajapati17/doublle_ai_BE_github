import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const PROGRAM_ID = "5ee6299e-1be5-41ec-9c18-cdc67e5a4edd";
const CODE = "ABCD2345";

function adminToken() {
  return jwt.sign({ sub: "admin-1", role: "admin" }, process.env.ADMIN_JWT_SECRET, {
    algorithm: "HS256",
  });
}

function creditProgramRow(status = "DRAFT") {
  const d = new Date("2025-01-01T00:00:00.000Z");
  return {
    id: PROGRAM_ID,
    name: "Credit Referral",
    status,
    rewardPct: { toString: () => "5" },
    rewardDurationMonths: 12,
    cookieDays: 30,
    attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
    refereeBenefitType: "CREDIT",
    refereeBenefitValue: { toString: () => "500" },
    refereeBenefitTrialDays: null,
    holdPeriodDays: 30,
    monthlyCap: null,
    lifetimeCap: null,
    capBehavior: "ROLL_FORWARD",
    currency: "USD",
    termsVersion: "v1",
    currentVersion: status === "ACTIVE" ? 2 : 1,
    createdAt: d,
    updatedAt: d,
    createdByAdminId: "admin-1",
    disabledAt: null,
  };
}

describe("Admin CREDIT program → validate-code", () => {
  beforeEach(() => {
    prisma.program.create.mockReset();
    prisma.program.findUnique.mockReset();
    prisma.program.findMany.mockReset();
    prisma.program.update.mockReset();
    prisma.programVersion.create.mockReset();
    prisma.adminAuditLog.create.mockReset();
    prisma.program.findFirst.mockReset();
    prisma.referralCode.findUnique.mockReset();
  });

  test("create + activate then POST /code/validate returns CREDIT value 500", async () => {
    const draft = creditProgramRow("DRAFT");
    const active = creditProgramRow("ACTIVE");

    prisma.program.create.mockResolvedValue(draft);
    prisma.program.findUnique.mockImplementation(async (args) => {
      if (args?.where?.id === PROGRAM_ID) return active;
      return null;
    });
    prisma.program.findMany.mockResolvedValue([]);
    prisma.program.update.mockResolvedValue(active);
    prisma.program.findFirst.mockResolvedValue(active);
    prisma.referralCode.findUnique.mockResolvedValue({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      ownerUserId: "user-1",
      programId: PROGRAM_ID,
      code: CODE,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const createRes = await request(app)
      .post("/api/v1/admin/programs")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        name: "Credit Referral",
        referrerRewardPct: 5,
        referrerRewardDurationMonths: 12,
        cookieDays: 30,
        attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
        refereeBenefitType: "CREDIT",
        refereeBenefitValue: 500,
        holdPeriodDays: 30,
        capBehavior: "ROLL_FORWARD",
        termsVersion: "v1",
      });

    expect(createRes.statusCode).toBe(201);
    expect(prisma.program.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refereeBenefitType: "CREDIT" }),
      })
    );

    const activateRes = await request(app)
      .post(`/api/v1/admin/programs/${PROGRAM_ID}/activate`)
      .set("Authorization", `Bearer ${adminToken()}`);

    expect(activateRes.statusCode).toBe(200);

    const validateRes = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: CODE });

    expect(validateRes.statusCode).toBe(200);
    expect(validateRes.body.data).toMatchObject({
      valid: true,
      programId: PROGRAM_ID,
      code: CODE,
      refereeBenefit: {
        type: "CREDIT",
        value: "500",
        currency: "USD",
        trialDays: null,
      },
    });
  });
});
