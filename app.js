import express from "express";
import cors from "cors";
import morgan from "morgan";

import healthRoutes from "./routes/health.js";
import paymentRoutes from "./routes/payment.js";
import adminProgramsRoutes from "./routes/admin/programs.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export const app = express();

app.use(cors());
app.use(express.json());
if (process.env.REQUEST_LOGGING === "1") {
  app.use(morgan("tiny"));
}

app.use("/health", healthRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/v1/admin/programs", adminProgramsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
