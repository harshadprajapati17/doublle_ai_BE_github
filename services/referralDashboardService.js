import { prisma } from "../data/prismaClient.js";
import * as commissionRepo from "../data/commissionRepo.js";
import * as programRepo from "../data/programRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { ValidationError, NoActiveReferralProgramError } from "../errors/index.js";
import {
  decodeReferralListCursor,
  encodeReferralListCursor,
} from "../utils/referralListCursor.js";
import {
  commissionTransactionToDto,
  refereeRowToDto,
  summaryToDto,
  totalsFromStateGroups,
} from "./referralDashboardSerializer.js";

async function requireActiveProgram() {
  const program = await programRepo.findFirstActive(prisma);
  if (!program) {
    throw new NoActiveReferralProgramError();
  }
  return program;
}

/**
 * @param {string} referrerUserId
 * @param {string} programId
 * @param {string} currency
 */
export async function getReferrerDashboardSummary(referrerUserId, programId, currency) {
  const [refereeCount, stateGroups] = await Promise.all([
    referralRepo.countByReferrerAndProgram(prisma, referrerUserId, programId),
    commissionRepo.groupAmountsByStateForReferrer(prisma, referrerUserId, programId),
  ]);
  const totals = totalsFromStateGroups(stateGroups);
  return summaryToDto(currency, totals, refereeCount);
}

/**
 * @param {string} referrerUserId
 * @param {{ limit: number; cursor?: string }} query
 */
export async function listReferrerReferees(referrerUserId, query) {
  const program = await requireActiveProgram();
  const limit = query.limit;

  /** @type {import('../generated/prisma/client').Prisma.ReferralWhereInput} */
  const where = { referrerUserId, programId: program.id };

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
  const referralIds = page.map((r) => r.id);

  const groups = await commissionRepo.groupAmountsByReferralAndState(prisma, referralIds);
  /** @type {Map<string, Array<{ state: string; _sum: { commissionAmount: unknown } | null }>>} */
  const byReferral = new Map();
  for (const g of groups) {
    const list = byReferral.get(g.referralId) ?? [];
    list.push(g);
    byReferral.set(g.referralId, list);
  }

  const data = page.map((referral) =>
    refereeRowToDto(
      referral,
      totalsFromStateGroups(byReferral.get(referral.id) ?? []),
      program.currency
    )
  );

  const nextCursor =
    hasMore && page.length > 0 ? encodeReferralListCursor(page[page.length - 1]) : null;

  return { data, meta: { nextCursor } };
}

/**
 * @param {string} referrerUserId
 * @param {{ limit: number; cursor?: string }} query
 */
export async function listReferrerTransactions(referrerUserId, query) {
  const program = await requireActiveProgram();
  const limit = query.limit;

  /** @type {import('../generated/prisma/client').Prisma.CommissionWhereInput} */
  const where = {};

  if (query.cursor) {
    let decoded;
    try {
      decoded = decodeReferralListCursor(query.cursor);
    } catch {
      throw new ValidationError("Invalid cursor.");
    }
    const { createdAt, id } = decoded;
    where.OR = [
      { accruedAt: { lt: createdAt } },
      { AND: [{ accruedAt: createdAt }, { id: { lt: id } }] },
    ];
  }

  const take = limit + 1;
  const rows = await commissionRepo.findManyForReferrerProgram(
    prisma,
    referrerUserId,
    program.id,
    {
      where,
      orderBy: [{ accruedAt: "desc" }, { id: "desc" }],
      take,
    }
  );

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length > 0
      ? encodeReferralListCursor({
          createdAt: page[page.length - 1].accruedAt,
          id: page[page.length - 1].id,
        })
      : null;

  return {
    data: page.map((row) => commissionTransactionToDto(row)),
    meta: { nextCursor },
  };
}
