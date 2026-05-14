import { jest } from "@jest/globals";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_PROGRAM_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

function activeProgram(overrides = {}) {
  const d = new Date("2026-01-15T12:00:00.000Z");
  return {
    id: PROGRAM_ID,
    name: "Standard",
    status: "ACTIVE",
    termsVersion: "v1",
    refereeBenefitType: "NONE",
    refereeBenefitValue: null,
    refereeBenefitTrialDays: null,
    currency: "USD",
    createdAt: d,
    updatedAt: d,
    ...overrides,
  };
}

describe("Referral: POST /api/v1/referral/code/validate", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
    prisma.referralCode.findUnique.mockReset();
  });

  test("returns 200 valid=true without Authorization when code matches active program", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockImplementation((args) => {
      if (args?.where?.code === "ABCD2345") {
        return {
          id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
          ownerUserId: "user-1",
          programId: PROGRAM_ID,
          code: "ABCD2345",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
      }
      return null;
    });

    const res = await request(app).post("/api/v1/referral/code/validate").send({ code: "abcd2345" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({
      valid: true,
      programId: PROGRAM_ID,
      code: "ABCD2345",
      refereeBenefit: {
        type: "NONE",
        value: null,
        currency: "USD",
        trialDays: null,
      },
    });
    expect(prisma.referralCode.findUnique).toHaveBeenCalledWith({
      where: { code: "ABCD2345" },
    });
  });

  test("returns 200 valid=false when code is unknown", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ZZZZ9999" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ valid: false });
  });

  test("returns 200 valid=false when there is no active program", async () => {
    prisma.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ABCD2345" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ valid: false });
    expect(prisma.referralCode.findUnique).not.toHaveBeenCalled();
  });

  test("returns 200 valid=false when code belongs to a non-active program id", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      ownerUserId: "user-1",
      programId: OTHER_PROGRAM_ID,
      code: "ABCD2345",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ABCD2345" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ valid: false });
  });

  test("returns referee benefit for CREDIT program", async () => {
    prisma.program.findFirst.mockResolvedValue(
      activeProgram({
        refereeBenefitType: "CREDIT",
        refereeBenefitValue: { toString: () => "15.50" },
      })
    );
    prisma.referralCode.findUnique.mockResolvedValue({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      ownerUserId: "user-1",
      programId: PROGRAM_ID,
      code: "ABCD2345",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ABCD2345" });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.refereeBenefit).toEqual({
      type: "CREDIT",
      value: "15.50",
      currency: "USD",
      trialDays: null,
    });
  });

  test("returns 400 for unknown JSON fields", async () => {
    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ABCD2345", extra: true });

    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 for invalid code charset (e.g. I/O)", async () => {
    const res = await request(app)
      .post("/api/v1/referral/code/validate")
      .send({ code: "ABCDIO12" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  test("returns 400 when code is too short", async () => {
    const res = await request(app).post("/api/v1/referral/code/validate").send({ code: "ABC12" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});
