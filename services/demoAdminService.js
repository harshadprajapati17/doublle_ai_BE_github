import { prisma } from "../data/prismaClient.js";
import * as demoAdminRepo from "../data/demoAdminRepo.js";
import { ConflictError, NotFoundError } from "../errors/index.js";

/**
 * @param {import('../generated/prisma/client').DemoAdmin} row
 */
function demoAdminToDto(row) {
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

export async function listDemoAdmins() {
  const rows = await demoAdminRepo.findMany(prisma);
  return { data: rows.map(demoAdminToDto) };
}

/**
 * @param {{ sub: string; email: string; name?: string }} body
 */
export async function createDemoAdmin(body) {
  try {
    const row = await demoAdminRepo.create(prisma, {
      sub: body.sub,
      email: body.email,
      ...(body.name !== undefined ? { name: body.name } : {}),
    });
    return { data: demoAdminToDto(row) };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError("A demo admin with this sub or email already exists.");
    }
    throw err;
  }
}

/**
 * @param {string} id
 */
export async function getDemoAdminById(id) {
  const row = await demoAdminRepo.findUnique(prisma, id);
  if (!row) {
    throw new NotFoundError("Demo admin not found.");
  }
  return { data: demoAdminToDto(row) };
}

/**
 * @param {string} id
 * @param {{ sub?: string; email?: string; name?: string | null; isEnabled?: boolean }} body
 */
export async function updateDemoAdmin(id, body) {
  const existing = await demoAdminRepo.findUnique(prisma, id);
  if (!existing) {
    throw new NotFoundError("Demo admin not found.");
  }

  /** @type {import('../generated/prisma/client').Prisma.DemoAdminUpdateInput} */
  const data = {};
  if (body.sub !== undefined) data.sub = body.sub;
  if (body.email !== undefined) data.email = body.email;
  if (body.name !== undefined) data.name = body.name;
  if (body.isEnabled !== undefined) data.isEnabled = body.isEnabled;

  try {
    const row = await demoAdminRepo.update(prisma, id, data);
    return { data: demoAdminToDto(row) };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      throw new ConflictError("A demo admin with this sub or email already exists.");
    }
    throw err;
  }
}

/**
 * @param {string} id
 */
export async function deleteDemoAdmin(id) {
  const existing = await demoAdminRepo.findUnique(prisma, id);
  if (!existing) {
    throw new NotFoundError("Demo admin not found.");
  }
  await demoAdminRepo.remove(prisma, id);
}
