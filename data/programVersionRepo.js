/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient | import('../generated/prisma/client').PrismaClient} client
 * @param {import('../generated/prisma/client').Prisma.ProgramVersionCreateInput} data
 */
export async function create(client, data) {
  return client.programVersion.create({ data });
}
