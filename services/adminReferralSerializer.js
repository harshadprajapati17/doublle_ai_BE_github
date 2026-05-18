import { decimalToString } from "./programSerializer.js";
import { paymentStatusToDto } from "./referralDashboardSerializer.js";

/**
 * @typedef {{ email: string; name: string | null } | null} AdminUserProfile
 * @typedef {{ capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null } | undefined} CapturedPaymentSummary
 */

/**
 * @param {CapturedPaymentSummary} paymentSummary
 * @param {string} programCurrency
 */
export function refereePaymentToAdminDto(paymentSummary, programCurrency) {
  return paymentStatusToDto(paymentSummary, programCurrency);
}

/**
 * @param {string} userId
 * @param {AdminUserProfile} profile
 */
export function userProfileToAdminDto(userId, profile) {
  return {
    userId,
    email: profile?.email ?? null,
    name: profile?.name ?? null,
  };
}

/**
 * @param {import('../generated/prisma/client').Referral} row
 * @param {{
 *   referrer?: AdminUserProfile;
 *   referee?: AdminUserProfile;
 *   paymentSummary?: CapturedPaymentSummary;
 *   programCurrency?: string;
 * }} [enrichment]
 */
export function referralToAdminDto(row, enrichment) {
  return {
    id: row.id,
    refereeUserId: row.refereeUserId,
    referrerUserId: row.referrerUserId,
    referrer: userProfileToAdminDto(row.referrerUserId, enrichment?.referrer ?? null),
    referee: userProfileToAdminDto(row.refereeUserId, enrichment?.referee ?? null),
    payment: refereePaymentToAdminDto(
      enrichment?.paymentSummary,
      enrichment?.programCurrency ?? ""
    ),
    programId: row.programId,
    code: row.code,
    status: row.status,
    attributionSource: row.attributionSource,
    programVersionAtAttribution: row.programVersionAtAttribution,
    cookieData: row.cookieData ?? null,
    ip: row.ip,
    userAgent: row.userAgent,
    terminatedAt: row.terminatedAt ? row.terminatedAt.toISOString() : null,
    terminationReason: row.terminationReason,
    refereeCreditApplied: row.refereeCreditApplied,
    refereeCreditAppliedAt: row.refereeCreditAppliedAt
      ? row.refereeCreditAppliedAt.toISOString()
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * @param {import('../generated/prisma/client').Commission} row
 */
export function commissionToAdminDto(row) {
  return {
    id: row.id,
    referralId: row.referralId,
    sourcePaymentId: row.sourcePaymentId,
    sourceInvoiceId: row.sourceInvoiceId,
    grossAmount: decimalToString(row.grossAmount),
    netAmount: decimalToString(row.netAmount),
    rewardPct: decimalToString(row.rewardPct),
    commissionAmount: decimalToString(row.commissionAmount),
    currency: row.currency,
    state: row.state,
    accruedAt: row.accruedAt.toISOString(),
    payableAt: row.payableAt ? row.payableAt.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    clawbackReason: row.clawbackReason,
    reversesCommissionId: row.reversesCommissionId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * @param {import('../generated/prisma/client').FraudSignal} row
 */
export function fraudSignalToAdminDto(row) {
  return {
    id: row.id,
    referralId: row.referralId,
    type: row.type,
    score: decimalToString(row.score),
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * @param {import('../generated/prisma/client').Referral & {
 *   program: { id: string; name: string; status: string };
 *   commissions: import('../generated/prisma/client').Commission[];
 *   fraudSignals: import('../generated/prisma/client').FraudSignal[];
 * }} row
 * @param {{
 *   referrer?: AdminUserProfile;
 *   referee?: AdminUserProfile;
 *   paymentSummary?: CapturedPaymentSummary;
 *   programCurrency?: string;
 * }} [enrichment]
 */
export function referralDetailToAdminDto(row, enrichment) {
  return {
    referral: referralToAdminDto(row, {
      ...enrichment,
      programCurrency: enrichment?.programCurrency ?? row.program.currency,
    }),
    program: {
      id: row.program.id,
      name: row.program.name,
      status: row.program.status,
    },
    commissions: row.commissions.map(commissionToAdminDto),
    fraudSignals: row.fraudSignals.map(fraudSignalToAdminDto),
  };
}
