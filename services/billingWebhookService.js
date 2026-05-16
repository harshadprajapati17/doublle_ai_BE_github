import {
  createWebhookEventRow,
  findSubscriptionByRazorpayId,
  findWebhookEventByEventId,
  updateSubscriptionByRazorpayId,
  updateWebhookEventById,
  upsertSubscriptionPaymentByRzpPaymentId,
} from "../data/billingRepos.js";
import {
  ServiceMisconfiguredError,
  ValidationError,
  WebhookSignatureInvalidError,
} from "../errors/index.js";
import { mapRazorpayPaymentStatus } from "../utils/billingRzpMappers.js";
import { subscriptionUpdateInputFromRzpEntity } from "../utils/subscriptionUpdateInputFromRzpEntity.js";
import { parseRazorpayTimestamp } from "../utils/razorpayTimestamps.js";
import { verifyRazorpayWebhookSignature } from "../utils/verifyRazorpayWebhookSignature.js";
import { logStructured } from "../utils/structuredLog.js";
import { resolveRazorpayWebhookEventId } from "../utils/resolveRazorpayWebhookEventId.js";
import { accrueCommissionOnPayment, clawbackCommissionsForPayment } from "./commissionService.js";
import { tryApplyRefereeBenefitOnPayment } from "./refereeBenefitService.js";

const WEBHOOK_SCOPE = "billing.webhook";

/**
 * @param {Buffer | string} rawBody
 */
function rawBodyByteLength(rawBody) {
  if (Buffer.isBuffer(rawBody)) return rawBody.length;
  return Buffer.byteLength(String(rawBody ?? ""), "utf8");
}

/**
 * @param {unknown} block
 * @returns {Record<string, unknown> | null}
 */
export function unwrapRazorpayWebhookEntity(block) {
  if (!block || typeof block !== "object") return null;
  const obj = /** @type {Record<string, unknown>} */ (block);
  const inner = obj.entity;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return /** @type {Record<string, unknown>} */ (inner);
  }
  if (Array.isArray(inner) && inner[0] && typeof inner[0] === "object") {
    return /** @type {Record<string, unknown>} */ (inner[0]);
  }
  return null;
}

/**
 * @param {unknown} payload
 */
function summarizeWebhookPayloadIds(payload) {
  if (!payload || typeof payload !== "object") return {};
  const p = /** @type {Record<string, unknown>} */ (payload);
  const subEnt = unwrapRazorpayWebhookEntity(p.subscription);
  const payEnt = unwrapRazorpayWebhookEntity(p.payment);
  const subscriptionId =
    subEnt && typeof subEnt.id === "string" && subEnt.id.startsWith("sub_") ? subEnt.id : undefined;
  const paymentId =
    payEnt && typeof payEnt.id === "string" && payEnt.id.startsWith("pay_") ? payEnt.id : undefined;
  return { subscriptionId, paymentId };
}

/**
 * @param {Record<string, unknown>} entity
 */
async function syncSubscriptionFromRzpEntity(entity) {
  const rid = entity.id;
  if (typeof rid !== "string" || !rid.startsWith("sub_")) return;

  const local = await findSubscriptionByRazorpayId(rid);
  if (!local) return;

  const patch = subscriptionUpdateInputFromRzpEntity(entity);
  if (!patch) return;

  await updateSubscriptionByRazorpayId(rid, patch);
}

/**
 * @param {Record<string, unknown>} entity
 */
async function syncPaymentFromRzpEntity(entity) {
  const rid = typeof entity.subscription_id === "string" ? entity.subscription_id : "";
  if (!rid.startsWith("sub_")) return;

  const local = await findSubscriptionByRazorpayId(rid);
  if (!local) return;

  const payId = typeof entity.id === "string" ? entity.id : "";
  if (!payId.startsWith("pay_")) return;

  const amountMinor = Number(entity.amount);
  if (!Number.isFinite(amountMinor)) return;

  const currency =
    typeof entity.currency === "string" ? entity.currency.trim().toUpperCase() : local.currency;

  const errObj =
    entity.error && typeof entity.error === "object"
      ? /** @type {Record<string, unknown>} */ (entity.error)
      : null;

  const paymentRow = await upsertSubscriptionPaymentByRzpPaymentId(local.id, {
    razorpayPaymentId: payId,
    razorpayOrderId: typeof entity.order_id === "string" ? entity.order_id : null,
    razorpayInvoiceId: typeof entity.invoice_id === "string" ? entity.invoice_id : null,
    amountMinor,
    currency,
    status: mapRazorpayPaymentStatus(entity.status),
    method: typeof entity.method === "string" ? entity.method : null,
    errorCode: errObj && typeof errObj.code === "string" ? errObj.code : null,
    errorDescription:
      errObj && typeof errObj.description === "string" ? errObj.description : null,
    capturedAt:
      String(entity.status).toLowerCase() === "captured"
        ? parseRazorpayTimestamp(entity.created_at) ?? new Date()
        : parseRazorpayTimestamp(entity.created_at),
  });

  if (paymentRow.status === "CAPTURED") {
    await tryApplyRefereeBenefitOnPayment({
      userId: local.userId,
      paymentId: paymentRow.id,
      subscriptionId: local.id,
    });
    await accrueCommissionOnPayment({
      userId: local.userId,
      payment: paymentRow,
      subscription: local,
    });
  }

  if (paymentRow.status === "REFUNDED") {
    await clawbackCommissionsForPayment({
      paymentId: paymentRow.id,
      reason: "razorpay_payment_refunded",
    });
  }
}

/**
 * @param {string} eventType
 * @param {unknown} payload
 */
async function processRazorpayEventPayload(eventType, payload) {
  if (!payload || typeof payload !== "object") return;
  const p = /** @type {Record<string, unknown>} */ (payload);

  if (eventType.startsWith("subscription.")) {
    const subEntity = unwrapRazorpayWebhookEntity(p.subscription);
    if (subEntity) await syncSubscriptionFromRzpEntity(subEntity);
    if (eventType === "subscription.charged") {
      const payEntity = unwrapRazorpayWebhookEntity(p.payment);
      if (payEntity) await syncPaymentFromRzpEntity(payEntity);
    }
    return;
  }

  if (eventType.startsWith("payment.")) {
    const payEntity = unwrapRazorpayWebhookEntity(p.payment);
    if (payEntity) await syncPaymentFromRzpEntity(payEntity);
  }
}

/**
 * @param {{ rawBody: Buffer | string; signatureHeader: string | undefined; eventIdHeader?: string | undefined }} input
 */
export async function handleRazorpayWebhook(input) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || secret.trim() === "") {
    logStructured("error", {
      scope: WEBHOOK_SCOPE,
      phase: "misconfigured",
      message: "RAZORPAY_WEBHOOK_SECRET is missing or empty.",
    });
    throw new ServiceMisconfiguredError(
      "RAZORPAY_WEBHOOK_SECRET is not configured. Set it to verify Razorpay webhooks."
    );
  }

  if (!verifyRazorpayWebhookSignature(input.rawBody, input.signatureHeader, secret)) {
    logStructured("warn", {
      scope: WEBHOOK_SCOPE,
      phase: "signature_invalid",
      bodyBytes: rawBodyByteLength(input.rawBody),
      hasSignatureHeader: Boolean(
        typeof input.signatureHeader === "string" && input.signatureHeader.trim().length > 0
      ),
    });
    throw new WebhookSignatureInvalidError();
  }

  let json;
  try {
    const text = Buffer.isBuffer(input.rawBody)
      ? input.rawBody.toString("utf8")
      : String(input.rawBody);
    json = JSON.parse(text);
  } catch {
    logStructured("warn", {
      scope: WEBHOOK_SCOPE,
      phase: "json_invalid",
      bodyBytes: rawBodyByteLength(input.rawBody),
    });
    throw new ValidationError("Webhook body must be valid JSON.");
  }

  if (!json || typeof json !== "object") {
    logStructured("warn", { scope: WEBHOOK_SCOPE, phase: "payload_not_object" });
    throw new ValidationError("Invalid webhook payload.");
  }

  const j = /** @type {Record<string, unknown>} */ (json);
  const eventType = typeof j.event === "string" ? j.event : "";
  if (!eventType) {
    logStructured("warn", {
      scope: WEBHOOK_SCOPE,
      phase: "missing_event_type",
      eventIdSource: resolveRazorpayWebhookEventId({
        json: j,
        rawBody: input.rawBody,
        eventIdHeader: input.eventIdHeader,
      }).source,
    });
    throw new ValidationError("Invalid webhook payload (missing event type).");
  }

  const { eventId, source: eventIdSource } = resolveRazorpayWebhookEventId({
    json: j,
    rawBody: input.rawBody,
    eventIdHeader: input.eventIdHeader,
  });

  const ids = summarizeWebhookPayloadIds(j.payload);
  logStructured("info", {
    scope: WEBHOOK_SCOPE,
    phase: "verified",
    eventId,
    eventIdSource,
    eventType,
    ...ids,
  });

  let row = await findWebhookEventByEventId(eventId);
  if (row?.processedAt) {
    logStructured("info", {
      scope: WEBHOOK_SCOPE,
      phase: "duplicate",
      eventId,
      eventIdSource,
      eventType,
      ...ids,
    });
    return { data: { received: true, duplicate: true } };
  }

  if (!row) {
    try {
      row = await createWebhookEventRow({
        provider: "razorpay",
        eventId,
        eventType,
        payload: json,
      });
      logStructured("info", {
        scope: WEBHOOK_SCOPE,
        phase: "persisted",
        eventId,
        eventIdSource,
        eventType,
        ...ids,
      });
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        row = await findWebhookEventByEventId(eventId);
        logStructured("info", {
          scope: WEBHOOK_SCOPE,
          phase: "persist_race",
          eventId,
          eventIdSource,
          eventType,
          ...ids,
        });
      } else {
        logStructured("error", {
          scope: WEBHOOK_SCOPE,
          phase: "persist_failed",
          eventId,
          eventIdSource,
          eventType,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
  }

  if (!row) {
    logStructured("error", {
      scope: WEBHOOK_SCOPE,
      phase: "row_missing",
      eventId,
      eventType,
    });
    throw new Error("Failed to persist webhook event.");
  }
  if (row.processedAt) {
    logStructured("info", {
      scope: WEBHOOK_SCOPE,
      phase: "duplicate_after_persist",
      eventId,
      eventIdSource,
      eventType,
      ...ids,
    });
    return { data: { received: true, duplicate: true } };
  }

  try {
    await processRazorpayEventPayload(eventType, j.payload);
    await updateWebhookEventById(row.id, {
      processedAt: new Date(),
      processingError: null,
    });
    logStructured("info", {
      scope: WEBHOOK_SCOPE,
      phase: "processed",
      eventId,
      eventIdSource,
      eventType,
      ...ids,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStructured("error", {
      scope: WEBHOOK_SCOPE,
      phase: "handler_failed",
      eventId,
      eventIdSource,
      eventType,
      ...ids,
      message: msg,
    });
    await updateWebhookEventById(row.id, {
      processedAt: null,
      processingError: msg,
    });
    throw err;
  }

  return { data: { received: true } };
}
