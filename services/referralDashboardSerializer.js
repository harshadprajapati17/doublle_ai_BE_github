import { decimalToString, refereeBenefitFromProgram } from "./programSerializer.js";

/**
 * @param {Array<{ state: string; _sum: { commissionAmount: unknown } | null }>} groups
 */
export function totalsFromStateGroups(groups) {
  /** @type {Record<string, number>} */
  const sums = { PENDING: 0, EARNED: 0, PAID: 0, CLAWED_BACK: 0 };
  for (const row of groups) {
    const raw = row._sum?.commissionAmount;
    const n = raw == null ? 0 : Number(String(raw));
    sums[row.state] = (sums[row.state] ?? 0) + n;
  }
  return {
    pendingTotal: decimalToString(sums.PENDING),
    earnedTotal: decimalToString(sums.EARNED),
    paidTotal: decimalToString(sums.PAID),
    clawedBackTotal: decimalToString(sums.CLAWED_BACK),
  };
}

/**
 * @param {string} currency
 * @param {ReturnType<typeof totalsFromStateGroups>} totals
 */
export function summaryToDto(currency, totals, refereeCount) {
  const earned = Number(totals.earnedTotal ?? 0);
  const paid = Number(totals.paidTotal ?? 0);
  return {
    refereeCount,
    currency,
    pendingTotal: totals.pendingTotal ?? "0",
    earnedTotal: totals.earnedTotal ?? "0",
    paidTotal: totals.paidTotal ?? "0",
    clawedBackTotal: totals.clawedBackTotal ?? "0",
    totalEarned: String(earned + paid),
  };
}

/**
 * @param {import('../generated/prisma/client').Referral} referral
 * @param {ReturnType<typeof totalsFromStateGroups>} totals
 * @param {import('../generated/prisma/client').Program} program
 * @param {boolean} [hasPaid]
 */
export function refereeRowToDto(referral, totals, program, hasPaid = false) {
  const commission = commissionStatusToDto(totals, [], hasPaid);
  return {
    referralId: referral.id,
    refereeUserId: referral.refereeUserId,
    status: referral.status,
    attributionSource: referral.attributionSource,
    attributedAt: referral.createdAt.toISOString(),
    refereeCreditApplied: referral.refereeCreditApplied,
    refereeCreditAppliedAt: referral.refereeCreditAppliedAt
      ? referral.refereeCreditAppliedAt.toISOString()
      : null,
    refereeBenefit: refereeBenefitFromProgram(program),
    currency: program.currency,
    commission,
  };
}

/**
 * @param {import('../generated/prisma/client').Commission & { referral: { refereeUserId: string } }} row
 */
/**
 * @param {{ capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null } | undefined} paymentSummary
 * @param {string} programCurrency
 */
export function paymentStatusToDto(paymentSummary, programCurrency) {
  const capturedCount = paymentSummary?.capturedCount ?? 0;
  const currency = paymentSummary?.currency ?? programCurrency;
  return {
    hasPaid: capturedCount > 0,
    capturedPaymentCount: capturedCount,
    firstPaidAt: paymentSummary?.firstCapturedAt
      ? paymentSummary.firstCapturedAt.toISOString()
      : null,
    totalPaidAmount:
      capturedCount > 0
        ? String(Math.floor((paymentSummary?.totalAmountMinor ?? 0) / 100))
        : "0",
    currency,
  };
}

/**
 * Display status for referrer UI. NOT_ACCRUED = signed up, no qualifying payment yet.
 * PENDING/EARNED/PAID/CLAWED_BACK mirror commission rows (created only after payment).
 *
 * @param {ReturnType<typeof totalsFromStateGroups>} totals
 * @param {ReturnType<typeof commissionTransactionToDto>[]} commissions
 * @param {boolean} hasPaid
 * @returns {"NOT_ACCRUED" | "PENDING" | "EARNED" | "PAID" | "CLAWED_BACK"}
 */
export function deriveCommissionDisplayStatus(totals, commissions, hasPaid) {
  if (commissions.length > 0) {
    const sorted = [...commissions].sort(
      (a, b) => new Date(b.accruedAt).getTime() - new Date(a.accruedAt).getTime()
    );
    return sorted[0].state;
  }

  const pending = Number(totals.pendingTotal ?? 0);
  const earned = Number(totals.earnedTotal ?? 0);
  const paid = Number(totals.paidTotal ?? 0);
  const clawed = Number(totals.clawedBackTotal ?? 0);

  if (pending > 0) return "PENDING";
  if (earned > 0) return "EARNED";
  if (paid > 0) return "PAID";
  if (clawed > 0) return "CLAWED_BACK";
  if (!hasPaid) return "NOT_ACCRUED";
  return "NOT_ACCRUED";
}

/**
 * @param {ReturnType<typeof totalsFromStateGroups>} totals
 * @param {ReturnType<typeof commissionTransactionToDto>[]} commissions
 * @param {boolean} [hasPaid]
 */
export function commissionStatusToDto(totals, commissions, hasPaid = false) {
  const pending = Number(totals.pendingTotal ?? 0);
  const earned = Number(totals.earnedTotal ?? 0);
  const paid = Number(totals.paidTotal ?? 0);
  const clawed = Number(totals.clawedBackTotal ?? 0);
  const hasCommission =
    commissions.length > 0 || pending > 0 || earned > 0 || paid > 0 || clawed > 0;

  return {
    status: deriveCommissionDisplayStatus(totals, commissions, hasPaid),
    hasCommission,
    pendingTotal: totals.pendingTotal ?? "0",
    earnedTotal: totals.earnedTotal ?? "0",
    paidTotal: totals.paidTotal ?? "0",
    clawedBackTotal: totals.clawedBackTotal ?? "0",
    totalEarned: String(earned + paid),
  };
}

/**
 * @param {import('../generated/prisma/client').Referral} referral
 * @param {ReturnType<typeof totalsFromStateGroups>} totals
 * @param {import('../generated/prisma/client').Program} program
 * @param {{ email: string; name: string | null } | null} refereeProfile
 * @param {{ capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null } | undefined} paymentSummary
 * @param {ReturnType<typeof commissionTransactionToDto>[]} commissions
 */
export function refereeDashboardRowToDto(
  referral,
  totals,
  program,
  refereeProfile,
  paymentSummary,
  commissions
) {
  const payment = paymentStatusToDto(paymentSummary, program.currency);
  const commission = commissionStatusToDto(totals, commissions, payment.hasPaid);
  return {
    referralId: referral.id,
    refereeUserId: referral.refereeUserId,
    referee: refereeProfile
      ? { email: refereeProfile.email, name: refereeProfile.name }
      : null,
    status: referral.status,
    attributionSource: referral.attributionSource,
    signedUpAt: referral.createdAt.toISOString(),
    payment,
    refereeBenefit: refereeBenefitFromProgram(program),
    refereeCreditApplied: referral.refereeCreditApplied,
    refereeCreditAppliedAt: referral.refereeCreditAppliedAt
      ? referral.refereeCreditAppliedAt.toISOString()
      : null,
    commission,
    commissions,
  };
}

export function commissionTransactionToDto(row) {
  return {
    id: row.id,
    referralId: row.referralId,
    refereeUserId: row.referral.refereeUserId,
    state: row.state,
    commissionAmount: decimalToString(row.commissionAmount),
    grossAmount: decimalToString(row.grossAmount),
    netAmount: decimalToString(row.netAmount),
    rewardPct: decimalToString(row.rewardPct),
    currency: row.currency,
    sourcePaymentId: row.sourcePaymentId,
    sourceInvoiceId: row.sourceInvoiceId,
    reversesCommissionId: row.reversesCommissionId,
    accruedAt: row.accruedAt.toISOString(),
    payableAt: row.payableAt ? row.payableAt.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    clawbackReason: row.clawbackReason,
    createdAt: row.createdAt.toISOString(),
  };
}
