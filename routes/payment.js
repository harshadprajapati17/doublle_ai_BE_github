const { Router } = require("express");

const { createOrder, verifyPayment } = require("../controllers/paymentController");

const router = Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);

module.exports = router;

