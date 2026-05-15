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
 */
export async function findMany(client) {
  return client.demoUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 */
export async function findUnique(client, id) {
  return client.demoUser.findUnique({ where: { id } });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.DemoUserCreateInput} data
 */
export async function create(client, data) {
  return client.demoUser.create({ data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 * @param {import('../generated/prisma/client').Prisma.DemoUserUpdateInput} data
 */
export async function update(client, id, data) {
  return client.demoUser.update({ where: { id }, data });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} id
 */
export async function remove(client, id) {
  return client.demoUser.delete({ where: { id } });
}
