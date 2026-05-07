const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoutes = require("./routes/health");
const paymentRoutes = require("./routes/payment");

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.REQUEST_LOGGING === "1") {
  app.use(morgan("tiny"));
}

app.use("/health", healthRoutes);
app.use("/api/payment", paymentRoutes);

module.exports = { app };

