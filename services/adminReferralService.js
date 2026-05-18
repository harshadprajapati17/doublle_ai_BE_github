import { getCapturedPaymentSummariesByUserIds } from "../data/billingRepos.js";
import { prisma } from "../data/prismaClient.js";
import * as demoUserRepo from "../data/demoUserRepo.js";
import * as programRepo from "../data/programRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { writeAuditLog } from "./auditService.js";
import { ValidationError, NotFoundError } from "../errors/index.js";
import {
  decodeReferralListCursor,
  encodeReferralListCursor,
} from "../utils/referralListCursor.js";
import {
  referralDetailToAdminDto,
  referralToAdminDto,
} from "./adminReferralSerializer.js";

/**
 * @param {string[]} subs
 * @returns {Promise<Map<string, { email: string; name: string | null }>>}
 */
async function loadDemoProfilesBySubs(subs) {
  const unique = [...new Set(subs)];
  if (unique.length === 0) {
    return new Map();
  }
  const rows = await demoUserRepo.findManyBySubs(prisma, unique);
  return new Map(rows.map((u) => [u.sub, { email: u.email, name: u.name }]));
}

/**
 * @param {{ referrerUserId: string; refereeUserId: string }} referral
 * @param {Map<string, { email: string; name: string | null }>} profileBySub
 */
function profilesForReferral(referral, profileBySub) {
  return {
    referrer: profileBySub.get(referral.referrerUserId) ?? null,
    referee: profileBySub.get(referral.refereeUserId) ?? null,
  };
}

/**
 * @param {import('../generated/prisma/client').Referral} referral
 * @param {Map<string, { email: string; name: string | null }>} profileBySub
 * @param {Map<string, { capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null }>} paymentByUserId
 * @param {string} programCurrency
 */
function enrichmentForReferral(referral, profileBySub, paymentByUserId, programCurrency) {
  return {
    ...profilesForReferral(referral, profileBySub),
    paymentSummary: paymentByUserId.get(referral.refereeUserId),
    programCurrency,
  };
}

/**
 * @param {{ limit: number; cursor?: string; referrerUserId?: string; refereeUserId?: string; code?: string; status?: string; programId?: string; createdFrom?: string; createdTo?: string }} query
 */
export async function listAdminReferrals(query) {
  const limit = query.limit;

  /** @type {import('../generated/prisma/client').Prisma.ReferralWhereInput} */
  const where = {};

  if (query.referrerUserId) where.referrerUserId = query.referrerUserId;
  if (query.refereeUserId) where.refereeUserId = query.refereeUserId;
  if (query.status) where.status = query.status;
  if (query.programId) where.programId = query.programId;
  if (query.code) {
    where.code = query.code.trim().toUpperCase();
  }
  if (query.createdFrom || query.createdTo) {
    where.createdAt = {};
    if (query.createdFrom) where.createdAt.gte = new Date(query.createdFrom);
    if (query.createdTo) where.createdAt.lte = new Date(query.createdTo);
  }

  if (query.cursor) {
    let decoded;
    try {
      decoded = decodeReferralListCursor(query.cursor);
    } catch {
      throw new ValidationError("Invalid cursor.");
    }
    const { createdAt, id } = decoded;
    where.OR = [
      { createdAt: { lt: createdAt } },
      { AND: [{ createdAt }, { id: { lt: id } }] },
    ];
  }

  const take = limit + 1;
  const rows = await referralRepo.findMany(prisma, {
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    include: { program: { select: { currency: true } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length > 0 ? encodeReferralListCursor(page[page.length - 1]) : null;

  const refereeUserIds = page.map((row) => row.refereeUserId);
  const [profileBySub, paymentByUserId] = await Promise.all([
    loadDemoProfilesBySubs(page.flatMap((row) => [row.referrerUserId, row.refereeUserId])),
    getCapturedPaymentSummariesByUserIds(refereeUserIds),
  ]);

  return {
    data: page.map((row) =>
      referralToAdminDto(
        row,
        enrichmentForReferral(row, profileBySub, paymentByUserId, row.program.currency)
      )
    ),
    meta: { nextCursor },
  };
}

/**
 * @param {string} id
 */
export async function getAdminReferralById(id) {
  const row = await referralRepo.findUniqueWithDetails(prisma, id);
  if (!row) {
    throw new NotFoundError("Referral not found.");
  }
  const [profileBySub, paymentByUserId] = await Promise.all([
    loadDemoProfilesBySubs([row.referrerUserId, row.refereeUserId]),
    getCapturedPaymentSummariesByUserIds([row.refereeUserId]),
  ]);
  return {
    data: referralDetailToAdminDto(
      row,
      enrichmentForReferral(row, profileBySub, paymentByUserId, row.program.currency)
    ),
  };
}

/**
 * @param {string} actorId
 * @param {string} id
 * @param {{ decision: 'APPROVE' | 'REJECT' | 'TERMINATE'; note: string }} body
 */
export async function applyReferralDecision(actorId, id, body) {
  const existing = await referralRepo.findUnique(prisma, id);
  if (!existing) {
    throw new NotFoundError("Referral not found.");
  }

  const priorStatus = existing.status;
  const now = new Date();

  /** @type {import('../generated/prisma/client').Prisma.ReferralUpdateInput} */
  let patch;
  if (body.decision === "APPROVE") {
    patch = {
      status: "ACTIVE",
      terminatedAt: null,
      terminationReason: null,
    };
  } else if (body.decision === "REJECT") {
    patch = {
      status: "FRAUD_REJECTED",
      terminatedAt: now,
      terminationReason: body.note,
    };
  } else {
    patch = {
      status: "TERMINATED",
      terminatedAt: now,
      terminationReason: body.note,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await referralRepo.update(tx, id, patch);
    await writeAuditLog(tx, {
      actorId,
      action: "referral.decision",
      targetType: "referral",
      targetId: id,
      payload: {
        decision: body.decision,
        note: body.note,
        priorStatus,
        newStatus: row.status,
      },
    });
    return row;
  });

  const [profileBySub, paymentByUserId, program] = await Promise.all([
    loadDemoProfilesBySubs([updated.referrerUserId, updated.refereeUserId]),
    getCapturedPaymentSummariesByUserIds([updated.refereeUserId]),
    programRepo.findUnique(prisma, updated.programId, undefined),
  ]);
  const programCurrency = program?.currency ?? "";
  return {
    data: referralToAdminDto(
      updated,
      enrichmentForReferral(updated, profileBySub, paymentByUserId, programCurrency)
    ),
  };
}
