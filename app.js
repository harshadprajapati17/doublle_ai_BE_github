import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import healthRoutes from "./routes/health.js";
import billingWebhookRoutes from "./routes/billingWebhook.js";
import billingRoutes from "./routes/billing.js";
import paymentRoutes from "./routes/payment.js";
import adminProgramsRoutes from "./routes/admin/programs.js";
import adminReferralsRoutes from "./routes/admin/referrals.js";
import adminDemoUsersRoutes from "./routes/admin/demoUsers.js";
import adminDemoAdminsRoutes from "./routes/admin/demoAdmins.js";
import referralRoutes from "./routes/referral.js";
import internalCommissionsRoutes from "./routes/internal/commissions.js";
import demoAuthRoutes from "./routes/demoAuth.js";
import demoAdminAuthRoutes from "./routes/demoAdminAuth.js";
import { isDemoAuthRuntimeEnabled } from "./config/demoAuthFlags.js";
import { swaggerSpec } from "./config/swagger.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

// Browser origins allowed to call the API. Comma-separated `CORS_ORIGINS` overrides the default localhost dev origin.
const corsAllowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: corsAllowedOrigins, credentials: true }));

// Razorpay webhooks require the raw body for HMAC verification (must run before express.json()).
app.use(
  "/api/v1/billing/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  billingWebhookRoutes
);

app.use(express.json());
if (process.env.REQUEST_LOGGING === "1") {
  app.use(morgan("tiny"));
}

app.get("/docs.json", (req, res) => {
  res.status(200).json(swaggerSpec);
});
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: { persistAuthorization: true },
  })
);

app.use("/health", healthRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/v1/admin/programs", adminProgramsRoutes);
app.use("/api/v1/admin/referrals", adminReferralsRoutes);
app.use("/api/v1/admin/demo-users", adminDemoUsersRoutes);
app.use("/api/v1/admin/demo-admins", adminDemoAdminsRoutes);
app.use("/api/v1/referral", referralRoutes);
app.use("/api/v1/internal/commissions", internalCommissionsRoutes);
if (isDemoAuthRuntimeEnabled()) {
  app.use("/api/v1/auth/demo", demoAuthRoutes);
  app.use("/api/v1/auth/demo-admin", demoAdminAuthRoutes);
}

app.use(notFoundHandler);
app.use(errorHandler);
