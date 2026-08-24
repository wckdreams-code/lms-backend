const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const authMiddleware = require("../middleware/auth");

router.post("/checkout", authMiddleware, transactionController.checkout);
router.post("/notification", transactionController.notificationWebhook); // Tanpa auth karena dari Midtrans
router.get("/:orderId/verify", authMiddleware, transactionController.verifyPayment);
router.post(
  "/admin/confirm",
  authMiddleware,
  transactionController.adminConfirm,
);
router.get(
  "/:transactionId/detail",
  authMiddleware,
  transactionController.getTransactionDetail,
);
router.patch(
  "/:transactionId/expired",
  authMiddleware,
  transactionController.markExpiredTransaction,
);

module.exports = router;
