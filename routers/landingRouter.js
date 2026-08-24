const express = require("express");
const router = express.Router();
const landingController = require("../controllers/landingController");

// Endpoint publik — dibaca oleh landing page, tanpa auth (data agregat/marketing).
router.get("/hero", landingController.getHero);
router.get("/trust", landingController.getTrust);
router.get("/features", landingController.getFeatures);
router.get("/promos", landingController.getActivePromos);
router.get("/alumni", landingController.getVisibleAlumni);
router.get("/branch", landingController.getBranch);
router.get("/faqs", landingController.getVisibleFaqs);
router.get("/cta", landingController.getCta);

module.exports = router;
