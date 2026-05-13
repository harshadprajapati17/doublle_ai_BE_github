process.env.ADMIN_JWT_SECRET = "test-admin-secret-for-jwt";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
// data/prismaClient.js asserts DATABASE_URL at module load; tests don't
// actually connect to Postgres (the client is replaced via unstable_mockModule).
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/test_db";
