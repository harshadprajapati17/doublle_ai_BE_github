import { prisma, Decimal } from "../data/prismaClient.js";
import * as programRepo from "../data/programRepo.js";
import * as programVersionRepo from "../data/programVersionRepo.js";
import { writeAuditLog } from "./auditService.js";
import { programSnapshotPayload, programToDto } from "./programSerializer.js";
import { encodeProgramListCursor, decodeProgramListCursor } from "../utils/programCursor.js";
import { ValidationError, NotFoundError, ConflictError } from "../errors/index.js";

/**
 * @param {Record<string, unknown>} body
 * @param {string} actorId
 */
function toCreateData(body, actorId) {
  return {
    name: body.name,
    status: "DRAFT",
    rewardPct: new Decimal(String(body.referrerRewardPct)),
    rewardDurationMonths: body.referrerRewardDurationMonths,
    cookieDays: body.cookieDays,
    attributionRule: body.attributionRule,
    refereeBenefitType: "NONE",
    refereeBenefitValue:
      body.refereeBenefitValue == null ? null : new Decimal(String(body.refereeBenefitValue)),
    refereeBenefitTrialDays: null,
    holdPeriodDays: body.holdPeriodDays,
    monthlyCap: body.monthlyCap == null ? null : new Decimal(String(body.monthlyCap)),
    lifetimeCap: body.lifetimeCap == null ? null : new Decimal(String(body.lifetimeCap)),
    capBehavior: body.capBehavior,
    currency: body.currency,
    termsVersion: body.termsVersion,
    createdByAdminId: actorId,
  };
}

/**
 * @param {Record<string, unknown>} body
 */
function toUpdateData(body) {
  /** @type {Record<string, unknown>} */
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.referrerRewardPct !== undefined) {
    data.rewardPct = new Decimal(String(body.referrerRewardPct));
  }
  if (body.referrerRewardDurationMonths !== undefined) {
    data.rewardDurationMonths = body.referrerRewardDurationMonths;
  }
  if (body.cookieDays !== undefined) data.cookieDays = body.cookieDays;
  if (body.attributionRule !== undefined) data.attributionRule = body.attributionRule;
  if (body.refereeBenefitValue !== undefined) {
    data.refereeBenefitValue =
      body.refereeBenefitValue == null ? null : new Decimal(String(body.refereeBenefitValue));
  }
  if (body.holdPeriodDays !== undefined) data.holdPeriodDays = body.holdPeriodDays;
  if (body.monthlyCap !== undefined) {
    data.monthlyCap = body.monthlyCap == null ? null : new Decimal(String(body.monthlyCap));
  }
  if (body.lifetimeCap !== undefined) {
    data.lifetimeCap = body.lifetimeCap == null ? null : new Decimal(String(body.lifetimeCap));
  }
  if (body.capBehavior !== undefined) data.capBehavior = body.capBehavior;
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.termsVersion !== undefined) data.termsVersion = body.termsVersion;
  return data;
}

/**
 * @param {import('../generated/prisma/client').Prisma.TransactionClient} tx
 * @param {string} programId
 * @param {import('../generated/prisma/client').Prisma.ProgramUpdateInput} patch
 * @param {string} actorId
 * @param {string | null} changeReason
 * @param {string} auditAction
 * @param {Record<string, unknown>} [auditExtra]
 */
async function bumpProgramVersion(tx, programId, patch, actorId, changeReason, auditAction, auditExtra) {
  const before = await programRepo.findUnique(tx, programId, undefined);
  if (!before) throw new NotFoundError("Program not found.");

  const nextVersion = before.currentVersion + 1;
  const updated = await programRepo.update(tx, programId, {
    ...patch,
    currentVersion: nextVersion,
  });

  await programVersionRepo.create(tx, {
    programId: updated.id,
    version: nextVersion,
    payload: programSnapshotPayload(updated),
    changedByAdminId: actorId,
    changeReason,
  });

  await writeAuditLog(tx, {
    actorId,
    action: auditAction,
    targetType: "program",
    targetId: updated.id,
    payload: { ...(auditExtra || {}), version: nextVersion },
  });

  return updated;
}

export async function createProgram(actorId, body) {
  const data = toCreateData(body, actorId);
  const created = await prisma.$transaction(async (tx) => {
    const prog = await programRepo.create(tx, {
      ...data,
      currentVersion: 1,
    });
    await programVersionRepo.create(tx, {
      programId: prog.id,
      version: 1,
      payload: programSnapshotPayload(prog),
      changedByAdminId: actorId,
      changeReason: "initial",
    });
    await writeAuditLog(tx, {
      actorId,
      action: "program.created",
      targetType: "program",
      targetId: prog.id,
      payload: { version: 1 },
    });
    return prog;
  });
  return programToDto(created);
}

/**
 * @param {object} query
 */
export async function listPrograms(query) {
  const limit = query.limit;
  const where = /** @type {import('../generated/prisma/client').Prisma.ProgramWhereInput} */ ({});

  if (query.status) {
    where.status = query.status;
  }
  if (query.q) {
    where.name = { contains: query.q, mode: "insensitive" };
  }

  if (query.cursor) {
    let decoded;
    try {
      decoded = decodeProgramListCursor(query.cursor);
    } catch {
      throw new ValidationError("Invalid cursor.");
    }
    const { createdAt, id } = decoded;
    where.OR = [
      { createdAt: { lt: createdAt } },
      {
        AND: [{ createdAt }, { id: { lt: id } }],
      },
    ];
  }

  const take = limit + 1;
  const rows = await programRepo.findMany(prisma, {
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && page.length > 0 ? encodeProgramListCursor(page[page.length - 1]) : null;

  return {
    data: page.map((r) => programToDto(r)),
    meta: { nextCursor },
  };
}

/**
 * @param {string} id
 * @param {{ include?: 'versions' }} query
 */
export async function getProgramById(id, query) {
  const row = await programRepo.findUnique(
    prisma,
    id,
    query.include === "versions" ? { versions: { orderBy: { version: "desc" } } } : undefined
  );
  if (!row) {
    throw new NotFoundError("Program not found.");
  }
  return { data: programToDto(row, { includeVersions: query.include === "versions" }) };
}

export async function updateProgram(actorId, id, body) {
  const patch = toUpdateData(body);
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await programRepo.findUnique(tx, id, undefined);
    if (!existing) throw new NotFoundError("Program not found.");
    return bumpProgramVersion(
      tx,
      id,
      patch,
      actorId,
      "update",
      "program.updated",
      { fields: Object.keys(patch) }
    );
  });
  return { data: programToDto(updated) };
}

/**
 * @param {string} actorId
 * @param {string} id
 * @param {{ force: boolean }} query
 */
export async function activateProgram(actorId, id, query) {
  const result = await prisma.$transaction(async (tx) => {
    const self = await programRepo.findUnique(tx, id, undefined);
    if (!self) throw new NotFoundError("Program not found.");
    if (self.status === "ACTIVE") {
      return { noOp: true, program: self };
    }

    const others = await programRepo.findMany(tx, {
      where: { status: "ACTIVE", id: { not: id } },
    });
    if (others.length > 0 && !query.force) {
      throw new ConflictError("Another program is already ACTIVE.", {
        activeProgramIds: others.map((p) => p.id),
      });
    }

    if (others.length > 0 && query.force) {
      for (const other of others) {
        await bumpProgramVersion(
          tx,
          other.id,
          { status: "DISABLED", disabledAt: new Date() },
          actorId,
          "superseded_by_activation",
          "program.disabled",
          { reason: "force_activate_other" }
        );
      }
    }

    const activated = await bumpProgramVersion(
      tx,
      id,
      { status: "ACTIVE", disabledAt: null },
      actorId,
      "activate",
      "program.activated",
      {}
    );
    return { noOp: false, program: activated };
  });

  return { data: programToDto(result.program), meta: result.noOp ? { noOp: true } : undefined };
}

export async function disableProgram(actorId, id) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await programRepo.findUnique(tx, id, undefined);
    if (!existing) throw new NotFoundError("Program not found.");
    if (existing.status === "DISABLED") {
      return { noOp: true };
    }
    await bumpProgramVersion(
      tx,
      id,
      { status: "DISABLED", disabledAt: new Date() },
      actorId,
      "disable",
      "program.disabled",
      {}
    );
    return { noOp: false };
  });
  return result;
}
