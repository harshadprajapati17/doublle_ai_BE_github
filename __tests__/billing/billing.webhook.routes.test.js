import crypto from "node:crypto";
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../data/prismaClient.js", () =>
  import("../../data/__mocks__/prismaClient.js")
);

const request = (await import("supertest")).default;
const { app } = await import("../../app.js");
const { prisma } = await import("../../data/prismaClient.js");

const SUB_ROW_ID = "550e8400-e29b-41d4-a716-446655440003";

function signRazorpayBody(rawUtf8) {
  const buf = Buffer.from(rawUtf8, "utf8");
  const sig = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(buf)
    .digest("hex");
  return { sig };
}

describe("POST /api/v1/billing/webhooks/razorpay", () => {
  beforeEach(() => {
    prisma.webhookEvent.findUnique.mockReset();
    prisma.webhookEvent.create.mockReset();
    prisma.webhookEvent.update.mockReset();
    prisma.subscription.findUnique.mockReset();
    prisma.subscription.update.mockReset();
    prisma.subscriptionPayment.upsert.mockReset();
    prisma.subscriptionPayment.count.mockReset();
    prisma.referral.findFirst.mockReset();
    prisma.referral.update.mockReset();
    prisma.program.findUnique.mockReset();
    prisma.commission.findUnique.mockReset();
    prisma.commission.create.mockReset();
    prisma.commission.findMany.mockReset();
    prisma.subscriptionPayment.aggregate.mockReset();
    prisma.commission.findMany.mockResolvedValue([]);
  });

  test("returns 200 duplicate when event already processed", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: "w1",
      eventId: "evt_1",
      processedAt: new Date("2026-01-10T00:00:00.000Z"),
    });

    const raw = JSON.stringify({
      id: "evt_1",
      event: "subscription.activated",
      payload: {},
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual({ received: true, duplicate: true });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
  });

  test("returns 401 when signature is invalid", async () => {
    const raw = JSON.stringify({
      id: "evt_2",
      event: "subscription.activated",
      payload: {},
    });
    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", "deadbeef")
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("WEBHOOK_SIGNATURE_INVALID");
  });

  test("processes subscription.activated and persists webhook + subscription update", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-row-1",
      eventId: "evt_act",
      processedAt: null,
    });
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      razorpaySubId: "sub_live_1",
      status: "CREATED",
      currentStart: null,
      currentEnd: null,
    });
    prisma.subscription.update.mockResolvedValue({});
    prisma.webhookEvent.update.mockResolvedValue({});

    const raw = JSON.stringify({
      id: "evt_act",
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_live_1",
            status: "active",
            paid_count: 0,
            current_start: 1704067200,
            current_end: 1706745600,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.received).toBe(true);
    expect(prisma.subscription.update).toHaveBeenCalled();
    expect(prisma.webhookEvent.update).toHaveBeenCalled();
  });

  test("persists webhook when JSON omits root id but X-Razorpay-Event-Id header is set", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-row-h",
      eventId: "evt_from_header",
      processedAt: null,
    });
    prisma.webhookEvent.update.mockResolvedValue({});
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      razorpaySubId: "sub_live_1",
      status: "CREATED",
      currentStart: null,
      currentEnd: null,
    });
    prisma.subscription.update.mockResolvedValue({});

    const raw = JSON.stringify({
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_live_1",
            status: "active",
            paid_count: 0,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("X-Razorpay-Event-Id", "evt_from_header")
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "razorpay",
        eventId: "evt_from_header",
        eventType: "subscription.activated",
      }),
    });
    expect(prisma.subscription.update).toHaveBeenCalled();
  });

  test("subscription.charged with captured payment applies referee benefit once", async () => {
    const paymentRowId = "pay-row-uuid-1";
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-charged",
      eventId: "evt_charged",
      processedAt: null,
    });
    prisma.webhookEvent.update.mockResolvedValue({});
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "referee-user-1",
      razorpaySubId: "sub_live_1",
      currency: "USD",
    });
    prisma.subscriptionPayment.upsert.mockResolvedValue({
      id: paymentRowId,
      status: "CAPTURED",
    });
    prisma.referral.findFirst.mockResolvedValue({
      id: "ref-1",
      refereeUserId: "referee-user-1",
      programId: "prog-1",
      status: "ACTIVE",
      refereeCreditApplied: false,
    });
    prisma.subscriptionPayment.count.mockResolvedValue(1);
    prisma.program.findUnique.mockResolvedValue({
      id: "prog-1",
      refereeBenefitType: "CREDIT",
      refereeBenefitValue: { toString: () => "10" },
      currency: "USD",
    });
    prisma.referral.update.mockResolvedValue({});
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue({
      id: "ref-1",
      refereeUserId: "referee-user-1",
      programId: "prog-1",
      status: "ACTIVE",
      refereeCreditApplied: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    prisma.program.findUnique.mockResolvedValue({
      id: "prog-1",
      refereeBenefitType: "NONE",
      rewardPct: { toString: () => "5" },
      holdPeriodDays: 30,
      refereeMinSpendAmount: null,
      refereeMinSpendWindowDays: null,
    });
    prisma.subscriptionPayment.count.mockResolvedValue(1);
    prisma.commission.create.mockResolvedValue({ id: "comm-1" });

    const raw = JSON.stringify({
      id: "evt_charged",
      event: "subscription.charged",
      payload: {
        subscription: { entity: { id: "sub_live_1", status: "active" } },
        payment: {
          entity: {
            id: "pay_live_1",
            subscription_id: "sub_live_1",
            amount: 99900,
            currency: "inr",
            status: "captured",
            created_at: 1704067200,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(prisma.referral.update).toHaveBeenCalledWith({
      where: { id: "ref-1" },
      data: expect.objectContaining({ refereeCreditApplied: true }),
    });
    expect(prisma.commission.create).toHaveBeenCalledTimes(1);
  });

  test("subscription.charged syncs payment when subscription_id only on subscription block", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-charged-no-sub-on-pay",
      eventId: "evt_charged_no_sub_on_pay",
      processedAt: null,
    });
    prisma.webhookEvent.update.mockResolvedValue({});
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "referee-user-1",
      razorpaySubId: "sub_live_1",
      currency: "USD",
    });
    prisma.subscriptionPayment.upsert.mockResolvedValue({
      id: "pay-row-uuid-2",
      status: "CAPTURED",
      amountMinor: 99900,
      currency: "USD",
    });
    prisma.commission.findUnique.mockResolvedValue(null);
    prisma.referral.findFirst.mockResolvedValue(null);

    const raw = JSON.stringify({
      id: "evt_charged_no_sub_on_pay",
      event: "subscription.charged",
      payload: {
        subscription: { entity: { id: "sub_live_1", status: "active" } },
        payment: {
          entity: {
            id: "pay_live_2",
            amount: 99900,
            currency: "inr",
            status: "captured",
            created_at: 1704067200,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(prisma.subscriptionPayment.upsert).toHaveBeenCalled();
    expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
      where: { razorpaySubId: "sub_live_1" },
    });
  });

  test("payment.captured replay does not double-accrue commission", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-comm-dup",
      eventId: "evt_comm_dup",
      processedAt: null,
    });
    prisma.webhookEvent.update.mockResolvedValue({});
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "referee-user-1",
      razorpaySubId: "sub_live_1",
      currency: "USD",
    });
    prisma.subscriptionPayment.upsert.mockResolvedValue({
      id: "pay-row-uuid-1",
      status: "CAPTURED",
      amountMinor: 99900,
      currency: "USD",
    });
    prisma.commission.findUnique.mockResolvedValue({ id: "comm-existing" });
    prisma.referral.findFirst.mockResolvedValue(null);

    const raw = JSON.stringify({
      id: "evt_comm_dup",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_live_1",
            subscription_id: "sub_live_1",
            amount: 99900,
            currency: "inr",
            status: "captured",
            created_at: 1704067200,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(prisma.commission.create).not.toHaveBeenCalled();
  });

  test("payment.captured replay does not double-apply referee benefit", async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.webhookEvent.create.mockResolvedValue({
      id: "web-replay",
      eventId: "evt_replay",
      processedAt: null,
    });
    prisma.webhookEvent.update.mockResolvedValue({});
    prisma.subscription.findUnique.mockResolvedValue({
      id: SUB_ROW_ID,
      userId: "referee-user-1",
      razorpaySubId: "sub_live_1",
      currency: "USD",
    });
    prisma.subscriptionPayment.upsert.mockResolvedValue({
      id: "pay-row-uuid-1",
      status: "CAPTURED",
    });
    prisma.referral.findFirst.mockResolvedValue(null);

    const raw = JSON.stringify({
      id: "evt_replay",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_live_1",
            subscription_id: "sub_live_1",
            amount: 99900,
            currency: "inr",
            status: "captured",
            created_at: 1704067200,
          },
        },
      },
    });
    const { sig } = signRazorpayBody(raw);

    const res = await request(app)
      .post("/api/v1/billing/webhooks/razorpay")
      .set("X-Razorpay-Signature", sig)
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.statusCode).toBe(200);
    expect(prisma.referral.update).not.toHaveBeenCalled();
    expect(prisma.subscriptionPayment.count).not.toHaveBeenCalled();
  });
});
