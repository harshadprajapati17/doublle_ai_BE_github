/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} ownerUserId
 * @param {string} programId
 */
export async function findByOwnerAndProgram(client, ownerUserId, programId) {
  return client.referralCode.findUnique({
    where: {
      ownerUserId_programId: { ownerUserId, programId },
    },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} code Normalized referral code (e.g. uppercase).
 */
export async function findByCode(client, code) {
  return client.referralCode.findUnique({
    where: { code },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {{ ownerUserId: string; programId: string; code: string }} data
 */
export async function create(client, data) {
  return client.referralCode.create({ data });
}
