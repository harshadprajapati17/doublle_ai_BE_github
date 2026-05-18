import { prisma } from "../data/prismaClient.js";
import * as programRepo from "../data/programRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { refereeBenefitFromProgram } from "./programSerializer.js";

/**
 * Referee-facing benefit snapshot for billing / account UI.
 * @param {string} refereeUserId
 */
export async function getRefereeBenefitStatusForUser(refereeUserId) {
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    return { status: "NO_ACTIVE_PROGRAM" };
  }

  const benefit = refereeBenefitFromProgram(program);
  const referral = await referralRepo.findByRefereeAndProgram(
    prisma,
    refereeUserId,
    program.id
  );

  if (!referral) {
    return {
      status: "NOT_REFERRED",
      programId: program.id,
      benefit,
      applied: false,
      appliedAt: null,
      code: null,
      referralId: null,
    };
  }

  const base = {
    programId: program.id,
    referralId: referral.id,
    code: referral.code,
    benefit,
    referralStatus: referral.status,
  };

  if (referral.status !== "ACTIVE") {
    return {
      ...base,
      status: "INACTIVE_REFERRAL",
      applied: false,
      appliedAt: null,
    };
  }

  if (referral.refereeCreditApplied) {
    return {
      ...base,
      status: "APPLIED",
      applied: true,
      appliedAt: referral.refereeCreditAppliedAt
        ? referral.refereeCreditAppliedAt.toISOString()
        : null,
    };
  }

  return {
    ...base,
    status: "PENDING",
    applied: false,
    appliedAt: null,
  };
}
