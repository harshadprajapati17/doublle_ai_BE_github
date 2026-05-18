import { prisma } from "../data/prismaClient.js";
import { getCapturedPaymentSummariesByUserIds } from "../data/billingRepos.js";
import * as commissionRepo from "../data/commissionRepo.js";
import * as demoUserRepo from "../data/demoUserRepo.js";
import * as programRepo from "../data/programRepo.js";
import * as referralCodeRepo from "../data/referralCodeRepo.js";
import * as referralRepo from "../data/referralRepo.js";
import { ValidationError, NoActiveReferralProgramError, NotFoundError } from "../errors/index.js";
import {
  decodeReferralListCursor,
  encodeReferralListCursor,
} from "../utils/referralListCursor.js";
import {
  commissionTransactionToDto,
  refereeDashboardRowToDto,
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

  const refereeUserIds = page.map((r) => r.refereeUserId);
  const [groups, paymentSummaries] = await Promise.all([
    commissionRepo.groupAmountsByReferralAndState(prisma, referralIds),
    getCapturedPaymentSummariesByUserIds(refereeUserIds),
  ]);
  /** @type {Map<string, Array<{ state: string; _sum: { commissionAmount: unknown } | null }>>} */
  const byReferral = new Map();
  for (const g of groups) {
    const list = byReferral.get(g.referralId) ?? [];
    list.push(g);
    byReferral.set(g.referralId, list);
  }

  const data = page.map((referral) => {
    const paymentSummary = paymentSummaries.get(referral.refereeUserId);
    const hasPaid = (paymentSummary?.capturedCount ?? 0) > 0;
    return refereeRowToDto(
      referral,
      totalsFromStateGroups(byReferral.get(referral.id) ?? []),
      program,
      hasPaid
    );
  });

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

/**
 * Referrer dashboard: code + summary + paginated referees with payment and commission detail.
 * @param {string} referrerUserId
 * @param {{ limit: number; cursor?: string }} query
 */
export async function getReferrerDashboard(referrerUserId, query) {
  const program = await requireActiveProgram();

  const codeRow = await referralCodeRepo.findByOwnerAndProgram(
    prisma,
    referrerUserId,
    program.id
  );
  if (!codeRow) {
    throw new NotFoundError(
      "No referral code yet. Accept the active referral program terms to obtain your code."
    );
  }

  const summary = await getReferrerDashboardSummary(
    referrerUserId,
    program.id,
    program.currency
  );

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
  const refereeUserIds = page.map((r) => r.refereeUserId);

  const [commissionGroups, allCommissions, paymentSummaries, demoUsers] = await Promise.all([
    commissionRepo.groupAmountsByReferralAndState(prisma, referralIds),
    commissionRepo.findManyByReferralIds(prisma, referralIds),
    getCapturedPaymentSummariesByUserIds(refereeUserIds),
    demoUserRepo.findManyBySubs(prisma, refereeUserIds),
  ]);

  /** @type {Map<string, Array<{ state: string; _sum: { commissionAmount: unknown } | null }>>} */
  const totalsByReferral = new Map();
  for (const g of commissionGroups) {
    const list = totalsByReferral.get(g.referralId) ?? [];
    list.push(g);
    totalsByReferral.set(g.referralId, list);
  }

  /** @type {Map<string, ReturnType<typeof commissionTransactionToDto>[]>} */
  const commissionsByReferral = new Map();
  for (const row of allCommissions) {
    const dto = commissionTransactionToDto(row);
    const list = commissionsByReferral.get(row.referralId) ?? [];
    list.push(dto);
    commissionsByReferral.set(row.referralId, list);
  }

  /** @type {Map<string, { email: string; name: string | null }>} */
  const profileBySub = new Map(
    demoUsers.map((u) => [u.sub, { email: u.email, name: u.name }])
  );

  const referees = page.map((referral) =>
    refereeDashboardRowToDto(
      referral,
      totalsFromStateGroups(totalsByReferral.get(referral.id) ?? []),
      program,
      profileBySub.get(referral.refereeUserId) ?? null,
      paymentSummaries.get(referral.refereeUserId),
      commissionsByReferral.get(referral.id) ?? []
    )
  );

  const nextCursor =
    hasMore && page.length > 0 ? encodeReferralListCursor(page[page.length - 1]) : null;

  return {
    data: {
      programId: program.id,
      termsVersion: program.termsVersion,
      code: codeRow.code,
      createdAt: codeRow.createdAt.toISOString(),
      summary,
      referees,
    },
    meta: { nextCursor },
  };
}
