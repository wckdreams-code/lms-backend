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

// Tambahan Endpoint Profile
router.get('/my-courses', authMiddleware, userController.getMyCourses);
router.get('/my-certificates', authMiddleware, userController.getMyCertificates);

router.get('/transactions', authMiddleware, userController.getTransactionHistory);
router.put('/update', authMiddleware, userController.updateProfile);
router.delete('/delete', authMiddleware, userController.deleteAccount);

module.exports = router;