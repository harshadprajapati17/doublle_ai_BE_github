import { sumCapturedAmountMinorForUserInWindow } from "../data/billingRepos.js";
import * as commissionRepo from "../data/commissionRepo.js";
import * as programRepo from "../data/programRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { prisma, Decimal } from "../data/prismaClient.js";
import { logStructured } from "../utils/structuredLog.js";
import { evaluateFraudSignalsOnPayment } from "./fraudSignalService.js";

const SCOPE = "referral.commission";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Referee min-spend gate (when program.refereeMinSpendAmount is set):
 * We always accrue PENDING commission. payable_at is null until cumulative captured
 * spend by the referee within refereeMinSpendWindowDays from attribution reaches
 * refereeMinSpendAmount; then payable_at = accruedAt + holdPeriodDays for this row
 * and any earlier PENDING rows on the same referral that still have null payable_at.
 */

/**
 * @param {Date} base
 * @param {number} days
 */
function addDays(base, days) {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

/**
 * @param {number} amountMinor
 */
function amountMinorToDecimal(amountMinor) {
  const major = (amountMinor / 100).toFixed(2);
  return new Decimal(major);
}

/**
 * @param {import('../generated/prisma/client').Decimal} netAmount
 * @param {import('../generated/prisma/client').Decimal} rewardPct
 */
function computeCommissionAmount(netAmount, rewardPct) {
  return netAmount.mul(rewardPct).div(100);
}

/**
 * @param {import('../generated/prisma/client').Program} program
 * @param {import('../generated/prisma/client').Referral} referral
 * @param {string} refereeUserId
 */
async function isRefereeMinSpendGateMet(program, referral, refereeUserId) {
  if (program.refereeMinSpendAmount == null || program.refereeMinSpendWindowDays == null) {
    return true;
  }

  const windowEnd = addDays(referral.createdAt, program.refereeMinSpendWindowDays);
  const sumMinor = await sumCapturedAmountMinorForUserInWindow(refereeUserId, {
    since: referral.createdAt,
    until: windowEnd,
  });

  const thresholdMinor = Math.round(Number(String(program.refereeMinSpendAmount)) * 100);
  return sumMinor >= thresholdMinor;
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | typeof prisma} client
 * @param {string} referralId
 * @param {number} holdPeriodDays
 */
async function backfillPayableAtForReferral(client, referralId, holdPeriodDays) {
  const pending =
    (await commissionRepo.findMany(client, {
      where: { referralId, state: "PENDING", payableAt: null },
    })) ?? [];
  for (const row of pending) {
    await commissionRepo.update(client, row.id, {
      payableAt: addDays(row.accruedAt, holdPeriodDays),
    });
  }
}

/**
 * Accrue referrer commission for a captured subscription payment.
 * Idempotent per sourcePaymentId (unique constraint + pre-check).
 *
 * @param {{
 *   userId: string;
 *   payment: { id: string; amountMinor: number; currency: string; capturedAt?: Date | null; razorpayInvoiceId?: string | null };
 *   subscription: { id: string };
 * }} input
 */
export async function accrueCommissionOnPayment(input) {
  const { userId, payment, subscription } = input;

  const existing = await commissionRepo.findBySourcePaymentId(prisma, payment.id);
  if (existing) {
    logStructured("info", {
      scope: SCOPE,
      phase: "skip_duplicate",
      userId,
      paymentId: payment.id,
      commissionId: existing.id,
    });
    return { accrued: false, reason: "duplicate", commissionId: existing.id };
  }

  const referral = await referralRepo.findCommissionableByReferee(prisma, userId);
  if (!referral) {
    const rejected = await referralRepo.findFirst(prisma, {
      where: { refereeUserId: userId, status: "FRAUD_REJECTED" },
    });
    if (rejected) {
      logStructured("info", {
        scope: SCOPE,
        phase: "skip_referral_rejected",
        userId,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        referralId: rejected.id,
      });
      return { accrued: false, reason: "referral_rejected", referralId: rejected.id };
    }
    const terminated = await referralRepo.findFirst(prisma, {
      where: { refereeUserId: userId, status: "TERMINATED" },
    });
    if (terminated) {
      logStructured("info", {
        scope: SCOPE,
        phase: "skip_referral_terminated",
        userId,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        referralId: terminated.id,
      });
      return { accrued: false, reason: "referral_terminated", referralId: terminated.id };
    }
    logStructured("info", {
      scope: SCOPE,
      phase: "skip_no_referral",
      userId,
      paymentId: payment.id,
      subscriptionId: subscription.id,
    });
    return { accrued: false, reason: "no_referral" };
  }

  const program = await programRepo.findUnique(prisma, referral.programId);
  if (!program) {
    logStructured("warn", {
      scope: SCOPE,
      phase: "skip_program_missing",
      userId,
      paymentId: payment.id,
      referralId: referral.id,
      programId: referral.programId,
    });
    return { accrued: false, reason: "program_missing" };
  }

  const rewardPct = new Decimal(String(program.rewardPct));
  const grossAmount = amountMinorToDecimal(payment.amountMinor);
  const netAmount = grossAmount;
  const commissionAmount = computeCommissionAmount(netAmount, rewardPct);
  const accruedAt = payment.capturedAt ?? new Date();
  const holdPeriodDays = program.holdPeriodDays;

  const gateMet = await isRefereeMinSpendGateMet(program, referral, userId);
  const payableAt = gateMet ? addDays(accruedAt, holdPeriodDays) : null;

  try {
    const created = await commissionRepo.create(prisma, {
      referral: { connect: { id: referral.id } },
      sourcePayment: { connect: { id: payment.id } },
      sourceInvoiceId: payment.razorpayInvoiceId ?? undefined,
      grossAmount,
      netAmount,
      rewardPct,
      commissionAmount,
      currency: payment.currency,
      state: "PENDING",
      accruedAt,
      payableAt,
    });

    if (gateMet) {
      await backfillPayableAtForReferral(prisma, referral.id, holdPeriodDays);
    }

    logStructured("info", {
      scope: SCOPE,
      phase: "accrued",
      userId,
      paymentId: payment.id,
      referralId: referral.id,
      commissionId: created.id,
      commissionAmount: commissionAmount.toString(),
      payableAt: payableAt?.toISOString() ?? null,
      minSpendGateMet: gateMet,
    });

    await evaluateFraudSignalsOnPayment({
      referralId: referral.id,
      commissionAmount,
      currency: payment.currency,
    });

    return { accrued: true, commissionId: created.id };
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const dup = await commissionRepo.findBySourcePaymentId(prisma, payment.id);
      logStructured("info", {
        scope: SCOPE,
        phase: "skip_duplicate_race",
        userId,
        paymentId: payment.id,
        commissionId: dup?.id,
      });
      return { accrued: false, reason: "duplicate", commissionId: dup?.id };
    }
    throw err;
  }
}

/**
 * @param {import('../generated/prisma/client').Decimal | { toString(): string }} value
 */
function negateDecimal(value) {
  return new Decimal(String(value)).mul(-1);
}

/**
 * Batch: PENDING → EARNED when payable_at <= asOf (and payable_at is set).
 * @param {{ asOf?: Date }} [input]
 */
export async function transitionPendingToEarned(input = {}) {
  const asOf = input.asOf ?? new Date();
  const result = await commissionRepo.updateMany(prisma, {
    where: {
      state: "PENDING",
      payableAt: { lte: asOf, not: null },
    },
    data: { state: "EARNED" },
  });

  logStructured("info", {
    scope: SCOPE,
    phase: "transition_pending_to_earned",
    asOf: asOf.toISOString(),
    count: result.count,
  });

  return { transitioned: result.count };
}

/**
 * Stub until invoice credit integration: EARNED → PAID with paid_at.
 * @param {{ commissionId?: string; limit?: number }} [input]
 */
export async function applyEarnedCredit(input = {}) {
  const limit = input.limit ?? 100;
  const where =
    input.commissionId != null
      ? { id: input.commissionId, state: "EARNED" }
      : { state: "EARNED", paidAt: null };

  const rows =
    (await commissionRepo.findMany(prisma, {
      where,
      take: limit,
      orderBy: { accruedAt: "asc" },
    })) ?? [];

  const paidAt = new Date();
  const paidIds = [];

  for (const row of rows) {
    logStructured("info", {
      scope: SCOPE,
      phase: "credit_apply_stub",
      commissionId: row.id,
      referralId: row.referralId,
      commissionAmount: String(row.commissionAmount),
      currency: row.currency,
    });
    await commissionRepo.update(prisma, row.id, {
      state: "PAID",
      paidAt,
    });
    paidIds.push(row.id);
  }

  logStructured("info", {
    scope: SCOPE,
    phase: "apply_earned_credit",
    count: paidIds.length,
  });

  return { paid: paidIds.length, commissionIds: paidIds };
}

/**
 * Refund/chargeback clawback: mark source commission CLAWED_BACK and append reversal row.
 * Idempotent per source commission (skips if already reversed).
 *
 * @param {{ paymentId: string; reason?: string }} input
 */
export async function clawbackCommissionsForPayment(input) {
  const reason = input.reason ?? "payment_refunded";
  const commission = await commissionRepo.findBySourcePaymentId(prisma, input.paymentId);
  if (!commission) {
    logStructured("info", {
      scope: SCOPE,
      phase: "clawback_skip_no_commission",
      paymentId: input.paymentId,
    });
    return { clawedBack: false, reason: "no_commission" };
  }

  if (commission.state === "CLAWED_BACK") {
    logStructured("info", {
      scope: SCOPE,
      phase: "clawback_skip_already_clawed",
      paymentId: input.paymentId,
      commissionId: commission.id,
    });
    return { clawedBack: false, reason: "already_clawed_back", commissionId: commission.id };
  }

  const existingReversal = await commissionRepo.findReversalForCommission(
    prisma,
    commission.id
  );
  if (existingReversal) {
    logStructured("info", {
      scope: SCOPE,
      phase: "clawback_skip_duplicate",
      paymentId: input.paymentId,
      commissionId: commission.id,
      reversalId: existingReversal.id,
    });
    return {
      clawedBack: false,
      reason: "duplicate",
      commissionId: commission.id,
      reversalId: existingReversal.id,
    };
  }

  const now = new Date();
  const reversal = await prisma.$transaction(async (tx) => {
    await commissionRepo.update(tx, commission.id, {
      state: "CLAWED_BACK",
      clawbackReason: reason,
    });
    return commissionRepo.create(tx, {
      referral: { connect: { id: commission.referralId } },
      reversesCommission: { connect: { id: commission.id } },
      grossAmount: negateDecimal(commission.grossAmount),
      netAmount: negateDecimal(commission.netAmount),
      commissionAmount: negateDecimal(commission.commissionAmount),
      rewardPct: commission.rewardPct,
      currency: commission.currency,
      state: "CLAWED_BACK",
      accruedAt: now,
      clawbackReason: reason,
    });
  });

  logStructured("info", {
    scope: SCOPE,
    phase: "clawed_back",
    paymentId: input.paymentId,
    commissionId: commission.id,
    reversalId: reversal.id,
    priorState: commission.state,
  });

  return {
    clawedBack: true,
    commissionId: commission.id,
    reversalId: reversal.id,
  };
}
