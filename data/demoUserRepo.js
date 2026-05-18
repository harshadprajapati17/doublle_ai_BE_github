/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} normalizedEmail lowercased email
 */
export async function findFirstEnabledByEmail(client, normalizedEmail) {
  return client.demoUser.findFirst({
    where: { email: normalizedEmail, isEnabled: true },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string[]} subs
 */
export async function findManyBySubs(client, subs) {
  if (subs.length === 0) return [];
  return client.demoUser.findMany({
    where: { sub: { in: subs } },
    select: { sub: true, email: true, name: true },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.DemoUserCreateInput} data
 */
export async function create(client, data) {
  return client.demoUser.create({ data });
}
