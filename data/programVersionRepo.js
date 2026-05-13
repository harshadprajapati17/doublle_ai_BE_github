/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {import('@prisma/client').Prisma.ProgramVersionCreateInput} data
 */
async function create(client, data) {
  return client.programVersion.create({ data });
}

module.exports = { create };
