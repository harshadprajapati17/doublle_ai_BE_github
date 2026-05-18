import { prisma, Decimal } from "../data/prismaClient.js";
import * as fraudSignalRepo from "../data/fraudSignalRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import * as referralTermsAcceptanceRepo from "../data/referralTermsAcceptanceRepo.js";
import { ipsOverlap } from "../utils/ipNetwork.js";
import { logStructured } from "../utils/structuredLog.js";

const SCOPE = "referral.fraud_signal";

const SIGNAL = {
  IP_OVERLAP: "IP_OVERLAP",
  REFERRER_VELOCITY_24H: "REFERRER_VELOCITY_24H",
  HIGH_VALUE_COMMISSION: "HIGH_VALUE_COMMISSION",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function velocityThreshold24h() {
  const raw = process.env.REFERRAL_FRAUD_VELOCITY_24H;
  const n = raw != null ? Number(raw) : 10;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

function highCommissionThresholdMajor() {
  const raw = process.env.REFERRAL_FRAUD_HIGH_COMMISSION_MAJOR;
  const n = raw != null ? Number(raw) : 1000;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | typeof prisma} client
 * @param {{ referralId: string; type: string; score: number; payload: Record<string, unknown> }} input
 */
async function recordSignalIfNew(client, input) {
  const existing = await fraudSignalRepo.findByReferralAndType(
    client,
    input.referralId,
    input.type
  );
  if (existing) {
    return { created: false, signal: existing };
  }

  const signal = await fraudSignalRepo.create(client, {
    referral: { connect: { id: input.referralId } },
    type: input.type,
    score: new Decimal(String(input.score)),
    payload: input.payload,
  });

  logStructured("info", {
    scope: SCOPE,
    phase: "recorded",
    referralId: input.referralId,
    type: input.type,
    score: input.score,
  });

  return { created: true, signal };
}

/**
 * Flag-only checks at attribution (does not change referral status).
 *
 * @param {{
 *   referralId: string;
 *   referrerUserId: string;
 *   programId: string;
 *   refereeIp?: string | null;
 * }} input
 */
export async function evaluateFraudSignalsOnAttribution(input) {
  const recorded = [];

  if (input.refereeIp) {
    const referrerIps = await referralTermsAcceptanceRepo.findIpsForUserProgram(
      prisma,
      input.referrerUserId,
      input.programId
    );
    for (const referrerIp of referrerIps) {
      const overlap = ipsOverlap(input.refereeIp, referrerIp);
      if (!overlap.overlap) continue;

      const result = await recordSignalIfNew(prisma, {
        referralId: input.referralId,
        type: SIGNAL.IP_OVERLAP,
        score: overlap.exact ? 0.85 : 0.55,
        payload: {
          refereeIp: input.refereeIp,
          referrerIp,
          exact: overlap.exact,
          prefix24: overlap.prefix24,
        },
      });
      recorded.push(result);
      break;
    }
  }

  const since = new Date(Date.now() - MS_PER_DAY);
  const count24h = await referralRepo.countByReferrerSince(
    prisma,
    input.referrerUserId,
    input.programId,
    since
  );
  const threshold = velocityThreshold24h();
  if (count24h > threshold) {
    const result = await recordSignalIfNew(prisma, {
      referralId: input.referralId,
      type: SIGNAL.REFERRER_VELOCITY_24H,
      score: Math.min(0.95, 0.4 + count24h / (threshold * 2)),
      payload: {
        count24h,
        threshold,
        windowHours: 24,
      },
    });
    recorded.push(result);
  }

  return { recorded };
}

/**
 * Flag high-value commission accruals for admin review (does not block accrual).
 *
 * @param {{ referralId: string; commissionAmount: import('../generated/prisma/client').Decimal | { toString(): string }; currency: string }} input
 */
export async function evaluateFraudSignalsOnPayment(input) {
  const amountMajor = Number(String(input.commissionAmount));
  const threshold = highCommissionThresholdMajor();
  if (!Number.isFinite(amountMajor) || amountMajor < threshold) {
    return { recorded: [] };
  }

  const result = await recordSignalIfNew(prisma, {
    referralId: input.referralId,
    type: SIGNAL.HIGH_VALUE_COMMISSION,
    score: Math.min(0.99, amountMajor / (threshold * 2)),
    payload: {
      commissionAmount: String(input.commissionAmount),
      currency: input.currency,
      thresholdMajor: threshold,
    },
  });

  return { recorded: [result] };
}
