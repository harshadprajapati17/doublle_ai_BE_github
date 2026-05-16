import { describe, expect, test } from "@jest/globals";
import { swaggerSpec } from "../config/swagger.js";

describe("OpenAPI sample examples", () => {
  test("ProgramCreate includes a realistic example body", () => {
    const ex = swaggerSpec.components.schemas.ProgramCreate.example;
    expect(ex).toEqual({
      name: "Standard Referral",
      referrerRewardPct: 5,
      referrerRewardDurationMonths: 12,
      cookieDays: 30,
      attributionRule: "FIRST_TOUCH_CODE_OVERRIDE",
      refereeBenefitType: "NONE",
      refereeBenefitValue: null,
      holdPeriodDays: 30,
      capBehavior: "ROLL_FORWARD",
      termsVersion: "v1",
      currency: "USD",
    });
  });

  test("CreateOrderRequest example has amount matching plan.total", () => {
    const ex = swaggerSpec.components.schemas.CreateOrderRequest.example;
    expect(ex.amount).toBe(ex.plan.total);
    expect(ex.currency).toBe("USD");
  });

  test("VerifyPaymentRequest example includes all required fields", () => {
    const ex = swaggerSpec.components.schemas.VerifyPaymentRequest.example;
    expect(ex.razorpay_order_id).toMatch(/^order_/);
    expect(ex.razorpay_payment_id).toMatch(/^pay_/);
    expect(typeof ex.razorpay_signature).toBe("string");
    expect(ex.razorpay_signature.length).toBeGreaterThan(10);
  });

  test("CreateSubscriptionRequest example matches BillingFrequency enum", () => {
    const ex = swaggerSpec.components.schemas.CreateSubscriptionRequest.example;
    expect(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).toContain(ex.frequency);
    expect(ex.currency).toBe("INR");
    expect(typeof ex.amount).toBe("number");
  });

  test("CancelSubscriptionRequest example includes cancelAtCycleEnd", () => {
    const ex = swaggerSpec.components.schemas.CancelSubscriptionRequest.example;
    expect(typeof ex.cancelAtCycleEnd).toBe("boolean");
  });

  test("POST /api/v1/admin/programs requestBody has media-level example (Swagger UI)", () => {
    const media = swaggerSpec.paths["/api/v1/admin/programs"].post.requestBody.content[
      "application/json"
    ];
    expect(media.example).toEqual(swaggerSpec.components.schemas.ProgramCreate.example);
    expect(media.schema.$ref).toBe("#/components/schemas/ProgramCreate");
  });

  test("DemoAuthLoginRequest example email matches documented demo user", () => {
    const ex = swaggerSpec.components.schemas.DemoAuthLoginRequest.example;
    expect(ex).toEqual({ email: "testuser1@test.com" });
  });

  test("DemoUserCreate example includes sub and email", () => {
    const ex = swaggerSpec.components.schemas.DemoUserCreate.example;
    expect(ex).toMatchObject({ sub: "demo-user-1", email: "testuser1@test.com" });
  });

  test("DemoAdminCreate example includes sub and email", () => {
    const ex = swaggerSpec.components.schemas.DemoAdminCreate.example;
    expect(ex).toMatchObject({ sub: "demo-admin-1", email: "admin1@test.com" });
  });
});
