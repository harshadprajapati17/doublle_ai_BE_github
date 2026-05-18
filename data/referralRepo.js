/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} refereeUserId
 * @param {string} programId
 */
export async function findByRefereeAndProgram(client, refereeUserId, programId) {
  return client.referral.findUnique({
    where: {
      refereeUserId_programId: { refereeUserId, programId },
    },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 */
export async function findUnique(client, id) {
  return client.referral.findUnique({ where: { id } });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.ReferralFindFirstArgs} args
 */
export async function findFirst(client, args) {
  return client.referral.findFirst(args);
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 */
export async function findUniqueWithDetails(client, id) {
  return client.referral.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, name: true, status: true } },
      commissions: { orderBy: { accruedAt: "desc" } },
      fraudSignals: { orderBy: { createdAt: "desc" } },
    },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.ReferralCreateInput} data
 */
export async function create(client, data) {
  return client.referral.create({ data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 * @param {import('../generated/prisma/client').Prisma.ReferralUpdateInput} data
 */
export async function update(client, id, data) {
  return client.referral.update({ where: { id }, data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.ReferralFindManyArgs} args
 */
export async function findMany(client, args) {
  return client.referral.findMany(args);
}

/**
 * Active referral for a referee that has not yet received first-payment credit.
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} refereeUserId
 */
export async function findActivePendingCreditByReferee(client, refereeUserId) {
  return client.referral.findFirst({
    where: {
      refereeUserId,
      status: "ACTIVE",
      refereeCreditApplied: false,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * ACTIVE referral for a referee (commission accrual). Skips TERMINATED / FRAUD_REJECTED.
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} refereeUserId
 */
export async function findCommissionableByReferee(client, refereeUserId) {
  return client.referral.findFirst({
    where: {
      refereeUserId,
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} referrerUserId
 * @param {string} programId
 */
export async function countByReferrerAndProgram(client, referrerUserId, programId) {
  return client.referral.count({
    where: { referrerUserId, programId },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} referrerUserId
 * @param {string} programId
 * @param {Date} since
 */
export async function countByReferrerSince(client, referrerUserId, programId, since) {
  return client.referral.count({
    where: {
      referrerUserId,
      programId,
      createdAt: { gte: since },
    },
  });
}
