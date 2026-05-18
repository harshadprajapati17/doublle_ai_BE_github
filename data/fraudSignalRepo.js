/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.FraudSignalCreateInput} data
 */
export async function create(client, data) {
  return client.fraudSignal.create({ data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.FraudSignalFindManyArgs} args
 */
export async function findMany(client, args) {
  return client.fraudSignal.findMany(args);
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} referralId
 * @param {string} type
 */
export async function findByReferralAndType(client, referralId, type) {
  return client.fraudSignal.findFirst({
    where: { referralId, type },
    orderBy: { createdAt: "desc" },
  });
}
