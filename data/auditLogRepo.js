/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.AdminAuditLogCreateInput} data
 */
export async function create(client, data) {
  return client.adminAuditLog.create({ data });
}
