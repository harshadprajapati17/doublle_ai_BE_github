import { describe, expect, test } from "@jest/globals";
import { subscriptionStandardCheckoutHints } from "../../utils/billingCheckoutHints.js";

describe("subscriptionStandardCheckoutHints", () => {
  test("returns keyId and subscriptionId when status is CREATED", () => {
    expect(
      subscriptionStandardCheckoutHints("sub_abc", "CREATED")
    ).toEqual({
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: "sub_abc",
    });
  });

  test("returns null for non-CREATED statuses", () => {
    expect(subscriptionStandardCheckoutHints("sub_abc", "ACTIVE")).toBeNull();
  });

  test("returns null when razorpaySubId is empty", () => {
    expect(subscriptionStandardCheckoutHints("", "CREATED")).toBeNull();
  });
});
