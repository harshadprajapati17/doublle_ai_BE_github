import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REFERRAL_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const CODE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

function userToken(sub = "referrer-user-1") {
  return jwt.sign({ sub, role: "user" }, process.env.USER_JWT_SECRET, {
    algorithm: "HS256",
  });
}

function activeProgram() {
  const d = new Date("2026-01-15T12:00:00.000Z");
  return {
    id: PROGRAM_ID,
    name: "Standard",
    status: "ACTIVE",
    termsVersion: "v1",
    currency: "USD",
    refereeBenefitType: "CREDIT",
    refereeBenefitValue: { toString: () => "500" },
    refereeBenefitTrialDays: null,
    createdAt: d,
    updatedAt: d,
  };
}

describe("GET /api/v1/referral/me/dashboard", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
    prisma.referralCode.findUnique.mockReset();
    prisma.referral.findMany.mockReset();
    prisma.referral.count.mockReset();
    prisma.commission.groupBy.mockReset();
    prisma.commission.findMany.mockReset();
    prisma.demoUser.findMany.mockReset();
    prisma.subscriptionPayment.findMany.mockReset();
  });

  test("returns 401 without auth", async () => {
    const res = await request(app).get("/api/v1/referral/me/dashboard");
    expect(res.status).toBe(401);
  });

  test("returns dashboard with referee payment and commission detail", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "referrer-user-1",
      programId: PROGRAM_ID,
      code: "T5YYUM8P",
      createdAt: new Date("2026-05-18T05:16:05.497Z"),
    });
    prisma.referral.count.mockResolvedValue(1);
    prisma.commission.groupBy.mockImplementation(async (args) => {
      if (args.by?.includes("state")) {
        return [{ state: "PENDING", _sum: { commissionAmount: { toString: () => "50.4" } } }];
      }
      if (args.by?.includes("referralId")) {
        return [
          {
            referralId: REFERRAL_ID,
            state: "PENDING",
            _sum: { commissionAmount: { toString: () => "50.4" } },
          },
        ];
      }
      return [];
    });
    prisma.referral.findMany.mockResolvedValue([
      {
        id: REFERRAL_ID,
        refereeUserId: "referee-user-1",
        referrerUserId: "referrer-user-1",
        programId: PROGRAM_ID,
        code: "T5YYUM8P",
        status: "ACTIVE",
        attributionSource: "MANUAL_CODE",
        refereeCreditApplied: true,
        refereeCreditAppliedAt: new Date("2026-05-18T06:00:00.000Z"),
        createdAt: new Date("2026-05-17T10:00:00.000Z"),
      },
    ]);
    prisma.demoUser.findMany.mockResolvedValue([
      { sub: "referee-user-1", email: "referee@test.com", name: "Referee One" },
    ]);
    prisma.subscriptionPayment.findMany.mockResolvedValue([
      {
        amountMinor: 100800,
        currency: "USD",
        capturedAt: new Date("2026-05-18T06:00:00.000Z"),
        subscription: { userId: "referee-user-1" },
      },
    ]);
    prisma.commission.findMany.mockResolvedValue([
      {
        id: "comm-1",
        referralId: REFERRAL_ID,
        sourcePaymentId: "pay-row-1",
        sourceInvoiceId: null,
        grossAmount: { toString: () => "1008" },
        netAmount: { toString: () => "1008" },
        rewardPct: { toString: () => "5" },
        commissionAmount: { toString: () => "50.4" },
        currency: "USD",
        state: "PENDING",
        accruedAt: new Date("2026-05-18T06:00:00.000Z"),
        payableAt: new Date("2026-06-17T06:00:00.000Z"),
        paidAt: null,
        clawbackReason: null,
        reversesCommissionId: null,
        createdAt: new Date("2026-05-18T06:00:00.000Z"),
        referral: { refereeUserId: "referee-user-1" },
      },
    ]);

    const res = await request(app)
      .get("/api/v1/referral/me/dashboard")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe("T5YYUM8P");
    expect(res.body.data.summary.refereeCount).toBe(1);
    expect(res.body.data.referees).toHaveLength(1);

    const row = res.body.data.referees[0];
    expect(row.referee).toEqual({ email: "referee@test.com", name: "Referee One" });
    expect(row.payment).toMatchObject({
      hasPaid: true,
      capturedPaymentCount: 1,
      totalPaidAmount: "1008",
      currency: "USD",
    });
    expect(row.commission.hasCommission).toBe(true);
    expect(row.commission.status).toBe("PENDING");
    expect(row.commissions).toHaveLength(1);
    expect(row.commissions[0].commissionAmount).toBe("50.4");
  });

  test("signup-only referee has NOT_ACCRUED commission status, not PENDING", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "referrer-user-1",
      programId: PROGRAM_ID,
      code: "T5YYUM8P",
      createdAt: new Date("2026-05-18T05:16:05.497Z"),
    });
    prisma.referral.count.mockResolvedValue(1);
    prisma.commission.groupBy.mockResolvedValue([]);
    prisma.referral.findMany.mockResolvedValue([
      {
        id: REFERRAL_ID,
        refereeUserId: "referee-user-1",
        referrerUserId: "referrer-user-1",
        programId: PROGRAM_ID,
        code: "T5YYUM8P",
        status: "ACTIVE",
        attributionSource: "MANUAL_CODE",
        refereeCreditApplied: false,
        refereeCreditAppliedAt: null,
        createdAt: new Date("2026-05-17T10:00:00.000Z"),
      },
    ]);
    prisma.demoUser.findMany.mockResolvedValue([
      { sub: "referee-user-1", email: "referee@test.com", name: "Referee One" },
    ]);
    prisma.subscriptionPayment.findMany.mockResolvedValue([]);
    prisma.commission.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/v1/referral/me/dashboard")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.status).toBe(200);
    const row = res.body.data.referees[0];
    expect(row.payment.hasPaid).toBe(false);
    expect(row.commission.hasCommission).toBe(false);
    expect(row.commission.status).toBe("NOT_ACCRUED");
    expect(row.commissions).toHaveLength(0);
  });
});
