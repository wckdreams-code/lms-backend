const express = require("express");
const multer = require("multer");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminOfflineRegistrationController = require("../controllers/adminOfflineRegistrationController");
const adminOfflinePaymentController = require("../controllers/adminOfflinePaymentController");
const landingController = require("../controllers/landingController");
const authMiddleware = require("../middleware/auth");
const adminGuard = require("../middleware/adminGuard");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

// Semua route admin wajib login + role admin.
router.use(authMiddleware, adminGuard);

router.get("/accounts", adminController.getAccounts);
router.post("/teachers", adminController.createTeacher);
router.get("/users/:userId", adminController.getAccountDetail);
router.patch("/users/:userId", adminController.updateAccount);
router.patch(
  "/teachers/:teacherId/permissions",
  adminController.updateTeacherPermissions,
);
router.patch("/users/:userId/password", adminController.updateUserPassword);
router.delete("/users/:userId", adminController.deleteAccount);
router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/dashboard/sales", adminController.getSalesChart);
router.get("/transactions", adminController.getTransactions);

router.get("/courses", adminController.getCourses);
router.post(
  "/courses",
  upload.single("thumbnail"),
  adminController.createCourse,
);

router.patch(
  "/courses/:courseId",
  upload.single("thumbnail"),
  adminController.updateCourse,
);
router.patch("/courses/:courseId/status", adminController.updateCourseStatus);
router.delete("/courses/:courseId", adminController.deleteCourse);

router.get("/transactions/stats", adminController.getTransactionStats);

// ── Sertifikat ──
router.get("/certificates", adminController.getCertificates);
router.post(
  "/certificates/:certificateId/file",
  upload.single("certificate"),
  adminController.uploadCertificateFile,
);
// ── Landing Page Management ──
router.get("/landing/hero", landingController.getHero);
router.patch(
  "/landing/hero",
  upload.single("banner"),
  landingController.updateHero,
);
router.get("/landing/trust", landingController.getTrust);
router.patch("/landing/trust", landingController.updateTrust);
router.get("/landing/features", landingController.getFeatures);
router.patch("/landing/features", landingController.updateFeatures);
router.get("/landing/promos", landingController.getAllPromos);
router.post(
  "/landing/promos",
  upload.single("image"),
  landingController.createPromo,
);
router.patch(
  "/landing/promos/:id",
  upload.single("image"),
  landingController.updatePromo,
);
router.delete("/landing/promos/:id", landingController.deletePromo);
router.get("/landing/alumni", landingController.getAllAlumni);
router.post(
  "/landing/alumni",
  upload.single("photo"),
  landingController.createAlumni,
);
router.patch(
  "/landing/alumni/:id",
  upload.single("photo"),
  landingController.updateAlumni,
);
router.delete("/landing/alumni/:id", landingController.deleteAlumni);
router.get("/landing/branch", landingController.getBranch);
router.patch(
  "/landing/branch",
  upload.single("photo"),
  landingController.updateBranch,
);
router.get("/landing/faqs", landingController.getAllFaqs);
router.post("/landing/faqs", landingController.createFaq);
router.patch("/landing/faqs/:id", landingController.updateFaq);
router.delete("/landing/faqs/:id", landingController.deleteFaq);
router.get("/landing/cta", landingController.getCta);
router.patch("/landing/cta", landingController.updateCta);

router.get("/certificate-templates", adminController.getCertificateTemplates);
router.post(
  "/certificate-templates",
  upload.single("template"),
  adminController.upsertCertificateTemplate,
);


// Offline Registrations
router.get("/offline-registrations", adminOfflineRegistrationController.getAllOfflineRegistrations);
router.get("/offline-registrations/:id", adminOfflineRegistrationController.getOfflineRegistrationDetail);
router.patch("/offline-registrations/:id", adminOfflineRegistrationController.updateOfflineRegistration);
router.post("/offline-registrations/:id/payment", adminOfflinePaymentController.createOfflinePayment);

module.exports = router;


