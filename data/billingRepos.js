import { prisma } from "./prismaClient.js";

/** @typedef {import("../generated/prisma/client.ts").BillingFrequency} BillingFrequency */
/** @typedef {import("../generated/prisma/client.ts").SubscriptionStatus} SubscriptionStatus */

/**
 * Real money commitment: customer has authorised or is being charged.
 * Per Razorpay state docs, these all imply a completed authorisation transaction
 * (or a billing cycle in progress). Creating another subscription on top is wrong.
 */
const ACTIVE_COMMITMENT_STATUSES = /** @type {const} */ ([
  "AUTHENTICATED",
  "ACTIVE",
  "PENDING",
  "PAUSED",
  "HALTED",
]);

/**
 * Any non-terminal subscription, including `CREATED` (no auth payment yet).
 * Used by /me and /change where we want to surface or act on the most
 * recent open record even if it hasn't been paid yet.
 */
const OPEN_STATUSES = /** @type {const} */ ([
  "CREATED",
  ...ACTIVE_COMMITMENT_STATUSES,
]);

/**
 * @param {string} userId
 */
export async function findActiveCommitmentSubscriptionForUser(userId) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [...ACTIVE_COMMITMENT_STATUSES] },
    },
    orderBy: { updatedAt: "desc" },
    include: { plan: true, customer: true },
  });
}

/**
 * @param {string} userId
 */
export async function findOpenSubscriptionForUser(userId) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_STATUSES] },
    },
    orderBy: { updatedAt: "desc" },
    include: { plan: true, customer: true },
  });
}

/**
 * @param {string} userId
 */
export async function findLatestSubscriptionForUser(userId) {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { plan: true, customer: true },
  });
}

/**
 * @param {string} id
 * @param {string} userId
 */
export async function findSubscriptionForUserById(id, userId) {
  return prisma.subscription.findFirst({
    where: { id, userId },
    include: { plan: true, customer: true },
  });
}

/**
 * @param {string} razorpaySubId
 */
export async function findSubscriptionByRazorpayId(razorpaySubId) {
  return prisma.subscription.findUnique({
    where: { razorpaySubId },
  });
}

/**
 * @param {{ userId: string; customerId: string; planId: string; razorpaySubId: string; status: SubscriptionStatus; amountMinor: number; currency: string; frequency: BillingFrequency; totalCount: number; paidCount?: number; currentStart?: Date | null; currentEnd?: Date | null; nextChargeAt?: Date | null; shortUrl?: string | null }} data
 */
export async function createSubscriptionRow(data) {
  return prisma.subscription.create({
    data: {
      userId: data.userId,
      customerId: data.customerId,
      planId: data.planId,
      razorpaySubId: data.razorpaySubId,
      status: data.status,
      amountMinor: data.amountMinor,
      currency: data.currency,
      frequency: data.frequency,
      totalCount: data.totalCount,
      paidCount: data.paidCount ?? 0,
      currentStart: data.currentStart ?? undefined,
      currentEnd: data.currentEnd ?? undefined,
      nextChargeAt: data.nextChargeAt ?? undefined,
      shortUrl: data.shortUrl ?? undefined,
    },
  });
}

/**
 * @param {string} id
 * @param {import("../generated/prisma/client.ts").Prisma.SubscriptionUpdateInput} patch
 */
export async function updateSubscriptionById(id, patch) {
  return prisma.subscription.update({
    where: { id },
    data: patch,
  });
}

/**
 * @param {string} razorpaySubId
 * @param {import("../generated/prisma/client.ts").Prisma.SubscriptionUpdateInput} patch
 */
export async function updateSubscriptionByRazorpayId(razorpaySubId, patch) {
  return prisma.subscription.update({
    where: { razorpaySubId },
    data: patch,
  });
}

/**
 * @param {{ provider: string; eventId: string; eventType: string; payload: unknown }} data
 */
export async function createWebhookEventRow(data) {
  return prisma.webhookEvent.create({
    data: {
      provider: data.provider,
      eventId: data.eventId,
      eventType: data.eventType,
      payload: data.payload,
    },
  });
}

/**
 * @param {string} eventId
 */
export async function findWebhookEventByEventId(eventId) {
  return prisma.webhookEvent.findUnique({
    where: { eventId },
  });
}

/**
 * @param {string} id
 * @param {{ processedAt?: Date | null; processingError?: string | null }} data
 */
export async function updateWebhookEventById(id, data) {
  return prisma.webhookEvent.update({
    where: { id },
    data,
  });
}

/**
 * @param {string} userId
 */
export async function findBillingCustomerByUserId(userId) {
  return prisma.billingCustomer.findUnique({
    where: { userId },
  });
}

/**
 * @param {string} razorpayCustomerId
 */
export async function findBillingCustomerByRazorpayCustomerId(razorpayCustomerId) {
  return prisma.billingCustomer.findUnique({
    where: { razorpayCustomerId },
  });
}

/**
 * @param {{ userId: string; razorpayCustomerId: string; email?: string | null }} data
 */
export async function createBillingCustomerRow(data) {
  return prisma.billingCustomer.create({
    data: {
      userId: data.userId,
      razorpayCustomerId: data.razorpayCustomerId,
      email: data.email ?? undefined,
    },
  });
}

/**
 * @param {number} amountMinor
 * @param {string} currency
 * @param {BillingFrequency} frequency
 */
export async function findBillingPlanByKey(amountMinor, currency, frequency) {
  return prisma.billingPlan.findUnique({
    where: {
      amountMinor_currency_frequency: {
        amountMinor,
        currency,
        frequency,
      },
    },
  });
}

/**
 * @param {{ razorpayPlanId: string; amountMinor: number; currency: string; frequency: BillingFrequency; period: string; interval: number }} data
 */
export async function createBillingPlanRow(data) {
  return prisma.billingPlan.create({
    data: {
      razorpayPlanId: data.razorpayPlanId,
      amountMinor: data.amountMinor,
      currency: data.currency,
      frequency: data.frequency,
      period: data.period,
      interval: data.interval,
    },
  });
}

/**
 * @param {string} userId
 */
export async function countCapturedPaymentsForUser(userId) {
  return prisma.subscriptionPayment.count({
    where: {
      status: "CAPTURED",
      subscription: { userId },
    },
  });
}

/**
 * Captured subscription payment aggregates per user (for referrer dashboard).
 * @param {string[]} userIds
 * @returns {Promise<Map<string, { capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null }>>}
 */
export async function getCapturedPaymentSummariesByUserIds(userIds) {
  /** @type {Map<string, { capturedCount: number; firstCapturedAt: Date | null; totalAmountMinor: number; currency: string | null }>} */
  const map = new Map();
  if (userIds.length === 0) return map;

  const rows = await prisma.subscriptionPayment.findMany({
    where: {
      status: "CAPTURED",
      subscription: { userId: { in: userIds } },
    },
    select: {
      amountMinor: true,
      currency: true,
      capturedAt: true,
      subscription: { select: { userId: true } },
    },
    orderBy: [{ capturedAt: "asc" }, { createdAt: "asc" }],
  });

  for (const row of rows) {
    const userId = row.subscription.userId;
    const entry = map.get(userId) ?? {
      capturedCount: 0,
      firstCapturedAt: null,
      totalAmountMinor: 0,
      currency: row.currency,
    };
    entry.capturedCount += 1;
    entry.totalAmountMinor += row.amountMinor;
    if (row.capturedAt && !entry.firstCapturedAt) {
      entry.firstCapturedAt = row.capturedAt;
    }
    entry.currency = row.currency;
    map.set(userId, entry);
  }

  return map;
}

/**
 * Sum captured payment amounts (minor units) for a user within an optional window.
 * @param {string} userId
 * @param {{ since: Date; until?: Date }} window
 */
export async function sumCapturedAmountMinorForUserInWindow(userId, window) {
  const capturedAt = { gte: window.since };
  if (window.until) {
    capturedAt.lte = window.until;
  }
  const result = await prisma.subscriptionPayment.aggregate({
    where: {
      status: "CAPTURED",
      subscription: { userId },
      capturedAt,
    },
    _sum: { amountMinor: true },
  });
  return result._sum.amountMinor ?? 0;
}

/**
 * @param {string} subscriptionId
 * @param {{
 *   razorpayPaymentId: string;
 *   razorpayOrderId?: string | null;
 *   razorpayInvoiceId?: string | null;
 *   amountMinor: number;
 *   currency: string;
 *   status: import("../generated/prisma/client.ts").SubscriptionPaymentStatus;
 *   method?: string | null;
 *   errorCode?: string | null;
 *   errorDescription?: string | null;
 *   capturedAt?: Date | null;
 * }} data
 */
export async function upsertSubscriptionPaymentByRzpPaymentId(subscriptionId, data) {
  return prisma.subscriptionPayment.upsert({
    where: { razorpayPaymentId: data.razorpayPaymentId },
    create: {
      subscriptionId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpayOrderId: data.razorpayOrderId ?? undefined,
      razorpayInvoiceId: data.razorpayInvoiceId ?? undefined,
      amountMinor: data.amountMinor,
      currency: data.currency,
      status: data.status,
      method: data.method ?? undefined,
      errorCode: data.errorCode ?? undefined,
      errorDescription: data.errorDescription ?? undefined,
      capturedAt: data.capturedAt ?? undefined,
    },
    update: {
      status: data.status,
      method: data.method ?? undefined,
      errorCode: data.errorCode ?? undefined,
      errorDescription: data.errorDescription ?? undefined,
      capturedAt: data.capturedAt ?? undefined,
      razorpayOrderId: data.razorpayOrderId ?? undefined,
      razorpayInvoiceId: data.razorpayInvoiceId ?? undefined,
      amountMinor: data.amountMinor,
      currency: data.currency,
    },
  });
}
