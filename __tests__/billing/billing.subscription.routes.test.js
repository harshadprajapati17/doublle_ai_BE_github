import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

jest.unstable_mockModule("../../config/razorpay.js", () => ({
  razorpay: {
    customers: { create: jest.fn() },
    plans: { create: jest.fn() },
    subscriptions: { create: jest.fn(), cancel: jest.fn(), fetch: jest.fn() },
    orders: { create: jest.fn() },
  },
}));

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");
const { razorpay } = await import("../../config/razorpay.js");

const SUB_ROW_ID = "550e8400-e29b-41d4-a716-446655440000";
const CUST_ROW_ID = "550e8400-e29b-41d4-a716-446655440001";
const PLAN_ROW_ID = "550e8400-e29b-41d4-a716-446655440002";

function userToken(sub = "user-bill-1") {
  return jwt.sign(
    { sub, role: "user", email: "bill@example.com" },
    process.env.USER_JWT_SECRET,
    { algorithm: "HS256" }
  );
}

function stubSuccessfulCreateFlow() {
  prisma.subscription.findFirst.mockResolvedValue(null);
  prisma.billingCustomer.findUnique.mockResolvedValue(null);
  prisma.billingCustomer.create.mockResolvedValue({
    id: CUST_ROW_ID,
    userId: "user-bill-1",
    razorpayCustomerId: "cust_test_1",
    email: "bill@example.com",
  });
  prisma.billingPlan.findUnique.mockResolvedValue(null);
  prisma.billingPlan.create.mockResolvedValue({
    id: PLAN_ROW_ID,
    razorpayPlanId: "plan_test_1",
    amountMinor: 250000,
    currency: "INR",
    frequency: "QUARTERLY",
    period: "monthly",
    interval: 3,
  });
  prisma.subscription.create.mockResolvedValue({
    id: SUB_ROW_ID,
    userId: "user-bill-1",
    customerId: CUST_ROW_ID,
    planId: PLAN_ROW_ID,
    razorpaySubId: "sub_test_1",
    status: "CREATED",
    amountMinor: 250000,
    currency: "INR",
    frequency: "QUARTERLY",
    totalCount: 120,
    paidCount: 0,
    currentStart: null,
    currentEnd: null,
    nextChargeAt: null,
    cancelledAt: null,
    cancelAtCycleEnd: false,
    shortUrl: "https://rzp.io/i/test",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  razorpay.customers.create.mockResolvedValue({ id: "cust_test_1" });
  razorpay.plans.create.mockResolvedValue({ id: "plan_test_1" });
  razorpay.subscriptions.create.mockResolvedValue({
    id: "sub_test_1",
    status: "created",
    paid_count: 0,
    short_url: "https://rzp.io/i/test",
    current_start: null,
    current_end: null,
    charge_at: null,
  });
}

describe("Billing subscriptions API", () => {
  beforeEach(() => {
    prisma.subscription.findFirst.mockReset();
    prisma.subscription.findUnique.mockReset();
    prisma.subscription.create.mockReset();
    prisma.subscription.update.mockReset();
    prisma.billingCustomer.findUnique.mockReset();
    prisma.billingCustomer.create.mockReset();
    prisma.billingPlan.findUnique.mockReset();
    prisma.billingPlan.create.mockReset();
    razorpay.customers.create.mockReset();
    razorpay.plans.create.mockReset();
    razorpay.subscriptions.create.mockReset();
    razorpay.subscriptions.cancel.mockReset();
    razorpay.subscriptions.fetch.mockReset();
  });

  test("POST /api/v1/billing/subscriptions returns 201 with shortUrl", async () => {
    stubSuccessfulCreateFlow();

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 2500, currency: "inr", frequency: "QUARTERLY" });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.subscription).toMatchObject({
      id: SUB_ROW_ID,
      razorpaySubscriptionId: "sub_test_1",
      status: "CREATED",
      amount: 2500,
      currency: "INR",
      frequency: "QUARTERLY",
      shortUrl: "https://rzp.io/i/test",
    });
    expect(res.body.data.checkout).toEqual({
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: "sub_test_1",
    });
    expect(razorpay.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_notify: true,
      })
    );
  });

  test("POST /api/v1/billing/subscriptions returns 409 when a real ACTIVE commitment exists", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "block-1",
      userId: "user-bill-1",
      status: "ACTIVE",
      razorpaySubId: "sub_old",
    });
    razorpay.subscriptions.fetch.mockResolvedValue({
      id: "sub_old",
      status: "active",
      paid_count: 1,
    });
    prisma.subscription.update.mockResolvedValue({
      id: "block-1",
      userId: "user-bill-1",
      status: "ACTIVE",
      razorpaySubId: "sub_old",
    });

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 100, currency: "USD", frequency: "MONTHLY" });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("SUBSCRIPTION_ALREADY_ACTIVE");
    expect(razorpay.subscriptions.create).not.toHaveBeenCalled();
  });

  test("POST /api/v1/billing/subscriptions returns 409 when Razorpay is active but DB still CREATED", async () => {
    const staleRow = {
      id: SUB_ROW_ID,
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_stale",
      status: "CREATED",
      amountMinor: 10000,
      currency: "USD",
      frequency: "MONTHLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/stale",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    prisma.subscription.findFirst.mockImplementation(async (args) => {
      const inc = args?.where?.status?.in;
      if (!Array.isArray(inc)) return null;
      const openQuery = inc.includes("CREATED");
      const committedOnly = !inc.includes("CREATED");
      if (openQuery) {
        return staleRow;
      }
      if (committedOnly) {
        return { ...staleRow, status: "ACTIVE" };
      }
      return null;
    });

    razorpay.subscriptions.fetch.mockResolvedValue({
      id: "sub_stale",
      status: "active",
      paid_count: 1,
      current_start: 1700000000,
      current_end: 1702678400,
      charge_at: 1702678400,
    });

    prisma.subscription.update.mockResolvedValue({ ...staleRow, status: "ACTIVE" });

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 100, currency: "USD", frequency: "MONTHLY" });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("SUBSCRIPTION_ALREADY_ACTIVE");
    expect(razorpay.subscriptions.fetch).toHaveBeenCalledWith("sub_stale");
    expect(razorpay.subscriptions.create).not.toHaveBeenCalled();
  });

  test("POST /api/v1/billing/subscriptions returns existing CREATED sub idempotently when params match", async () => {
    const existingCreated = {
      id: SUB_ROW_ID,
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_existing",
      status: "CREATED",
      amountMinor: 10000,
      currency: "USD",
      frequency: "MONTHLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/broken",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    prisma.subscription.findFirst.mockImplementation(async (args) => {
      const statuses = args?.where?.status?.in;
      if (!Array.isArray(statuses)) return null;
      if (!statuses.includes("CREATED")) return null;
      return existingCreated;
    });

    razorpay.subscriptions.fetch.mockResolvedValue({
      id: "sub_existing",
      status: "created",
      paid_count: 0,
    });

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 100, currency: "USD", frequency: "MONTHLY" });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.subscription).toMatchObject({
      razorpaySubscriptionId: "sub_existing",
      status: "CREATED",
      amount: 100,
      currency: "USD",
      frequency: "MONTHLY",
    });
    expect(res.body.data.checkout).toEqual({
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: "sub_existing",
    });
    expect(razorpay.subscriptions.create).not.toHaveBeenCalled();
    expect(razorpay.subscriptions.cancel).not.toHaveBeenCalled();
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  test("POST /api/v1/billing/subscriptions abandons mismatched CREATED sub and creates a new one", async () => {
    const oldCreated = {
      id: "old-sub-id",
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_old_created",
      status: "CREATED",
      amountMinor: 99900,
      currency: "INR",
      frequency: "MONTHLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/old",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    prisma.subscription.findFirst.mockImplementation(async (args) => {
      const statuses = args?.where?.status?.in;
      if (!Array.isArray(statuses)) return null;
      if (!statuses.includes("CREATED")) return null;
      return oldCreated;
    });

    razorpay.subscriptions.fetch.mockResolvedValue({
      id: "sub_old_created",
      status: "created",
      paid_count: 0,
    });

    prisma.subscription.update.mockResolvedValue({
      ...oldCreated,
      status: "CANCELLED",
    });
    prisma.billingCustomer.findUnique.mockResolvedValue({
      id: CUST_ROW_ID,
      userId: "user-bill-1",
      razorpayCustomerId: "cust_test_1",
      email: "bill@example.com",
    });
    prisma.billingPlan.findUnique.mockResolvedValue({
      id: PLAN_ROW_ID,
      razorpayPlanId: "plan_test_1",
      amountMinor: 250000,
      currency: "INR",
      frequency: "QUARTERLY",
      period: "monthly",
      interval: 3,
    });
    prisma.subscription.create.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_new",
      status: "CREATED",
      amountMinor: 250000,
      currency: "INR",
      frequency: "QUARTERLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/new",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    razorpay.subscriptions.cancel.mockResolvedValue({
      id: "sub_old_created",
      status: "cancelled",
    });
    razorpay.subscriptions.create.mockResolvedValue({
      id: "sub_new",
      status: "created",
      paid_count: 0,
      short_url: "https://rzp.io/i/new",
      current_start: null,
      current_end: null,
      charge_at: null,
    });

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 2500, currency: "INR", frequency: "QUARTERLY" });

    expect(res.statusCode).toBe(201);
    expect(razorpay.subscriptions.cancel).toHaveBeenCalledWith(
      "sub_old_created",
      { cancel_at_cycle_end: 0 }
    );
    expect(razorpay.subscriptions.create).toHaveBeenCalledTimes(1);
    expect(res.body.data.subscription.razorpaySubscriptionId).toBe("sub_new");
    expect(res.body.data.checkout).toEqual({
      keyId: process.env.RAZORPAY_KEY_ID,
      subscriptionId: "sub_new",
    });
  });

  test("POST /api/v1/billing/subscriptions still creates new sub when abandoned remote cancel fails", async () => {
    const oldCreated = {
      id: "old-sub-id",
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_already_gone",
      status: "CREATED",
      amountMinor: 99900,
      currency: "INR",
      frequency: "MONTHLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/old",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    prisma.subscription.findFirst.mockImplementation(async (args) => {
      const statuses = args?.where?.status?.in;
      if (!Array.isArray(statuses)) return null;
      if (!statuses.includes("CREATED")) return null;
      return oldCreated;
    });

    razorpay.subscriptions.fetch.mockResolvedValue({
      id: "sub_already_gone",
      status: "created",
      paid_count: 0,
    });

    prisma.subscription.update.mockResolvedValue({
      ...oldCreated,
      status: "CANCELLED",
    });
    prisma.billingCustomer.findUnique.mockResolvedValue({
      id: CUST_ROW_ID,
      userId: "user-bill-1",
      razorpayCustomerId: "cust_test_1",
      email: "bill@example.com",
    });
    prisma.billingPlan.findUnique.mockResolvedValue({
      id: PLAN_ROW_ID,
      razorpayPlanId: "plan_test_1",
      amountMinor: 250000,
      currency: "INR",
      frequency: "QUARTERLY",
      period: "monthly",
      interval: 3,
    });
    prisma.subscription.create.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "user-bill-1",
      customerId: CUST_ROW_ID,
      planId: PLAN_ROW_ID,
      razorpaySubId: "sub_new_2",
      status: "CREATED",
      amountMinor: 250000,
      currency: "INR",
      frequency: "QUARTERLY",
      totalCount: 120,
      paidCount: 0,
      currentStart: null,
      currentEnd: null,
      nextChargeAt: null,
      cancelAtCycleEnd: false,
      cancelledAt: null,
      shortUrl: "https://rzp.io/i/new2",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    razorpay.subscriptions.cancel.mockRejectedValue(
      new Error("Subscription is already cancelled.")
    );
    razorpay.subscriptions.create.mockResolvedValue({
      id: "sub_new_2",
      status: "created",
      paid_count: 0,
      short_url: "https://rzp.io/i/new2",
    });

    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 2500, currency: "INR", frequency: "QUARTERLY" });

    expect(res.statusCode).toBe(201);
    expect(razorpay.subscriptions.cancel).toHaveBeenCalledWith(
      "sub_already_gone",
      { cancel_at_cycle_end: 0 }
    );
    expect(res.body.data.subscription.razorpaySubscriptionId).toBe("sub_new_2");
  });

  test("POST /api/v1/billing/subscriptions returns 400 for unknown JSON fields", async () => {
    const res = await request(app)
      .post("/api/v1/billing/subscriptions")
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ amount: 100, currency: "USD", frequency: "MONTHLY", extra: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("GET /api/v1/billing/subscriptions/me returns null when none", async () => {
    prisma.subscription.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/billing/subscriptions/me")
      .set("Authorization", `Bearer ${userToken()}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { subscription: null } });
  });

  test("POST /api/v1/billing/subscriptions/:id/cancel returns 200", async () => {
    const subRow = {
      id: SUB_ROW_ID,
      userId: "user-bill-1",
      razorpaySubId: "sub_test_1",
      status: "ACTIVE",
      amountMinor: 10000,
      currency: "USD",
      frequency: "MONTHLY",
      totalCount: 120,
      paidCount: 1,
      currentStart: new Date("2026-01-01T00:00:00.000Z"),
      currentEnd: new Date("2026-02-01T00:00:00.000Z"),
      nextChargeAt: null,
      cancelledAt: null,
      cancelAtCycleEnd: false,
      shortUrl: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      customer: {},
      plan: {},
    };

    prisma.subscription.findFirst.mockImplementation(async (args) => {
      const w = args?.where;
      if (w && w.id === SUB_ROW_ID && w.userId === "user-bill-1") return subRow;
      if (w && Array.isArray(w.status?.in)) return null;
      if (w && w.userId === "user-bill-1" && !w.status) return null;
      return null;
    });

    razorpay.subscriptions.cancel.mockResolvedValue({
      id: "sub_test_1",
      status: "cancelled",
      paid_count: 1,
      current_start: null,
      current_end: null,
    });

    prisma.subscription.update.mockResolvedValue({
      ...subRow,
      status: "CANCELLED",
      cancelAtCycleEnd: false,
      cancelledAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const res = await request(app)
      .post(`/api/v1/billing/subscriptions/${SUB_ROW_ID}/cancel`)
      .set("Authorization", `Bearer ${userToken()}`)
      .send({ cancelAtCycleEnd: false });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.subscription.status).toBe("CANCELLED");
    expect(razorpay.subscriptions.cancel).toHaveBeenCalledWith("sub_test_1", {
      cancel_at_cycle_end: 0,
    });
  });
});
