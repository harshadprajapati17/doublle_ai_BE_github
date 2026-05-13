/**
 * @param {unknown} d
 * @returns {string | null}
 */
export function decimalToString(d) {
  if (d === null || d === undefined) return null;
  if (typeof d === "object" && d !== null && typeof d.toString === "function") {
    return d.toString();
  }
  return String(d);
}

/**
 * @param {import('@prisma/client').Program} row
 */
function programRowToJson(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    rewardPct: decimalToString(row.rewardPct),
    rewardDurationMonths: row.rewardDurationMonths,
    cookieDays: row.cookieDays,
    attributionRule: row.attributionRule,
    refereeBenefitType: row.refereeBenefitType,
    refereeBenefitValue: decimalToString(row.refereeBenefitValue),
    refereeBenefitTrialDays: row.refereeBenefitTrialDays,
    holdPeriodDays: row.holdPeriodDays,
    monthlyCap: decimalToString(row.monthlyCap),
    lifetimeCap: decimalToString(row.lifetimeCap),
    capBehavior: row.capBehavior,
    refereeMinSpendAmount: decimalToString(row.refereeMinSpendAmount),
    refereeMinSpendWindowDays: row.refereeMinSpendWindowDays,
    currency: row.currency,
    termsVersion: row.termsVersion,
    currentVersion: row.currentVersion,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByAdminId: row.createdByAdminId,
    disabledAt: row.disabledAt ? row.disabledAt.toISOString() : null,
  };
}

/**
 * @param {import('@prisma/client').Program & { versions?: import('@prisma/client').ProgramVersion[] }} row
 * @param {{ includeVersions?: boolean }} [opts]
 */
export function programToDto(row, { includeVersions } = {}) {
  const base = programRowToJson(row);
  if (includeVersions && row.versions) {
    base.versions = row.versions.map((v) => ({
      id: v.id,
      programId: v.programId,
      version: v.version,
      payload: v.payload,
      changedByAdminId: v.changedByAdminId,
      changeReason: v.changeReason,
      createdAt: v.createdAt.toISOString(),
    }));
  }
  return base;
}

/**
 * @param {import('@prisma/client').Program} row
 */
export function programSnapshotPayload(row) {
  return programRowToJson(row);
}
