import { razorpay } from "../config/razorpay.js";
import {
  createBillingCustomerRow,
  findBillingCustomerByUserId,
} from "../data/billingRepos.js";
import { prisma } from "../data/prismaClient.js";
import { mapRazorpaySdkErrorToBillingProvider } from "../utils/mapRazorpaySdkError.js";

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

  let rzpCustomer;
  try {
    rzpCustomer = await razorpay.customers.create({
      name: `User ${userId}`,
      email: email || undefined,
      fail_existing: 0,
    });
  } catch (err) {
    throw mapRazorpaySdkErrorToBillingProvider(err);
  }

  try {
    return await createBillingCustomerRow({
      userId,
      razorpayCustomerId: rzpCustomer.id,
      email: email ?? null,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      const again = await findBillingCustomerByUserId(userId);
      if (again) return again;
    }
    throw err;
  }
}
