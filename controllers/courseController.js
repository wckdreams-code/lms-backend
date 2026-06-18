const courseModel = require('../models/courseModel');

exports.listCourses = async (req, res) => {
  try {
    const { search, category } = req.query;
    const courses = await courseModel.getAllCourses({ search, category });
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
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.addCourse = async (req, res) => {
  try {
    if (req.user.role === 'siswa') {
      return res.status(403).json({ message: 'Forbidden: Siswa tidak bisa buat kursus' });
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
    const [course, progress, questions] = await Promise.all([
        courseModel.getCourseDetail(courseId),
        courseModel.getStudentProgress(userId, courseId),
        courseModel.getCourseQuestions(courseId)
    ]);

    res.status(200).json({ status: 'success', data: { course, progress, questions } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
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
    const { score } = req.body;
    // Standar kelulusan misal 70
    if (score >= 70) {
        const cert = await courseModel.generateCertificate(req.user.id, req.params.id);
        return res.status(200).json({ status: 'success', message: 'Lulus!', passed: true, certificate: cert });
    } else {
        return res.status(200).json({ status: 'success', message: 'Belum lulus', passed: false });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};