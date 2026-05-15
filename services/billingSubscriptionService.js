import { razorpay } from "../config/razorpay.js";
import {
  createSubscriptionRow,
  findActiveCommitmentSubscriptionForUser,
  findLatestSubscriptionForUser,
  findOpenSubscriptionForUser,
  findSubscriptionForUserById,
  updateSubscriptionById,
  updateSubscriptionByRazorpayId,
} from "../data/billingRepos.js";
import { NotFoundError, SubscriptionAlreadyActiveError, SubscriptionNotModifiableError } from "../errors/index.js";
import { getOrCreateBillingCustomer } from "./billingCustomerService.js";
import { getOrCreateBillingPlan } from "./billingPlanService.js";
import { mapRazorpaySdkErrorToBillingProvider } from "../utils/mapRazorpaySdkError.js";
import { mapRazorpaySubscriptionStatus } from "../utils/billingRzpMappers.js";
import { parseRazorpayTimestamp } from "../utils/razorpayTimestamps.js";
import { subscriptionStandardCheckoutHints } from "../utils/billingCheckoutHints.js";
import { subscriptionUpdateInputFromRzpEntity } from "../utils/subscriptionUpdateInputFromRzpEntity.js";

/** @typedef {import("../generated/prisma/client.ts").BillingFrequency} BillingFrequency */

function defaultTotalCount() {
  const n = Number(process.env.BILLING_DEFAULT_TOTAL_COUNT ?? 120);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 120;
}

/**
 * @param {import("../generated/prisma/client.ts").Subscription} sub
 */
export function toSubscriptionDto(sub) {
  return {
    id: sub.id,
    razorpaySubscriptionId: sub.razorpaySubId,
    status: sub.status,
    shortUrl: sub.shortUrl,
    amount: Math.floor(sub.amountMinor / 100),
    currency: sub.currency,
    frequency: sub.frequency,
    totalCount: sub.totalCount,
    paidCount: sub.paidCount,
    currentStart: sub.currentStart ? sub.currentStart.toISOString() : null,
    currentEnd: sub.currentEnd ? sub.currentEnd.toISOString() : null,
    nextChargeAt: sub.nextChargeAt ? sub.nextChargeAt.toISOString() : null,
    cancelAtCycleEnd: sub.cancelAtCycleEnd,
    cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null,
  };
}

/**
 * Statuses where a Razorpay-side change is possible without our action (e.g. customer
 * just authorised, or auto-charge fired). Reconciling at terminal/paused states is wasteful.
 */
const RECONCILABLE_STATUSES = /** @type {const} */ (["CREATED", "AUTHENTICATED", "PENDING"]);

function reconcileDebounceMs() {
  const n = Number(process.env.BILLING_RECONCILE_DEBOUNCE_MS ?? 10_000);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10_000;
}

/**
 * Self-healing fallback for missed webhooks: pulls fresh subscription state from
 * Razorpay (`subscriptions.fetch`) and persists it using the same mapper used by
 * the webhook pipeline, so DB and Razorpay converge regardless of which path runs.
 *
 * Guards:
 *  - Only runs when local status is transient (`CREATED` / `AUTHENTICATED` / `PENDING`);
 *    `ACTIVE`/`PAUSED`/`HALTED`/terminal states won't drift without an explicit action.
 *  - Skips the Razorpay call if the row was updated within `BILLING_RECONCILE_DEBOUNCE_MS`
 *    (default 10s) unless `force` is set. Protects against client polling storms.
 *
 * Best-effort: connectivity or auth errors against Razorpay are logged and swallowed
 * so callers (POST/GET) still serve the most recent DB state.
 *
 * @template {{ id: string; razorpaySubId: string | null; status: string; updatedAt: Date | string }} T
 * @param {T | null | undefined} row
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<T | null | undefined>}
 */
async function reconcileSubscriptionFromRazorpay(row, opts) {
  if (!row?.razorpaySubId) return row ?? null;
  if (!RECONCILABLE_STATUSES.includes(/** @type {any} */ (row.status))) return row;

  if (!opts?.force) {
    const ts = row.updatedAt instanceof Date ? row.updatedAt.getTime() : new Date(row.updatedAt).getTime();
    const ageMs = Date.now() - ts;
    if (Number.isFinite(ageMs) && ageMs >= 0 && ageMs < reconcileDebounceMs()) {
      return row;
    }
  }

  try {
    const rzp = await razorpay.subscriptions.fetch(row.razorpaySubId);
    const raw = /** @type {Record<string, unknown>} */ (rzp && typeof rzp === "object" ? rzp : {});
    const patch = subscriptionUpdateInputFromRzpEntity(raw);
    if (!patch) return row;
    const updated = await updateSubscriptionByRazorpayId(row.razorpaySubId, patch);
    return /** @type {T} */ (updated ?? row);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "warn",
        scope: "billing.reconcile",
        razorpaySubId: row.razorpaySubId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
    return row;
  }
}

/**
 * Best-effort cleanup of an abandoned `CREATED` subscription whose customer
 * never completed the authorisation transaction. Per Razorpay state docs,
 * `created` is pre-auth and freely cancellable; we don't fail the new create
 * if the remote cancel hits a race (e.g. already cancelled/expired).
 *
 * @param {{ id: string; razorpaySubId: string }} sub
 */
async function abandonCreatedSubscription(sub) {
  try {
    await razorpay.subscriptions.cancel(sub.razorpaySubId, {
      cancel_at_cycle_end: 0,
    });
  } catch {
    // Ignore: row gets marked CANCELLED locally regardless so the user can move on.
  }
  await updateSubscriptionById(sub.id, {
    status: "CANCELLED",
    cancelAtCycleEnd: false,
    cancelledAt: new Date(),
  });
}

/**
 * @param {{ userId: string; email?: string | undefined; amountMajor: number; currency: string; frequency: BillingFrequency }} input
 */
export async function createSubscriptionForUser(input) {
  const { userId, email, amountMajor, currency, frequency } = input;

  const openBefore = await findOpenSubscriptionForUser(userId);
  if (openBefore) {
    await reconcileSubscriptionFromRazorpay(openBefore, { force: true });
  }

  const committed = await findActiveCommitmentSubscriptionForUser(userId);
  if (committed) {
    throw new SubscriptionAlreadyActiveError();
  }

  const amountMinor = amountMajor * 100;

  const openSub = await findOpenSubscriptionForUser(userId);
  if (openSub && openSub.status === "CREATED") {
    const sameParams =
      openSub.amountMinor === amountMinor &&
      openSub.currency === currency &&
      openSub.frequency === frequency;
    if (sameParams) {
      const subscription = toSubscriptionDto(openSub);
      const checkout = subscriptionStandardCheckoutHints(
        subscription.razorpaySubscriptionId,
        subscription.status
      );
      return {
        data: {
          subscription,
          ...(checkout ? { checkout } : {}),
        },
      };
    }
    await abandonCreatedSubscription(openSub);
  }

  const customer = await getOrCreateBillingCustomer({ userId, email });
  const plan = await getOrCreateBillingPlan({ amountMinor, currency, frequency });

  const totalCount = defaultTotalCount();

  let rzpSub;
  try {
    rzpSub = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_id: customer.razorpayCustomerId,
      total_count: totalCount,
      customer_notify: true,
      notes: {
        app_user_id: userId,
      },
    });
  } catch (err) {
    throw mapRazorpaySdkErrorToBillingProvider(err);
  }

  const status = mapRazorpaySubscriptionStatus(rzpSub.status);
  const paidCount = Number.isFinite(Number(rzpSub.paid_count)) ? Number(rzpSub.paid_count) : 0;
  const currentStart = parseRazorpayTimestamp(rzpSub.current_start);
  const currentEnd = parseRazorpayTimestamp(rzpSub.current_end);
  const nextChargeAt =
    parseRazorpayTimestamp(rzpSub.charge_at) ??
    parseRazorpayTimestamp(rzpSub.start_at);

  const row = await createSubscriptionRow({
    userId,
    customerId: customer.id,
    planId: plan.id,
    razorpaySubId: rzpSub.id,
    status,
    amountMinor,
    currency,
    frequency,
    totalCount,
    paidCount,
    currentStart,
    currentEnd,
    nextChargeAt,
    shortUrl: typeof rzpSub.short_url === "string" ? rzpSub.short_url : null,
  });

  const subscription = toSubscriptionDto(row);
  const checkout = subscriptionStandardCheckoutHints(subscription.razorpaySubscriptionId, subscription.status);
  return {
    data: {
      subscription,
      ...(checkout ? { checkout } : {}),
    },
  };
}

/**
 * @param {string} userId
 */
export async function getMySubscription(userId) {
  const open = await findOpenSubscriptionForUser(userId);
  const reconciled = open ? await reconcileSubscriptionFromRazorpay(open) : null;
  const sub = reconciled ?? (await findLatestSubscriptionForUser(userId));
  if (!sub) {
    return { data: { subscription: null } };
  }
  const subscription = toSubscriptionDto(sub);
  const checkout = subscriptionStandardCheckoutHints(subscription.razorpaySubscriptionId, subscription.status);
  return {
    data: {
      subscription,
      ...(checkout ? { checkout } : {}),
    },
  };
}

const TERMINAL = /** @type {const} */ (["CANCELLED", "COMPLETED", "EXPIRED"]);

/**
 * @param {string} userId
 * @param {string} subscriptionId
 * @param {boolean} cancelAtCycleEnd
 */
export async function cancelSubscriptionForUser(userId, subscriptionId, cancelAtCycleEnd) {
  const sub = await findSubscriptionForUserById(subscriptionId, userId);
  if (!sub) {
    throw new NotFoundError("Subscription not found.");
  }
  if (TERMINAL.includes(/** @type {typeof TERMINAL[number]} */ (sub.status))) {
    throw new SubscriptionNotModifiableError("Subscription is already finished.");
  }

  let rzpSub;
  try {
    rzpSub = await razorpay.subscriptions.cancel(sub.razorpaySubId, {
      cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
    });
  } catch (err) {
    throw mapRazorpaySdkErrorToBillingProvider(err);
  }

  const status = mapRazorpaySubscriptionStatus(rzpSub.status);
  const cancelledAt = parseRazorpayTimestamp(rzpSub.end_at ?? rzpSub.ended_at) ?? new Date();

  const updated = await updateSubscriptionById(sub.id, {
    status,
    cancelAtCycleEnd,
    cancelledAt: cancelAtCycleEnd ? sub.cancelledAt : cancelledAt,
    currentStart: parseRazorpayTimestamp(rzpSub.current_start) ?? sub.currentStart,
    currentEnd: parseRazorpayTimestamp(rzpSub.current_end) ?? sub.currentEnd,
    paidCount: Number.isFinite(Number(rzpSub.paid_count)) ? Number(rzpSub.paid_count) : sub.paidCount,
  });

  return { data: { subscription: toSubscriptionDto(updated) } };
}

/**
 * Cancel current blocking subscription (immediate) and create a new one.
 * @param {{ userId: string; email?: string | undefined; amountMajor: number; currency: string; frequency: BillingFrequency }} input
 */
export async function changeSubscriptionForUser(input) {
  const open = await findOpenSubscriptionForUser(input.userId);
  if (!open) {
    throw new NotFoundError("No active or in-progress subscription to change.");
  }

  let rzpSub;
  try {
    rzpSub = await razorpay.subscriptions.cancel(open.razorpaySubId, {
      cancel_at_cycle_end: 0,
    });
  } catch (err) {
    throw mapRazorpaySdkErrorToBillingProvider(err);
  }

  const status = mapRazorpaySubscriptionStatus(rzpSub.status);
  await updateSubscriptionById(open.id, {
    status,
    cancelAtCycleEnd: false,
    cancelledAt: new Date(),
  });

  return createSubscriptionForUser({
    userId: input.userId,
    email: input.email,
    amountMajor: input.amountMajor,
    currency: input.currency,
    frequency: input.frequency,
  });
}
