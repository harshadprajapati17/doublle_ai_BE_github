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

  test("POST /api/v1/admin/programs requestBody has media-level example (Swagger UI)", () => {
    const media = swaggerSpec.paths["/api/v1/admin/programs"].post.requestBody.content[
      "application/json"
    ];
    expect(media.example).toEqual(swaggerSpec.components.schemas.ProgramCreate.example);
    expect(media.schema.$ref).toBe("#/components/schemas/ProgramCreate");
  });
});
