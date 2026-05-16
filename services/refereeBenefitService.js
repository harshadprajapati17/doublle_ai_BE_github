import { countCapturedPaymentsForUser } from "../data/billingRepos.js";
import * as programRepo from "../data/programRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { prisma } from "../data/prismaClient.js";
import { logStructured } from "../utils/structuredLog.js";

const SCOPE = "referral.referee_benefit";

/**
 * Stub until a real credits API exists.
 * @param {{ userId: string; paymentId: string; referralId: string; amount: string; currency: string }} input
 */
function grantRefereeCreditStub(input) {
  logStructured("info", {
    scope: SCOPE,
    phase: "credit_grant_stub",
    userId: input.userId,
    paymentId: input.paymentId,
    referralId: input.referralId,
    amount: input.amount,
    currency: input.currency,
  });
}

/**
 * Apply referee benefit on the referee's first captured subscription payment.
 * Idempotent: skips when credit already applied or this is not the first capture.
 *
 * @param {{ userId: string; paymentId: string; subscriptionId: string }} input
 */
export async function tryApplyRefereeBenefitOnPayment(input) {
  const { userId, paymentId, subscriptionId } = input;
  
  const referral = await referralRepo.findActivePendingCreditByReferee(prisma, userId);
  if (!referral) {
    logStructured("info", {
      scope: SCOPE,
      phase: "skip_no_pending_referral",
      userId,
      paymentId,
      subscriptionId,
    });
    return { applied: false, reason: "no_pending_referral" };
  }

  const capturedCount = await countCapturedPaymentsForUser(userId);
  if (capturedCount !== 1) {
    logStructured("info", {
      scope: SCOPE,
      phase: "skip_not_first_capture",
      userId,
      paymentId,
      subscriptionId,
      referralId: referral.id,
      capturedCount,
    });
    return { applied: false, reason: "not_first_capture" };
  }

  const program = await programRepo.findUnique(prisma, referral.programId);
  if (!program) {
    logStructured("warn", {
      scope: SCOPE,
      phase: "skip_program_missing",
      userId,
      paymentId,
      subscriptionId,
      referralId: referral.id,
      programId: referral.programId,
    });
    return { applied: false, reason: "program_missing" };
  }

  if (program.refereeBenefitType === "CREDIT") {
    const amount =
      program.refereeBenefitValue != null ? String(program.refereeBenefitValue) : "0";
    grantRefereeCreditStub({
      userId,
      paymentId,
      referralId: referral.id,
      amount,
      currency: program.currency,
    });
  } else {
    logStructured("info", {
      scope: SCOPE,
      phase: "skip_non_credit_benefit",
      userId,
      paymentId,
      subscriptionId,
      referralId: referral.id,
      benefitType: program.refereeBenefitType,
    });
  }

  const now = new Date();
  await referralRepo.update(prisma, referral.id, {
    refereeCreditApplied: true,
    refereeCreditAppliedAt: now,
  });

  logStructured("info", {
    scope: SCOPE,
    phase: "applied",
    userId,
    paymentId,
    subscriptionId,
    referralId: referral.id,
    benefitType: program.refereeBenefitType,
  });

  return { applied: true, referralId: referral.id };
}
