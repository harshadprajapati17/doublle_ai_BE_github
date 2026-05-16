/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} userId
 * @param {string} programId
 * @param {string} termsVersion
 */
export async function findForUserProgramTerms(client, userId, programId, termsVersion) {
  return client.referralTermsAcceptance.findUnique({
    where: {
      userId_programId_termsVersion: { userId, programId, termsVersion },
    },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {{ userId: string; programId: string; termsVersion: string; ip: string }} data
 */
export async function create(client, data) {
  return client.referralTermsAcceptance.create({ data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} userId
 * @param {string} programId
 */
export async function findIpsForUserProgram(client, userId, programId) {
  const rows = await client.referralTermsAcceptance.findMany({
    where: { userId, programId },
    select: { ip: true },
  });
  return rows.map((r) => r.ip).filter(Boolean);
}
