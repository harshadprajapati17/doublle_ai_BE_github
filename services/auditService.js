import { create as createAuditRow } from "../data/auditLogRepo.js";

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {{
 *   actorId: string;
 *   action: string;
 *   targetType: string;
 *   targetId: string;
 *   payload: import('@prisma/client').Prisma.InputJsonValue;
 * }} entry
 */
export async function writeAuditLog(tx, entry) {
  await createAuditRow(tx, {
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    payload: entry.payload,
  });
}
