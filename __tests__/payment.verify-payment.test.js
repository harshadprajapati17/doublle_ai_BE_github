import { jest } from "@jest/globals";
import crypto from "node:crypto";

jest.unstable_mockModule("../config/razorpay.js", () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
    },
  },
}));

const request = (await import("supertest")).default;
const { app } = await import("../app.js");

describe("POST /api/payment/verify-payment", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  test("returns success true for a valid signature", async () => {
    const razorpay_order_id = "order_123";
    const razorpay_payment_id = "pay_456";
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const razorpay_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");

    const res = await request(app).post("/api/payment/verify-payment").send({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { success: true } });
  });

  test("returns success false for an invalid signature", async () => {
    const res = await request(app).post("/api/payment/verify-payment").send({
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_456",
      razorpay_signature: "not_a_valid_signature",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ data: { success: false } });
  });

  test("returns 400 for invalid body", async () => {
    const res = await request(app).post("/api/payment/verify-payment").send({
      razorpay_order_id: "",
      razorpay_payment_id: 123,
      razorpay_signature: "",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
  });

  test("returns 400 for unknown fields", async () => {
    const res = await request(app).post("/api/payment/verify-payment").send({
      razorpay_order_id: "order_123",
      razorpay_payment_id: "pay_456",
      razorpay_signature: "sig",
      extra: "nope",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
  });
});
