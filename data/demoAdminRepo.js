/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {string} normalizedEmail lowercased email
 */
export async function findFirstEnabledByEmail(client, normalizedEmail) {
  return client.demoAdmin.findFirst({
    where: { email: normalizedEmail, isEnabled: true },
  });
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.DemoAdminCreateInput} data
 */
export async function create(client, data) {
  return client.demoAdmin.create({ data });
}
