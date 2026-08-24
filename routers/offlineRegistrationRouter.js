const express = require('express');
const router = express.Router();
const offlineRegistrationController = require('../controllers/offlineRegistrationController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, offlineRegistrationController.create);
router.get('/my', authMiddleware, offlineRegistrationController.getMyRegistrations);
router.get('/:id', authMiddleware, offlineRegistrationController.getById);

module.exports = router;
