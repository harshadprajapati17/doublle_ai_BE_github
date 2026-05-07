jest.mock("../config/razorpay", () => ({
  razorpay: {
    orders: {
      create: jest.fn(),
    },
  },
}));

const request = require("supertest");
const { razorpay } = require("../config/razorpay");

const { app } = require("../app");

describe("POST /api/payment/create-order", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  });

  test("returns 201 with key_id (and includes order)", async () => {
    razorpay.orders.create.mockResolvedValue({
      id: "order_123",
      entity: "order",
      amount: 5000,
      currency: "USD",
      status: "created",
    });

    const res = await request(app)
      .post("/api/payment/create-order")
      .send({ amount: 50, currency: "USD" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: {
        key_id: "rzp_test_key",
        order: {
          id: "order_123",
          entity: "order",
          amount: 5000,
          currency: "USD",
          status: "created",
        },
      },
    });
    expect(razorpay.orders.create).toHaveBeenCalledWith({
      amount: 5000,
      currency: "USD",
    });
  });

  test("accepts plan and forwards it as Razorpay notes", async () => {
    razorpay.orders.create.mockResolvedValue({
      id: "order_456",
      entity: "order",
      amount: 4000,
      currency: "USD",
      status: "created",
    });

    const res = await request(app)
      .post("/api/payment/create-order")
      .send({
        amount: 40,
        currency: "USD",
        plan: {
          commitment: "monthly",
          mode: "design",
          requests: 2,
          monthly: 40,
          months: 1,
          total: 40,
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("data.key_id", "rzp_test_key");
    expect(res.body).toHaveProperty("data.order.id", "order_456");
    expect(razorpay.orders.create).toHaveBeenCalledWith({
      amount: 4000,
      currency: "USD",
      notes: {
        plan_commitment: "monthly",
        plan_mode: "design",
        plan_requests: "2",
        plan_monthly: "40",
        plan_months: "1",
        plan_total: "40",
      },
    });
  });

  test("returns 400 if plan budget does not match amount", async () => {
    const res = await request(app)
      .post("/api/payment/create-order")
      .send({
        amount: 40,
        currency: "USD",
        plan: {
          commitment: "monthly",
          mode: "design",
          requests: 2,
          monthly: 40,
          months: 1,
          total: 39,
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
  });

  test("returns 400 for invalid body", async () => {
    const res = await request(app)
      .post("/api/payment/create-order")
      .send({ amount: -1, currency: "US" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error.code", "VALIDATION_ERROR");
  });

  test("returns 502 with safe provider details when Razorpay rejects", async () => {
    razorpay.orders.create.mockRejectedValue({
      statusCode: 400,
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "Currency is not supported.",
      },
    });

    const res = await request(app).post("/api/payment/create-order").send({
      amount: 21600,
      currency: "USD",
      plan: {
        commitment: "yearly",
        mode: "design",
        requests: 1,
        monthly: 1800,
        months: 12,
        total: 21600,
      },
    });

    expect(res.statusCode).toBe(502);
    expect(res.body).toHaveProperty("error.code", "PAYMENT_PROVIDER_ERROR");
    expect(res.body).toHaveProperty("error.details.provider", "razorpay");
    expect(res.body).toHaveProperty("error.details.providerStatus", 400);
    expect(res.body).toHaveProperty("error.details.providerCode", "BAD_REQUEST_ERROR");
  });
});

