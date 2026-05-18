import { jest } from "@jest/globals";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const { prisma } = await import("../../data/prismaClient.js");
const { getRefereeBenefitStatusForUser } = await import(
  "../../services/refereeBenefitViewService.js"
);

const PROGRAM_ID = "11111111-1111-1111-1111-111111111111";
const REFEREE_USER_ID = "referee-user-1";

function creditProgram() {
  return {
    id: PROGRAM_ID,
    status: "ACTIVE",
    currency: "USD",
    refereeBenefitType: "CREDIT",
    refereeBenefitValue: { toString: () => "500" },
    refereeBenefitTrialDays: null,
  };
}

describe("getRefereeBenefitStatusForUser", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
    prisma.referral.findUnique.mockReset();
  });

  test("returns NO_ACTIVE_PROGRAM when none", async () => {
    prisma.program.findFirst.mockResolvedValue(null);
    const result = await getRefereeBenefitStatusForUser(REFEREE_USER_ID);
    expect(result).toEqual({ status: "NO_ACTIVE_PROGRAM" });
  });

  test("returns NOT_REFERRED with program benefit", async () => {
    prisma.program.findFirst.mockResolvedValue(creditProgram());
    prisma.referral.findUnique.mockResolvedValue(null);

    const result = await getRefereeBenefitStatusForUser(REFEREE_USER_ID);
    expect(result.status).toBe("NOT_REFERRED");
    expect(result.benefit).toEqual({
      type: "CREDIT",
      value: "500",
      currency: "USD",
      trialDays: null,
    });
    expect(result.applied).toBe(false);
  });

  test("returns PENDING before first payment credit", async () => {
    prisma.program.findFirst.mockResolvedValue(creditProgram());
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      programId: PROGRAM_ID,
      code: "ABCD2345",
      status: "ACTIVE",
      refereeCreditApplied: false,
      refereeCreditAppliedAt: null,
    });

    const result = await getRefereeBenefitStatusForUser(REFEREE_USER_ID);
    expect(result).toMatchObject({
      status: "PENDING",
      applied: false,
      appliedAt: null,
      code: "ABCD2345",
    });
  });

  test("returns APPLIED after webhook marks credit", async () => {
    prisma.program.findFirst.mockResolvedValue(creditProgram());
    prisma.referral.findUnique.mockResolvedValue({
      id: "ref-1",
      programId: PROGRAM_ID,
      code: "ABCD2345",
      status: "ACTIVE",
      refereeCreditApplied: true,
      refereeCreditAppliedAt: new Date("2026-05-18T05:17:06.000Z"),
    });

    const result = await getRefereeBenefitStatusForUser(REFEREE_USER_ID);
    expect(result).toMatchObject({
      status: "APPLIED",
      applied: true,
      appliedAt: "2026-05-18T05:17:06.000Z",
      benefit: { type: "CREDIT", value: "500", currency: "USD", trialDays: null },
    });
  });
});
