const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register
router.post('/register', authController.register);

// Login User
router.post('/login', authController.login);

// Login Guru / Admin
router.post('/staff/login', authController.staffLogin);


module.exports = router;