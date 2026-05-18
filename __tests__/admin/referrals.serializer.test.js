import { referralToAdminDto, userProfileToAdminDto } from "../../services/adminReferralSerializer.js";

describe("adminReferralSerializer", () => {
  const referral = {
    id: "00000000-0000-4000-8000-000000000001",
    refereeUserId: "referee-sub",
    referrerUserId: "referrer-sub",
    programId: "00000000-0000-4000-8000-000000000002",
    code: "ABC123",
    status: "ACTIVE",
    attributionSource: "LINK",
    programVersionAtAttribution: 1,
    cookieData: null,
    ip: null,
    userAgent: null,
    terminatedAt: null,
    terminationReason: null,
    refereeCreditApplied: false,
    refereeCreditAppliedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("includes referrer and referee profiles when provided", () => {
    const dto = referralToAdminDto(referral, {
      referrer: { email: "referrer@example.com", name: "Referrer Name" },
      referee: { email: "referee@example.com", name: null },
      programCurrency: "USD",
    });

    expect(dto.referrer).toEqual({
      userId: "referrer-sub",
      email: "referrer@example.com",
      name: "Referrer Name",
    });
    expect(dto.referee).toEqual({
      userId: "referee-sub",
      email: "referee@example.com",
      name: null,
    });
  });

  it("includes payment block with hasPaid false when no captures", () => {
    const dto = referralToAdminDto(referral, { programCurrency: "USD" });

    expect(dto.payment).toEqual({
      hasPaid: false,
      capturedPaymentCount: 0,
      firstPaidAt: null,
      totalPaidAmount: "0",
      currency: "USD",
    });
  });

  it("includes payment block when referee has captured payments", () => {
    const dto = referralToAdminDto(referral, {
      programCurrency: "USD",
      paymentSummary: {
        capturedCount: 1,
        firstCapturedAt: new Date("2026-02-01T12:00:00.000Z"),
        totalAmountMinor: 49900,
        currency: "INR",
      },
    });

    expect(dto.payment).toEqual({
      hasPaid: true,
      capturedPaymentCount: 1,
      firstPaidAt: "2026-02-01T12:00:00.000Z",
      totalPaidAmount: "499",
      currency: "INR",
    });
  });

  it("returns null email and name when demo user is missing", () => {
    const dto = referralToAdminDto(referral, { programCurrency: "USD" });

    expect(dto.referrer).toEqual({
      userId: "referrer-sub",
      email: null,
      name: null,
    });
    expect(dto.referee).toEqual({
      userId: "referee-sub",
      email: null,
      name: null,
    });
  });

  it("userProfileToAdminDto maps profile fields", () => {
    expect(userProfileToAdminDto("sub-1", { email: "a@b.com", name: "A" })).toEqual({
      userId: "sub-1",
      email: "a@b.com",
      name: "A",
    });
  });
});
