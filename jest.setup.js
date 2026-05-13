process.env.ADMIN_JWT_SECRET = "test-admin-secret-for-jwt";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";

jest.mock("./data/prismaClient", () => require("./data/__mocks__/prismaClient"));
