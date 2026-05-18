process.env.ADMIN_JWT_SECRET = "test-admin-secret-for-jwt";
process.env.USER_JWT_SECRET = process.env.USER_JWT_SECRET || "test-user-secret-for-jwt";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
process.env.RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || "whsec_test_webhook_secret_change_me";
process.env.BILLING_MIN_AMOUNT_MAJOR = process.env.BILLING_MIN_AMOUNT_MAJOR || "1";
process.env.BILLING_MAX_AMOUNT_MAJOR = process.env.BILLING_MAX_AMOUNT_MAJOR || "124200";
process.env.BILLING_ALLOWED_CURRENCIES = process.env.BILLING_ALLOWED_CURRENCIES || "INR,USD";
process.env.BILLING_DEFAULT_TOTAL_COUNT = process.env.BILLING_DEFAULT_TOTAL_COUNT || "120";
// data/prismaClient.js asserts DATABASE_URL at module load; tests don't
// actually connect to Postgres (the client is replaced via unstable_mockModule).
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/test_db";
