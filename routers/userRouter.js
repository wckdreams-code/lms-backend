const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth'); // Import middleware baru

// Tambahkan authMiddleware sebelum controller
router.get('/profile', authMiddleware, userController.getProfile);
router.post('/placement-test', authMiddleware, userController.completePlacementTest);

// Route Khusus Admin
router.get('/admin/all', authMiddleware, userController.adminGetAllUsers);
router.put('/admin/update/:id', authMiddleware, userController.adminUpdateUser);

module.exports = router;