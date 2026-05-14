import crypto from "node:crypto";
import { razorpay } from "../config/razorpay.js";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateCreateOrderBody(body) {
  const details = [];

  if (!isPlainObject(body)) {
    details.push({ field: "body", message: "Body must be a JSON object." });
    return { ok: false, details };
  }

  const { amount, currency, plan, ...unknown } = body;

  const unknownKeys = Object.keys(unknown);
  if (unknownKeys.length > 0) {
    details.push({
      field: "body",
      message: "Unknown fields are not allowed.",
      details: { unknownKeys },
    });
  }

  const currencyCode =
    typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    details.push({
      field: "currency",
      message: "currency is required and must be a 3-letter ISO code (e.g., USD, EUR, INR).",
    });
  }

  // Simple contract: frontend sends integer amount in major units (e.g., 2000 USD),
  // backend converts to minor units by multiplying by 100 for Razorpay.
  let amountInput;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    amountInput = amount;
  } else if (typeof amount === "string" && amount.trim() !== "") {
    amountInput = Number(amount);
  }

  if (
    typeof amountInput !== "number" ||
    !Number.isFinite(amountInput) ||
    !Number.isInteger(amountInput) ||
    amountInput <= 0
  ) {
    details.push({
      field: "amount",
      message:
        "amount is required and must be a positive integer in major currency units (e.g., 2000 for $2000).",
    });
  }

  const razorpayAmount =
    typeof amountInput === "number" &&
    Number.isFinite(amountInput) &&
    Number.isInteger(amountInput) &&
    amountInput > 0
      ? amountInput * 100
      : undefined;

  let normalizedPlan;
  if (typeof plan !== "undefined") {
    if (!isPlainObject(plan)) {
      details.push({
        field: "plan",
        message: "plan must be an object when provided.",
      });
    } else {
      const { commitment, mode, requests, monthly, months, total, ...planUnknown } =
        plan;
      const planUnknownKeys = Object.keys(planUnknown);
      if (planUnknownKeys.length > 0) {
        details.push({
          field: "plan",
          message: "Unknown fields are not allowed in plan.",
          details: { unknownKeys: planUnknownKeys },
        });
      }

      if (typeof commitment !== "string" || commitment.trim() === "") {
        details.push({
          field: "plan.commitment",
          message: "plan.commitment must be a non-empty string.",
        });
      }
      if (typeof mode !== "string" || mode.trim() === "") {
        details.push({
          field: "plan.mode",
          message: "plan.mode must be a non-empty string.",
        });
      }
      if (!Number.isInteger(requests) || requests <= 0) {
        details.push({
          field: "plan.requests",
          message: "plan.requests must be a positive integer.",
        });
      }
      if (
        typeof monthly !== "number" ||
        !Number.isFinite(monthly) ||
        !Number.isInteger(monthly) ||
        monthly <= 0
      ) {
        details.push({
          field: "plan.monthly",
          message:
            "plan.monthly must be a positive integer in major currency units (e.g., 2000 for $2000).",
        });
      }
      if (
        typeof months !== "number" ||
        !Number.isFinite(months) ||
        !Number.isInteger(months) ||
        months <= 0
      ) {
        details.push({
          field: "plan.months",
          message: "plan.months must be a positive integer.",
        });
      }
      if (
        typeof total !== "number" ||
        !Number.isFinite(total) ||
        !Number.isInteger(total) ||
        total <= 0
      ) {
        details.push({
          field: "plan.total",
          message:
            "plan.total must be a positive integer in major currency units (e.g., 2000 for $2000).",
        });
      }

      if (
        typeof amountInput === "number" &&
        Number.isFinite(amountInput) &&
        typeof total === "number" &&
        Number.isFinite(total) &&
        amountInput !== total
      ) {
        details.push({
          field: "plan.total",
          message: "plan.total must match amount.",
          details: { amount: amountInput, total },
        });
      }

      normalizedPlan = {
        commitment: commitment?.trim(),
        mode: mode?.trim(),
        requests,
        monthly,
        months,
        total,
      };
    }
  }

  if (details.length > 0) return { ok: false, details };

  return {
    ok: true,
    value: {
      amount: razorpayAmount,
      currency: currencyCode,
      plan: normalizedPlan,
    },
  };
}

function validateVerifyPaymentBody(body) {
  const details = [];

  if (!isPlainObject(body)) {
    details.push({ field: "body", message: "Body must be a JSON object." });
    return { ok: false, details };
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    ...unknown
  } = body;

  const unknownKeys = Object.keys(unknown);
  if (unknownKeys.length > 0) {
    details.push({
      field: "body",
      message: "Unknown fields are not allowed.",
      details: { unknownKeys },
    });
  }

  if (typeof razorpay_order_id !== "string" || razorpay_order_id.trim() === "") {
    details.push({
      field: "razorpay_order_id",
      message: "razorpay_order_id is required and must be a non-empty string.",
    });
  }
  if (
    typeof razorpay_payment_id !== "string" ||
    razorpay_payment_id.trim() === ""
  ) {
    details.push({
      field: "razorpay_payment_id",
      message: "razorpay_payment_id is required and must be a non-empty string.",
    });
  }
  if (
    typeof razorpay_signature !== "string" ||
    razorpay_signature.trim() === ""
  ) {
    details.push({
      field: "razorpay_signature",
      message: "razorpay_signature is required and must be a non-empty string.",
    });
  }

  if (details.length > 0) return { ok: false, details };

  return {
    ok: true,
    value: {
      razorpay_order_id: razorpay_order_id.trim(),
      razorpay_payment_id: razorpay_payment_id.trim(),
      razorpay_signature: razorpay_signature.trim(),
    },
  };
}

function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
  secret,
}) {
  const payload = `${orderId}|${paymentId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const a = Buffer.from(expectedSignature, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function createOrder(req, res) {
  try {
    const validated = validateCreateOrderBody(req.body);
    if (!validated.ok) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: validated.details,
        },
      });
    }

    const notes = validated.value.plan
      ? {
          plan_commitment: validated.value.plan.commitment,
          plan_mode: validated.value.plan.mode,
          plan_requests: String(validated.value.plan.requests),
          plan_monthly: String(validated.value.plan.monthly),
          plan_months: String(validated.value.plan.months),
          plan_total: String(validated.value.plan.total),
        }
      : undefined;

    const order = await razorpay.orders.create({
      amount: validated.value.amount,
      currency: validated.value.currency,
      ...(notes ? { notes } : {}),
    });

    const key_id = process.env.RAZORPAY_KEY_ID;
    if (!key_id) {
      return res.status(500).json({
        error: {
          code: "PAYMENT_ORDER_CREATE_NOT_CONFIGURED",
          message:
            "Missing Razorpay key id. Set RAZORPAY_KEY_ID in environment variables.",
        },
      });
    }

    return res.status(201).json({
      data: {
        key_id,
        order,
      },
    });
  } catch (err) {
    const providerCode =
      err && typeof err === "object" ? err?.error?.code : undefined;
    const providerDescription =
      err && typeof err === "object" ? err?.error?.description : undefined;
    const providerStatus =
      err && typeof err === "object" ? err?.statusCode : undefined;

    return res.status(502).json({
      error: {
        code: "PAYMENT_PROVIDER_ERROR",
        message: "Razorpay rejected the order creation request.",
        ...(providerCode || providerDescription || providerStatus
          ? {
              details: {
                provider: "razorpay",
                providerStatus,
                providerCode,
                providerDescription,
              },
            }
          : {}),
      },
    });
  }
}

export async function verifyPayment(req, res) {
  try {
    const validated = validateVerifyPaymentBody(req.body);
    if (!validated.ok) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: validated.details,
        },
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        error: {
          code: "PAYMENT_VERIFY_NOT_CONFIGURED",
          message:
            "Missing Razorpay key secret. Set RAZORPAY_KEY_SECRET in environment variables.",
        },
      });
    }

    const success = verifyRazorpaySignature({
      orderId: validated.value.razorpay_order_id,
      paymentId: validated.value.razorpay_payment_id,
      signature: validated.value.razorpay_signature,
      secret,
    });

    return res.status(200).json({ data: { success } });
  } catch (err) {
    return res.status(500).json({
      error: {
        code: "PAYMENT_VERIFY_FAILED",
        message: "Failed to verify Razorpay payment.",
      },
    });
  }
}
