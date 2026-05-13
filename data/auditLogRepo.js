/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {import('@prisma/client').Prisma.AdminAuditLogCreateInput} data
 */
async function create(client, data) {
  return client.adminAuditLog.create({ data });
}

module.exports = { create };
