const express = require('express');
const router = express.Router();
const offlineScheduleController = require('../controllers/offlineScheduleController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, offlineScheduleController.create);
router.get('/:registrationId', authMiddleware, offlineScheduleController.getByRegistrationId);

module.exports = router;
