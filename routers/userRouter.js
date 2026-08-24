const express = require("express");
const multer = require("multer");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // maksimal 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("File harus berupa gambar"));
    }
    cb(null, true);
  },
});

// Tambahkan authMiddleware sebelum controller
router.get("/profile", authMiddleware, userController.getProfile);
router.post(
  "/placement-test",
  authMiddleware,
  userController.completePlacementTest,
);

// Route Khusus Admin
router.get("/admin/all", authMiddleware, userController.adminGetAllUsers);
router.put("/admin/update/:id", authMiddleware, userController.adminUpdateUser);

// Endpoint Profile
router.get("/my-courses", authMiddleware, userController.getMyCourses);
router.get(
  "/my-certificates",
  authMiddleware,
  userController.getMyCertificates,
);
router.get(
  "/transactions",
  authMiddleware,
  userController.getTransactionHistory,
);

router.put("/update", authMiddleware, userController.updateProfile);
router.post(
  "/update-avatar",
  authMiddleware,
  upload.single("avatar"),
  userController.updateAvatar,
);
router.put("/change-password", authMiddleware, userController.changePassword);

router.delete("/delete", authMiddleware, userController.deleteAccount);

module.exports = router;
