/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {import('@prisma/client').Prisma.ProgramCreateInput} data
 */
export async function create(client, data) {
  return client.program.create({ data });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {string} id
 * @param {import('@prisma/client').Prisma.ProgramInclude | undefined} include
 */
export async function findUnique(client, id, include) {
  return client.program.findUnique({ where: { id }, include });
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {import('@prisma/client').Prisma.ProgramFindManyArgs} args
 */
export async function findMany(client, args) {
  return client.program.findMany(args);
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient | import('@prisma/client').PrismaClient} client
 * @param {string} id
 * @param {import('@prisma/client').Prisma.ProgramUpdateInput} data
 */
export async function update(client, id, data) {
  return client.program.update({ where: { id }, data });
}
