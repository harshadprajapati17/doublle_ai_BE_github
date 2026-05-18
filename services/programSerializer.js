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
 * @param {import('../generated/prisma/client').Program} row
 */
function programRowToJson(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    referrerRewardPct: decimalToString(row.rewardPct),
    referrerRewardDurationMonths: row.rewardDurationMonths,
    cookieDays: row.cookieDays,
    attributionRule: row.attributionRule,
    refereeBenefitType: row.refereeBenefitType,
    refereeBenefitValue: decimalToString(row.refereeBenefitValue),
    refereeBenefitTrialDays: row.refereeBenefitTrialDays,
    holdPeriodDays: row.holdPeriodDays,
    monthlyCap: decimalToString(row.monthlyCap),
    lifetimeCap: decimalToString(row.lifetimeCap),
    capBehavior: row.capBehavior,
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
 * @param {import('../generated/prisma/client').Program & { versions?: import('../generated/prisma/client').ProgramVersion[] }} row
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
 * @param {import('../generated/prisma/client').Program} row
 */
export function programSnapshotPayload(row) {
  return programRowToJson(row);
}

/**
 * @param {import('../generated/prisma/client').Program} program
 */
export function refereeBenefitFromProgram(program) {
  const type = program.refereeBenefitType;
  if (type === "CREDIT") {
    return {
      type,
      value: decimalToString(program.refereeBenefitValue),
      currency: program.currency,
      trialDays: null,
    };
  }
  if (type === "TRIAL_EXTENSION") {
    return {
      type,
      value: null,
      currency: program.currency,
      trialDays: program.refereeBenefitTrialDays,
    };
  }
  return {
    type: "NONE",
    value: null,
    currency: program.currency,
    trialDays: null,
  };
}

/**
 * User-facing program snapshot (no admin-only fields).
 * @param {import('../generated/prisma/client').Program} row
 */
export function programToUserDto(row) {
  const { createdByAdminId: _admin, ...publicFields } = programRowToJson(row);
  return {
    ...publicFields,
    refereeBenefit: refereeBenefitFromProgram(row),
  };
}
