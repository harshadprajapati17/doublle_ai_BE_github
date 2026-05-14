process.env.ADMIN_JWT_SECRET = "test-admin-secret-for-jwt";
process.env.ADMIN_JWT_SECRET_2 = process.env.ADMIN_JWT_SECRET_2 || "test-admin-secret-2-for-jwt";
process.env.ADMIN_JWT_SECRET_3 = process.env.ADMIN_JWT_SECRET_3 || "test-admin-secret-3-for-jwt";
process.env.USER_JWT_SECRET = process.env.USER_JWT_SECRET || "test-user-secret-for-jwt";
process.env.USER_JWT_SECRET_2 = process.env.USER_JWT_SECRET_2 || "test-user-secret-2-for-jwt";
process.env.USER_JWT_SECRET_3 = process.env.USER_JWT_SECRET_3 || "test-user-secret-3-for-jwt";
process.env.REFERRAL_PUBLIC_BASE_URL =
  process.env.REFERRAL_PUBLIC_BASE_URL || "http://localhost:3000";
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
// data/prismaClient.js asserts DATABASE_URL at module load; tests don't
// actually connect to Postgres (the client is replaced via unstable_mockModule).
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/test_db";
