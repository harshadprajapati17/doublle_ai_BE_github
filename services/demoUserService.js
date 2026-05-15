import { prisma } from "../data/prismaClient.js";
import * as demoUserRepo from "../data/demoUserRepo.js";
import { ConflictError, NotFoundError } from "../errors/index.js";

/**
 * @param {import('../generated/prisma/client').DemoUser} row
 */
function demoUserToDto(row) {
  return {
    id: row.id,
    sub: row.sub,
    email: row.email,
    name: row.name,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isPrismaUniqueViolation(err) {
  return err && typeof err === "object" && "code" in err && err.code === "P2002";
}

export async function listDemoUsers() {
  const rows = await demoUserRepo.findMany(prisma);
  return { data: rows.map(demoUserToDto) };
}

/**
 * @param {{ sub: string; email: string; name?: string }} body
 */
export async function createDemoUser(body) {
  try {
    const row = await demoUserRepo.create(prisma, {
      sub: body.sub,
      email: body.email,
      ...(body.name !== undefined ? { name: body.name } : {}),
    });
    return { data: demoUserToDto(row) };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError("A demo user with this sub or email already exists.");
    }
    throw err;
  }
}

/**
 * @param {string} id
 */
export async function getDemoUserById(id) {
  const row = await demoUserRepo.findUnique(prisma, id);
  if (!row) {
    throw new NotFoundError("Demo user not found.");
  }
  return { data: demoUserToDto(row) };
}

/**
 * @param {string} id
 * @param {{ sub?: string; email?: string; name?: string | null; isEnabled?: boolean }} body
 */
export async function updateDemoUser(id, body) {
  const existing = await demoUserRepo.findUnique(prisma, id);
  if (!existing) {
    throw new NotFoundError("Demo user not found.");
  }

  /** @type {import('../generated/prisma/client').Prisma.DemoUserUpdateInput} */
  const data = {};
  if (body.sub !== undefined) data.sub = body.sub;
  if (body.email !== undefined) data.email = body.email;
  if (body.name !== undefined) data.name = body.name;
  if (body.isEnabled !== undefined) data.isEnabled = body.isEnabled;

  try {
    const row = await demoUserRepo.update(prisma, id, data);
    return { data: demoUserToDto(row) };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError("A demo user with this sub or email already exists.");
    }
    throw err;
  }
}

/**
 * @param {string} id
 */
export async function deleteDemoUser(id) {
  const existing = await demoUserRepo.findUnique(prisma, id);
  if (!existing) {
    throw new NotFoundError("Demo user not found.");
  }
  await demoUserRepo.remove(prisma, id);
}
