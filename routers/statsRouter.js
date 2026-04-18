const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Public endpoint — tidak perlu auth karena hanya data agregat
router.get('/landing', statsController.getLandingStats);

module.exports = router;