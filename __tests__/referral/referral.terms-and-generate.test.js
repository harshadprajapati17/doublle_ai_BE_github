import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const PROGRAM_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ACCEPT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CODE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

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
    termsVersion: "v1",
    createdAt: d,
    updatedAt: d,
    ...overrides,
  };
}

describe("Referral: POST /api/v1/referral/terms/accept", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
    prisma.referralTermsAcceptance.findUnique.mockReset();
    prisma.referralTermsAcceptance.create.mockReset();
    prisma.referralCode.findUnique.mockReset();
    prisma.referralCode.create.mockReset();
  });

  test("accept returns 201, records acceptance, and allocates code + URL", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralTermsAcceptance.findUnique.mockResolvedValue(null);
    prisma.referralTermsAcceptance.create.mockResolvedValue({
      id: ACCEPT_ID,
      userId: "user-99",
      programId: PROGRAM_ID,
      termsVersion: "v1",
      acceptedAt: new Date("2026-01-15T12:00:01.000Z"),
      ip: "127.0.0.1",
    });
    prisma.referralCode.findUnique.mockResolvedValue(null);
    prisma.referralCode.create.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "user-99",
      programId: PROGRAM_ID,
      code: "ABCD2345",
      createdAt: new Date("2026-01-15T12:05:00.000Z"),
    });

    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${userToken()}`)
      .set("X-Forwarded-For", "203.0.113.9")
      .send({});

    const base = process.env.REFERRAL_PUBLIC_BASE_URL.replace(/\/$/, "");
    const expectedUrl = new URL(base);
    expectedUrl.searchParams.set("ref", "ABCD2345");

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      programId: PROGRAM_ID,
      termsVersion: "v1",
      idempotent: false,
      code: "ABCD2345",
      referralUrl: expectedUrl.toString(),
    });
    expect(res.body.data.acceptedAt).toBe("2026-01-15T12:00:01.000Z");
    expect(res.body.data.createdAt).toBe("2026-01-15T12:05:00.000Z");
    expect(prisma.referralTermsAcceptance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-99",
        programId: PROGRAM_ID,
        termsVersion: "v1",
        ip: "203.0.113.9",
      }),
    });
    expect(prisma.referralCode.create).toHaveBeenCalledTimes(1);
  });

  test("accept returns 200 when already accepted and returns existing link fields", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralTermsAcceptance.findUnique.mockResolvedValue({
      id: ACCEPT_ID,
      userId: "user-99",
      programId: PROGRAM_ID,
      termsVersion: "v1",
      acceptedAt: new Date("2026-01-10T08:00:00.000Z"),
      ip: "10.0.0.1",
    });

    prisma.referralCode.findUnique.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "user-99",
      programId: PROGRAM_ID,
      code: "ZZZZ9999",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({});

    const base = process.env.REFERRAL_PUBLIC_BASE_URL.replace(/\/$/, "");
    const expectedUrl = new URL(base);
    expectedUrl.searchParams.set("ref", "ZZZZ9999");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      idempotent: true,
      termsVersion: "v1",
      code: "ZZZZ9999",
      referralUrl: expectedUrl.toString(),
    });
    expect(res.body.data.acceptedAt).toBe("2026-01-10T08:00:00.000Z");
    expect(res.body.data.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(prisma.referralTermsAcceptance.create).not.toHaveBeenCalled();
    expect(prisma.referralCode.create).not.toHaveBeenCalled();
  });

  test("accept returns 200 when terms already accepted and allocates code if missing", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralTermsAcceptance.findUnique.mockResolvedValue({
      id: ACCEPT_ID,
      userId: "user-99",
      programId: PROGRAM_ID,
      termsVersion: "v1",
      acceptedAt: new Date("2026-01-10T08:00:00.000Z"),
      ip: "10.0.0.1",
    });
    prisma.referralCode.findUnique.mockResolvedValue(null);
    prisma.referralCode.create.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "user-99",
      programId: PROGRAM_ID,
      code: "NEWCODE1",
      createdAt: new Date("2026-01-20T10:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({});

    const base = process.env.REFERRAL_PUBLIC_BASE_URL.replace(/\/$/, "");
    const expectedUrl = new URL(base);
    expectedUrl.searchParams.set("ref", "NEWCODE1");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      idempotent: true,
      code: "NEWCODE1",
      referralUrl: expectedUrl.toString(),
    });
    expect(prisma.referralTermsAcceptance.create).not.toHaveBeenCalled();
    expect(prisma.referralCode.create).toHaveBeenCalledTimes(1);
  });

  test("accept returns 503 when REFERRAL_PUBLIC_BASE_URL is unset", async () => {
    const prev = process.env.REFERRAL_PUBLIC_BASE_URL;
    delete process.env.REFERRAL_PUBLIC_BASE_URL;
    try {
      const res = await request(app)
        .post("/api/v1/referral/terms/accept")
        .set("Authorization", `Bearer ${userToken()}`)
        .send({});

      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe("SERVICE_MISCONFIGURED");
      expect(prisma.program.findFirst).not.toHaveBeenCalled();
    } finally {
      process.env.REFERRAL_PUBLIC_BASE_URL = prev;
    }
  });

  test("rejects unknown JSON fields on accept", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    const res = await request(app)
      .post("/api/v1/referral/terms/accept")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ extra: true });

    expect(res.statusCode).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("Referral: GET /api/v1/referral/me", () => {
  beforeEach(() => {
    prisma.program.findFirst.mockReset();
    prisma.referralCode.findUnique.mockReset();
    prisma.referralCode.create.mockReset();
  });

  test("returns 200 with code and referralUrl when user has a code", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue({
      id: CODE_ID,
      ownerUserId: "user-99",
      programId: PROGRAM_ID,
      code: "MECODE12",
      createdAt: new Date("2026-01-10T08:00:00.000Z"),
    });

    const res = await request(app)
      .get("/api/v1/referral/me")
      .set("Authorization", `Bearer ${userToken()}`);

    const base = process.env.REFERRAL_PUBLIC_BASE_URL.replace(/\/$/, "");
    const expectedUrl = new URL(base);
    expectedUrl.searchParams.set("ref", "MECODE12");

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      programId: PROGRAM_ID,
      termsVersion: "v1",
      code: "MECODE12",
      referralUrl: expectedUrl.toString(),
    });
    expect(res.body.data.createdAt).toBe("2026-01-10T08:00:00.000Z");
    expect(prisma.referralCode.create).not.toHaveBeenCalled();
  });

  test("returns 404 NOT_FOUND when active program exists but user has no code", async () => {
    prisma.program.findFirst.mockResolvedValue(activeProgram());
    prisma.referralCode.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/referral/me")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error?.code).toBe("NOT_FOUND");
  });

  test("returns 404 NO_ACTIVE_REFERRAL_PROGRAM when no active program", async () => {
    prisma.program.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/referral/me")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error?.code).toBe("NO_ACTIVE_REFERRAL_PROGRAM");
  });

  test("returns 503 when REFERRAL_PUBLIC_BASE_URL is unset", async () => {
    const prev = process.env.REFERRAL_PUBLIC_BASE_URL;
    delete process.env.REFERRAL_PUBLIC_BASE_URL;
    try {
      const res = await request(app)
        .get("/api/v1/referral/me")
        .set("Authorization", `Bearer ${userToken()}`);

      expect(res.statusCode).toBe(503);
      expect(res.body.error?.code).toBe("SERVICE_MISCONFIGURED");
      expect(prisma.program.findFirst).not.toHaveBeenCalled();
    } finally {
      process.env.REFERRAL_PUBLIC_BASE_URL = prev;
    }
  });
});
