import { prisma } from "../data/prismaClient.js";
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
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length > 0 ? encodeReferralListCursor(page[page.length - 1]) : null;

  return {
    data: page.map((row) => referralToAdminDto(row)),
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
  return { data: referralDetailToAdminDto(row) };
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

  return { data: referralToAdminDto(updated) };
}
