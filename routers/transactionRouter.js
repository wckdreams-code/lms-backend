const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');

router.post('/checkout', authMiddleware, transactionController.checkout);
router.post('/notification', transactionController.notificationWebhook); // Tanpa auth karena dari Midtrans
router.post('/admin/confirm', authMiddleware, transactionController.adminConfirm);

module.exports = router;