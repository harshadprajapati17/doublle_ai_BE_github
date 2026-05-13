const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoutes = require("./routes/health");
const paymentRoutes = require("./routes/payment");
const adminProgramsRoutes = require("./routes/admin/programs");
const { notFoundHandler } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

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

module.exports = { app };

