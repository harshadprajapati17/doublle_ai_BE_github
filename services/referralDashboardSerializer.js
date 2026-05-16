import { decimalToString } from "./programSerializer.js";

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
 * @param {string} currency
 */
export function refereeRowToDto(referral, totals, currency) {
  const earned = Number(totals.earnedTotal ?? 0);
  const paid = Number(totals.paidTotal ?? 0);
  return {
    referralId: referral.id,
    refereeUserId: referral.refereeUserId,
    status: referral.status,
    attributionSource: referral.attributionSource,
    attributedAt: referral.createdAt.toISOString(),
    refereeCreditApplied: referral.refereeCreditApplied,
    currency,
    commission: {
      pendingTotal: totals.pendingTotal ?? "0",
      earnedTotal: totals.earnedTotal ?? "0",
      paidTotal: totals.paidTotal ?? "0",
      clawedBackTotal: totals.clawedBackTotal ?? "0",
      totalEarned: String(earned + paid),
    },
  };
}

/**
 * @param {import('../generated/prisma/client').Commission & { referral: { refereeUserId: string } }} row
 */
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
