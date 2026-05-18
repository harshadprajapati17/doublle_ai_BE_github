import { razorpay } from "../config/razorpay.js";
import { razorpayPlanPeriodFromFrequency } from "../utils/billingFrequencyMap.js";
import { mapRazorpaySdkErrorToBillingProvider } from "../utils/mapRazorpaySdkError.js";
import {
  createBillingPlanRow,
  findBillingPlanByKey,
} from "../data/billingRepos.js";

/** @typedef {import("../generated/prisma/client.ts").BillingFrequency} BillingFrequency */

/**
 * @param {{ amountMinor: number; currency: string; frequency: BillingFrequency }} input
 */
export async function getOrCreateBillingPlan(input) {
  const { amountMinor, currency, frequency } = input;
  const existing = await findBillingPlanByKey(amountMinor, currency, frequency);
  if (existing) return existing;

  const { period, interval } = razorpayPlanPeriodFromFrequency(frequency);
  let rzpPlan;
  try {
    rzpPlan = await razorpay.plans.create({
      period,
      interval,
      item: {
        name: `Flexible ${frequency} ${currency}`,
        amount: amountMinor,
        currency,
        description: "Per-user custom recurring plan",
      },
    });
  } catch (err) {
    throw mapRazorpaySdkErrorToBillingProvider(err);
  }

  try {
    return await createBillingPlanRow({
      razorpayPlanId: rzpPlan.id,
      amountMinor,
      currency,
      frequency,
      period,
      interval,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const again = await findBillingPlanByKey(amountMinor, currency, frequency);
      if (again) return again;
    }
    throw err;
  }
}
