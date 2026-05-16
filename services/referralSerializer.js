/**
 * @param {import('../generated/prisma/client').Referral} row
 */
export function referralToDto(row) {
  return {
    id: row.id,
    refereeUserId: row.refereeUserId,
    referrerUserId: row.referrerUserId,
    programId: row.programId,
    code: row.code,
    status: row.status,
    attributionSource: row.attributionSource,
    programVersionAtAttribution: row.programVersionAtAttribution,
    refereeCreditApplied: row.refereeCreditApplied,
    createdAt: row.createdAt.toISOString(),
  };
}
