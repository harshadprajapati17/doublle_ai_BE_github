import { decimalToString } from "./programSerializer.js";

/**
 * @param {import('../generated/prisma/client').Referral} row
 */
export function referralToAdminDto(row) {
  return {
    id: row.id,
    refereeUserId: row.refereeUserId,
    referrerUserId: row.referrerUserId,
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
 */
export function referralDetailToAdminDto(row) {
  return {
    referral: referralToAdminDto(row),
    program: {
      id: row.program.id,
      name: row.program.name,
      status: row.program.status,
    },
    commissions: row.commissions.map(commissionToAdminDto),
    fraudSignals: row.fraudSignals.map(fraudSignalToAdminDto),
  };
}
