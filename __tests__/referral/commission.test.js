import { jest } from "@jest/globals";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const { prisma } = await import("../../data/prismaClient.js");
const { accrueCommissionOnPayment } = await import("../../services/commissionService.js");

const REFERRAL_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PAYMENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REFEREE_USER_ID = "referee-user-1";

function activeReferral(overrides = {}) {
  return {
    id: REFERRAL_ID,
    refereeUserId: REFEREE_USER_ID,
    referrerUserId: "referrer-1",
    programId: PROGRAM_ID,
    status: "ACTIVE",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function program(overrides = {}) {
  return {
    id: PROGRAM_ID,
    rewardPct: { toString: () => "5" },
    holdPeriodDays: 30,
    refereeMinSpendAmount: null,
    refereeMinSpendWindowDays: null,
    ...overrides,
  };
}

describe("accrueCommissionOnPayment", () => {
  beforeEach(() => {
    prisma.commission.findUnique.mockReset();
    prisma.commission.create.mockReset();
    prisma.commission.findMany.mockReset();
    prisma.commission.update.mockReset();
    prisma.referral.findFirst.mockReset();
    prisma.program.findUnique.mockReset();
    prisma.subscriptionPayment.aggregate.mockReset();
    prisma.commission.findMany.mockResolvedValue([]);
  });

  test("creates PENDING commission with net × reward_pct and payable_at after hold", async () => {
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue(activeReferral());
    prisma.program.findUnique.mockResolvedValue(program());
    prisma.commission.create.mockResolvedValue({ id: "comm-1" });

    const capturedAt = new Date("2026-02-01T12:00:00.000Z");
    const result = await accrueCommissionOnPayment({
      userId: REFEREE_USER_ID,
      payment: {
        id: PAYMENT_ID,
        amountMinor: 99900,
        currency: "USD",
        capturedAt,
        razorpayInvoiceId: "inv_1",
      },
      subscription: { id: "sub-local-1" },
    });

    expect(result).toEqual({ accrued: true, commissionId: "comm-1" });
    expect(prisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        referral: { connect: { id: REFERRAL_ID } },
        sourcePayment: { connect: { id: PAYMENT_ID } },
        sourceInvoiceId: "inv_1",
        grossAmount: expect.objectContaining({ value: "999.00" }),
        netAmount: expect.objectContaining({ value: "999.00" }),
        rewardPct: expect.objectContaining({ value: "5" }),
        commissionAmount: expect.objectContaining({ value: "49.95" }),
        currency: "USD",
        state: "PENDING",
        accruedAt: capturedAt,
        payableAt: new Date("2026-03-03T12:00:00.000Z"),
      }),
    });
  });

  test("skips when commission already exists for payment", async () => {
    prisma.commission.findUnique.mockResolvedValue({ id: "comm-existing" });

    const result = await accrueCommissionOnPayment({
      userId: REFEREE_USER_ID,
      payment: { id: PAYMENT_ID, amountMinor: 10000, currency: "USD" },
      subscription: { id: "sub-1" },
    });

    expect(result).toEqual({
      accrued: false,
      reason: "duplicate",
      commissionId: "comm-existing",
    });
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  test("skips when payer has no ACTIVE referral", async () => {
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue(null);

    const result = await accrueCommissionOnPayment({
      userId: "solo-user",
      payment: { id: PAYMENT_ID, amountMinor: 10000, currency: "USD" },
      subscription: { id: "sub-1" },
    });

    expect(result).toEqual({ accrued: false, reason: "no_referral" });
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  test("accrues with null payable_at when min-spend gate is not met", async () => {
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue(activeReferral());
    prisma.program.findUnique.mockResolvedValue(
      program({
        refereeMinSpendAmount: { toString: () => "50" },
        refereeMinSpendWindowDays: 60,
      })
    );
    prisma.subscriptionPayment.aggregate.mockResolvedValue({ _sum: { amountMinor: 3000 } });
    prisma.commission.create.mockResolvedValue({ id: "comm-gate" });

    const result = await accrueCommissionOnPayment({
      userId: REFEREE_USER_ID,
      payment: { id: PAYMENT_ID, amountMinor: 3000, currency: "USD", capturedAt: new Date() },
      subscription: { id: "sub-1" },
    });

    expect(result.accrued).toBe(true);
    expect(prisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        state: "PENDING",
        payableAt: null,
      }),
    });
  });

  test("sets payable_at when min-spend gate is met and backfills prior rows", async () => {
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue(activeReferral());
    prisma.program.findUnique.mockResolvedValue(
      program({
        refereeMinSpendAmount: { toString: () => "50" },
        refereeMinSpendWindowDays: 60,
      })
    );
    prisma.subscriptionPayment.aggregate.mockResolvedValue({ _sum: { amountMinor: 6000 } });
    prisma.commission.create.mockResolvedValue({ id: "comm-gate-ok" });
    prisma.commission.findMany.mockResolvedValue([
      {
        id: "comm-old",
        accruedAt: new Date("2026-01-15T00:00:00.000Z"),
      },
    ]);
    prisma.commission.update.mockResolvedValue({});

    await accrueCommissionOnPayment({
      userId: REFEREE_USER_ID,
      payment: {
        id: PAYMENT_ID,
        amountMinor: 6000,
        currency: "USD",
        capturedAt: new Date("2026-02-01T00:00:00.000Z"),
      },
      subscription: { id: "sub-1" },
    });

    expect(prisma.commission.update).toHaveBeenCalledWith({
      where: { id: "comm-old" },
      data: { payableAt: new Date("2026-02-14T00:00:00.000Z") },
    });
  });
});
