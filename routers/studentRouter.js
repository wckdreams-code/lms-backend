const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const studentController = require("../controllers/studentController");

router.get(
  "/offline-schedules",
  authMiddleware,
  studentController.getOfflineSchedules,
);
router.get(
  "/offline-schedule",
  authMiddleware,
  studentController.getOfflineSchedules,
);

module.exports = router;
