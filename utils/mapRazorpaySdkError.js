import { BillingProviderError } from "../errors/index.js";

/**
 * @param {unknown} err
 */
export function mapRazorpaySdkErrorToBillingProvider(err) {
  const providerCode =
    err && typeof err === "object" && "error" in err && err.error && typeof err.error === "object"
      ? /** @type {{ code?: string }} */ (err.error).code
      : undefined;
  const providerDescription =
    err && typeof err === "object" && "error" in err && err.error && typeof err.error === "object"
      ? /** @type {{ description?: string }} */ (err.error).description
      : undefined;
  const providerStatus =
    err && typeof err === "object" && "statusCode" in err
      ? /** @type {{ statusCode?: number }} */ (err).statusCode
      : undefined;

  return new BillingProviderError("Razorpay rejected the request.", {
    provider: "razorpay",
    providerStatus,
    providerCode,
    providerDescription,
  });
}
