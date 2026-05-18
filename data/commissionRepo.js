/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 */
export async function findUnique(client, id) {
  return client.commission.findUnique({ where: { id } });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} sourcePaymentId
 */
export async function findBySourcePaymentId(client, sourcePaymentId) {
  return client.commission.findUnique({ where: { sourcePaymentId } });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.CommissionCreateInput} data
 */
export async function create(client, data) {
  return client.commission.create({ data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 * @param {import('../generated/prisma/client').Prisma.CommissionUpdateInput} data
 */
export async function update(client, id, data) {
  return client.commission.update({ where: { id }, data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.CommissionFindManyArgs} args
 */
export async function findMany(client, args) {
  return client.commission.findMany(args);
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} reversesCommissionId
 */
export async function findReversalForCommission(client, reversesCommissionId) {
  return client.commission.findFirst({
    where: { reversesCommissionId },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.CommissionUpdateManyArgs} args
 */
export async function updateMany(client, args) {
  return client.commission.updateMany(args);
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} referrerUserId
 * @param {string} programId
 */
export async function groupAmountsByStateForReferrer(client, referrerUserId, programId) {
  return client.commission.groupBy({
    by: ["state"],
    where: {
      referral: { referrerUserId, programId },
    },
    _sum: { commissionAmount: true },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string[]} referralIds
 */
export async function groupAmountsByReferralAndState(client, referralIds) {
  if (referralIds.length === 0) return [];
  return client.commission.groupBy({
    by: ["referralId", "state"],
    where: { referralId: { in: referralIds } },
    _sum: { commissionAmount: true },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} referrerUserId
 * @param {string} programId
 * @param {import('../generated/prisma/client').Prisma.CommissionFindManyArgs} args
 */
export async function findManyForReferrerProgram(client, referrerUserId, programId, args) {
  return client.commission.findMany({
    ...args,
    where: {
      ...args.where,
      referral: { referrerUserId, programId },
    },
    include: {
      referral: { select: { refereeUserId: true } },
    },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string[]} referralIds
 */
export async function findManyByReferralIds(client, referralIds) {
  if (referralIds.length === 0) return [];
  return client.commission.findMany({
    where: { referralId: { in: referralIds } },
    orderBy: [{ accruedAt: "desc" }, { id: "desc" }],
    include: {
      referral: { select: { refereeUserId: true } },
    },
  });
}
