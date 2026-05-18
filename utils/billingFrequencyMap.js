/**
 * Maps app billing frequency to Razorpay plan period + interval.
 * @param {"MONTHLY"|"QUARTERLY"|"HALF_YEARLY"|"YEARLY"} frequency
 * @returns {{ period: string; interval: number }}
 */
export function razorpayPlanPeriodFromFrequency(frequency) {
  switch (frequency) {
    case "MONTHLY":
      return { period: "monthly", interval: 1 };
    case "QUARTERLY":
      return { period: "monthly", interval: 3 };
    case "HALF_YEARLY":
      return { period: "monthly", interval: 6 };
    case "YEARLY":
      return { period: "yearly", interval: 1 };
    default:
      throw new Error(`Unsupported billing frequency: ${frequency}`);
  }
}
