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
});
