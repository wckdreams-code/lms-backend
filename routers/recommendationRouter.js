const express = require("express");
const recommendationController = require("../controllers/recommendationController");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get(
  "/courses",
  authMiddleware,
  recommendationController.getRecommendedCourses,
);
router.get(
  "/courses/:courseId/similar",
  recommendationController.getSimilarCourses,
);
router.get(
  "/profile/preferences",
  authMiddleware,
  recommendationController.getUserPreferenceProfile,
);
router.post(
  "/profile/rebuild",
  authMiddleware,
  recommendationController.rebuildLearningProfile,
);
router.post(
  "/profile/preferences",
  authMiddleware,
  recommendationController.saveUserPreferenceProfile,
);

module.exports = router;
