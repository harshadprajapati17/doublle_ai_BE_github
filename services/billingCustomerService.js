import { razorpay } from "../config/razorpay.js";
import { ConflictError } from "../errors/index.js";
import {
  createBillingCustomerRow,
  findBillingCustomerByRazorpayCustomerId,
  findBillingCustomerByUserId,
} from "../data/billingRepos.js";
import { prisma } from "../data/prismaClient.js";
import { mapRazorpaySdkErrorToBillingProvider } from "../utils/mapRazorpaySdkError.js";

const RZP_CUSTOMER_EXISTS_DESCRIPTION = "customer already exists for the merchant";

/**
 * @param {unknown} err
 */
function isRazorpayCustomerAlreadyExistsError(err) {
  if (!err || typeof err !== "object" || !("error" in err)) return false;
  const rzpError = /** @type {{ error?: { code?: string; description?: string } }} */ (err).error;
  if (rzpError?.code !== "BAD_REQUEST_ERROR") return false;
  const description = rzpError.description?.toLowerCase() ?? "";
  return description.includes(RZP_CUSTOMER_EXISTS_DESCRIPTION);
}

/**
 * @param {string} email
 */
async function findRazorpayCustomerByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const pageSize = 100;
  let skip = 0;

  for (;;) {
    let page;
    try {
      page = await razorpay.customers.all({ count: pageSize, skip });
    } catch (err) {
      throw mapRazorpaySdkErrorToBillingProvider(err);
    }

    const items = Array.isArray(page?.items) ? page.items : [];
    const match = items.find(
      (customer) =>
        typeof customer?.email === "string" &&
        customer.email.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (items.length < pageSize) break;
    skip += pageSize;
  }

  return null;
}

/**
 * @param {{ userId: string; email?: string | undefined }} input
 */
async function createRazorpayBillingCustomer(input) {
  const { userId, email } = input;

  try {
    return await razorpay.customers.create({
      name: `User ${userId}`,
      email: email || undefined,
      fail_existing: "0",
    });
  } catch (err) {
    if (!email || !isRazorpayCustomerAlreadyExistsError(err)) {
      throw mapRazorpaySdkErrorToBillingProvider(err);
    }

    const existing = await findRazorpayCustomerByEmail(email);
    if (!existing) {
      throw mapRazorpaySdkErrorToBillingProvider(err);
    }
    return existing;
  }
}

/**
 * @param {{ userId: string; email?: string | undefined }} input
 */
export async function getOrCreateBillingCustomer(input) {
  const { userId, email } = input;
  const existing = await findBillingCustomerByUserId(userId);
  if (existing) {
    if (email && email !== existing.email) {
      return prisma.billingCustomer.update({
        where: { id: existing.id },
        data: { email },
      });
    }
    return existing;
  }

  const rzpCustomer = await createRazorpayBillingCustomer({ userId, email });

  try {
    return await createBillingCustomerRow({
      userId,
      razorpayCustomerId: rzpCustomer.id,
      email: email ?? null,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const byUser = await findBillingCustomerByUserId(userId);
      if (byUser) return byUser;

      const byRzp = await findBillingCustomerByRazorpayCustomerId(rzpCustomer.id);
      if (byRzp) {
        if (byRzp.userId === userId) return byRzp;
        throw new ConflictError(
          "A billing profile for this payment account is already linked to another user."
        );
      }
    }
    throw err;
  }
}
