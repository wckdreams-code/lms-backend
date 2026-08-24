const adminModel = require("../models/adminModel");
const { ALLOWED_LEVELS, LEVEL_DIFFICULTY_MAP, convertLevelToDifficulty, isValidLevel } = require("../utils/levelMapping");

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await adminModel.getAllAccounts();

    res.status(200).json({
      status: "success",
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        status: "error",
        message: "Nama, email, dan password wajib diisi.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password minimal 8 karakter.",
      });
    }

    const teacher = await adminModel.createTeacher({
      email,
      password,
      full_name,
    });

    res.status(201).json({
      status: "success",
      message: "Akun guru berhasil dibuat.",
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getAccountDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    const detail = await adminModel.getAccountDetail(userId);

    res.status(200).json({
      status: "success",
      data: detail,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, password } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Nama lengkap wajib diisi.",
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password minimal 8 karakter.",
      });
    }

    const account = await adminModel.updateAccount(userId, {
      full_name: full_name.trim(),
      password,
    });

    res.status(200).json({
      status: "success",
      message: "Akun berhasil diperbarui.",
      data: account,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateTeacherPermissions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const permission = await adminModel.updateTeacherPermissions(
      teacherId,
      req.body,
    );

    res.status(200).json({
      status: "success",
      message: "Permission guru berhasil diperbarui.",
      data: permission,
    });
  } catch (error) {
    console.error("UPDATE TEACHER PERMISSION ERROR:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password minimal 8 karakter.",
      });
    }

    await adminModel.updateUserPassword(userId, password);

    res.status(200).json({
      status: "success",
      message: "Password berhasil diperbarui.",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { userId } = req.params;

    await adminModel.deleteAccount(userId);

    res.status(200).json({
      status: "success",
      message: "Akun berhasil dihapus.",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();

    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getSalesChart = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const chartData = await adminModel.getSalesChart(days);

    res.status(200).json({
      status: "success",
      data: chartData,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await adminModel.getTransactions();

    res.status(200).json({
      status: "success",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courses = await adminModel.getCourses();

    res.status(200).json({
      status: "success",
      data: courses,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

const COURSE_CATEGORIES = ["Komputer", "Bahasa Inggris", "Bahasa Asing", "Desain", "Programming", "Marketing", "Akuntansi", "Bimbingan Belajar"];
const DELIVERY_TYPES = ["Online", "Offline"];
const LEARNING_TYPES = ["Regular", "Private"];

function validateCourseInput(body) {
  if (!body.title || body.price === undefined) return "Judul dan harga kursus wajib diisi.";
  if (!COURSE_CATEGORIES.includes(body.category)) return "Kategori kursus tidak valid.";
  if (!isValidLevel(body.level)) return "Level kursus tidak valid.";
  if (!DELIVERY_TYPES.includes(body.delivery_type)) return "Metode pelaksanaan harus Online atau Offline.";
  if (!LEARNING_TYPES.includes(body.learning_type)) return "Jenis kelas harus Regular atau Private.";
  body.difficulty_score = convertLevelToDifficulty(body.level);
  return null;
}

exports.createCourse = async (req, res) => {
  try {
    const validationError = validateCourseInput(req.body);

    if (validationError) {
      return res.status(400).json({
        status: "error",
        message: validationError,
      });
    }

    const course = await adminModel.createCourse({
      body: req.body,
      file: req.file,
    });

    res.status(201).json({
      status: "success",
      message: "Kursus berhasil dibuat.",
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const validationError = validateCourseInput(req.body);

    if (validationError) {
      return res.status(400).json({
        status: "error",
        message: validationError,
      });
    }

    const course = await adminModel.updateCourse(courseId, {
      body: req.body,
      file: req.file,
    });

    res.status(200).json({
      status: "success",
      message: "Kursus berhasil diperbarui.",
      data: course,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.updateCourseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status } = req.body;

    if (!["draft", "published", "archived"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status kursus tidak valid.",
      });
    }

    const course = await adminModel.updateCourseStatus(courseId, status);

    res.status(200).json({
      status: "success",
      message: "Status kursus berhasil diperbarui.",
      data: course,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Guard: jangan langsung hapus jika course masih punya data siswa aktif.
    // FE harus mengirim ?force=1 setelah admin mengonfirmasi warning.
    const studentData = await adminModel.getCourseStudentData(courseId);
    const hasActiveData =
      studentData.successTransactions > 0 || studentData.progressRows > 0;

    if (hasActiveData && req.query.force !== "1") {
      return res.status(409).json({
        status: "warning",
        message: "Course masih memiliki data siswa aktif. Apakah ingin melanjutkan?",
        data: {
          success_transactions: studentData.successTransactions,
          progress_rows: studentData.progressRows,
        },
      });
    }

    await adminModel.deleteCourse(courseId);

    res.json({
      status: "success",
      message: "Kursus berhasil dihapus.",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getTransactionStats = async (req, res) => {
  try {
    const stats = await adminModel.getTransactionStats();

    res.status(200).json({
      status: "success",
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────
//  SERTIFIKAT
// ─────────────────────────────────────────────────────────

exports.getCertificates = async (req, res) => {
  try {
    const { status } = req.query;
    const certificates = await adminModel.getCertificates(status);

    res.status(200).json({ status: "success", data: certificates });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.uploadCertificateFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "File sertifikat (PDF) wajib diunggah.",
      });
    }

    const { certificateId } = req.params;
    const certificate = await adminModel.uploadCertificateFile(
      certificateId,
      req.file,
      req.user.id,
    );

    res.status(200).json({
      status: "success",
      message: "Sertifikat berhasil diterbitkan.",
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getCertificateTemplates = async (req, res) => {
  try {
    const templates = await adminModel.getCertificateTemplates();

    res.status(200).json({ status: "success", data: templates });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.upsertCertificateTemplate = async (req, res) => {
  try {
    if (!req.body.course_id) {
      return res.status(400).json({
        status: "error",
        message: "Course ID wajib dikirim.",
      });
    }
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "File template (PDF) wajib diunggah.",
      });
    }

    const template = await adminModel.upsertCertificateTemplate(
      req.body.course_id,
      req.file,
      req.user.id,
    );

    res.status(200).json({
      status: "success",
      message: "Template sertifikat berhasil disimpan.",
      data: template,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
