const courseModel = require('../models/courseModel');
const { convertLevelToDifficulty, isValidLevel } = require('../utils/levelMapping');

exports.listCourses = async (req, res) => {
  try {
    const { search, category, level, delivery_type, learning_type } = req.query;
    const courses = await courseModel.getAllCourses({
      search,
      category,
      level,
      delivery_type,
      learning_type,
    });
    res.status(200).json({ status: 'success', data: courses });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await courseModel.getCourseDetail(id);
    res.status(200).json({ status: 'success', data: course });
  } catch (error) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

exports.addCourse = async (req, res) => {
  try {
    if (req.user.role === 'siswa') {
      return res.status(403).json({ message: 'Forbidden: Siswa tidak bisa buat kursus' });
    }
    if (req.body.level) {
      if (!isValidLevel(req.body.level)) {
        return res.status(400).json({ status: 'error', message: 'Level tidak valid' });
      }
      req.body.difficulty_score = convertLevelToDifficulty(req.body.level);
    }
    const newCourse = await courseModel.createCourse(req.body);
    res.status(201).json({ status: 'success', data: newCourse });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    if (req.user.role === 'siswa') return res.status(403).json({ message: 'Akses ditolak' });
    if (req.body.level) {
      if (!isValidLevel(req.body.level)) {
        return res.status(400).json({ status: 'error', message: 'Level tidak valid' });
      }
      req.body.difficulty_score = convertLevelToDifficulty(req.body.level);
    }
    const { id } = req.params;
    const updated = await courseModel.updateCourse(id, req.body);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    if (req.user.role === 'siswa') return res.status(403).json({ message: 'Akses ditolak' });
    const { id } = req.params;
    await courseModel.deleteCourse(id);
    res.status(200).json({ status: 'success', message: 'Kursus berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ─────────────────────────────────────────────────────────
//  CONTROLLER RUANG BELAJAR (LEARN)
// ─────────────────────────────────────────────────────────

// Mengambil seluruh data ruang belajar (Materi, Progres, Soal)
exports.getLearnData = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    // Validasi kepemilikan kursus
    const isOwned = await courseModel.checkOwnership(userId, courseId);
    if (!isOwned) {
        return res.status(403).json({ status: 'error', message: 'Anda belum membeli kursus ini atau pembayaran belum sukses.' });
    }

    // Ambil semua data secara paralel
    const [course, progress, questions, examSettings, existingCert, lastAttempt] = await Promise.all([
        courseModel.getCourseDetail(courseId),
        courseModel.getStudentProgress(userId, courseId),
        courseModel.getCourseQuestions(courseId),
        courseModel.getCourseExamSettings(courseId),
        courseModel.getExistingCertificate(userId, courseId),
        courseModel.getLastExamAttempt(userId, courseId)
    ]);
    
    console.log("EXAM SETTINGS:", examSettings);
    const examPassed = !!existingCert;

    res.status(200).json({ status: 'success', data: { course, progress, questions, examSettings, examPassed, lastAttempt } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ status: 'error', message: error.message });
  }
};

// Menyimpan progres materi / kuis
exports.saveModuleProgress = async (req, res) => {
  try {
    const { type, item_id, score } = req.body;
    await courseModel.saveProgress(req.user.id, req.params.id, type, item_id, score);
    res.status(200).json({ status: 'success', message: 'Progres disimpan' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Mengirim hasil ujian akhir & buat sertifikat
exports.submitFinalExam = async (req, res) => {
  try {
    const { score, duration_seconds } = req.body;
    const userId = req.user.id;
    const courseId = req.params.id;
    const MIN_SCORE = 70;

    // Hitung attempt number
    const lastAttempt = await courseModel.getLastExamAttempt(userId, courseId);
    const attemptNumber = (lastAttempt?.attempt_number || 0) + 1;

    const isPassed = score >= MIN_SCORE;
    let nextAttemptAt = null;

    if (!isPassed) {
      // Cooldown 1 jam setelah gagal
      nextAttemptAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }

    // Simpan exam attempt
    await courseModel.createExamAttempt({
      userId,
      courseId,
      score,
      isPassed,
      attemptNumber,
      durationSeconds: duration_seconds || 0,
      nextAttemptAt
    });

    if (isPassed) {
        const cert = await courseModel.generateCertificate(userId, courseId);
        return res.status(200).json({
          status: 'success',
          message: 'Lulus!',
          passed: true,
          certificate: cert,
          attempt: { attemptNumber, score, isPassed }
        });
    } else {
        return res.status(200).json({
          status: 'success',
          message: 'Belum lulus',
          passed: false,
          attempt: { attemptNumber, score, isPassed, nextAttemptAt }
        });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};