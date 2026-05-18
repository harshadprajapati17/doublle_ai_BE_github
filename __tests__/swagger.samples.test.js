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

  test("ReferralAuthSignInRequest example includes email and password", () => {
    const ex = swaggerSpec.components.schemas.ReferralAuthSignInRequest.example;
    expect(ex).toMatchObject({ email: "user@example.com", password: "securepass123" });
  });

});
