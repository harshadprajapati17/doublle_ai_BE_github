import { jest } from "@jest/globals";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const { prisma } = await import("../../data/prismaClient.js");
const { tryApplyRefereeBenefitOnPayment } = await import(
  "../../services/refereeBenefitService.js"
);

const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const REFERRAL_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PAYMENT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const SUBSCRIPTION_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const REFEREE_USER_ID = "referee-user-1";

function creditProgram(overrides = {}) {
  return {
    id: PROGRAM_ID,
    refereeBenefitType: "CREDIT",
    refereeBenefitValue: { toString: () => "25.00" },
    currency: "USD",
    ...overrides,
  };
}

function pendingReferral(overrides = {}) {
  return {
    id: REFERRAL_ID,
    refereeUserId: REFEREE_USER_ID,
    programId: PROGRAM_ID,
    status: "ACTIVE",
    refereeCreditApplied: false,
    ...overrides,
  };
}

describe("tryApplyRefereeBenefitOnPayment", () => {
  beforeEach(() => {
    prisma.referral.findFirst.mockReset();
    prisma.referral.update.mockReset();
    prisma.program.findUnique.mockReset();
    prisma.subscriptionPayment.count.mockReset();
  });

  test("applies credit and flags referral on first captured payment", async () => {
    prisma.referral.findFirst.mockResolvedValue(pendingReferral());
    prisma.subscriptionPayment.count.mockResolvedValue(1);
    prisma.program.findUnique.mockResolvedValue(creditProgram());
    prisma.referral.update.mockResolvedValue({});

    const result = await tryApplyRefereeBenefitOnPayment({
      userId: REFEREE_USER_ID,
      paymentId: PAYMENT_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });

    expect(result).toEqual({ applied: true, referralId: REFERRAL_ID });
    expect(prisma.referral.update).toHaveBeenCalledWith({
      where: { id: REFERRAL_ID },
      data: expect.objectContaining({
        refereeCreditApplied: true,
        refereeCreditAppliedAt: expect.any(Date),
      }),
    });
  });

  test("marks referral applied for NONE benefit without credit grant path", async () => {
    prisma.referral.findFirst.mockResolvedValue(pendingReferral());
    prisma.subscriptionPayment.count.mockResolvedValue(1);
    prisma.program.findUnique.mockResolvedValue(
      creditProgram({ refereeBenefitType: "NONE", refereeBenefitValue: null })
    );
    prisma.referral.update.mockResolvedValue({});

    const result = await tryApplyRefereeBenefitOnPayment({
      userId: REFEREE_USER_ID,
      paymentId: PAYMENT_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });

    expect(result.applied).toBe(true);
    expect(prisma.referral.update).toHaveBeenCalledTimes(1);
  });

  test("skips when not first captured payment", async () => {
    prisma.referral.findFirst.mockResolvedValue(pendingReferral());
    prisma.subscriptionPayment.count.mockResolvedValue(2);

    const result = await tryApplyRefereeBenefitOnPayment({
      userId: REFEREE_USER_ID,
      paymentId: PAYMENT_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });

    expect(result).toEqual({ applied: false, reason: "not_first_capture" });
    expect(prisma.program.findUnique).not.toHaveBeenCalled();
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });

  test("skips when no pending referral", async () => {
    prisma.referral.findFirst.mockResolvedValue(null);

    const result = await tryApplyRefereeBenefitOnPayment({
      userId: "non-referred-user",
      paymentId: PAYMENT_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });

    expect(result).toEqual({ applied: false, reason: "no_pending_referral" });
    expect(prisma.subscriptionPayment.count).not.toHaveBeenCalled();
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });

  test("is idempotent when credit already applied (no pending referral)", async () => {
    prisma.referral.findFirst.mockResolvedValue(null);

    const result = await tryApplyRefereeBenefitOnPayment({
      userId: REFEREE_USER_ID,
      paymentId: PAYMENT_ID,
      subscriptionId: SUBSCRIPTION_ID,
    });

    expect(result).toEqual({ applied: false, reason: "no_pending_referral" });
    expect(prisma.referral.update).not.toHaveBeenCalled();
  });
});
