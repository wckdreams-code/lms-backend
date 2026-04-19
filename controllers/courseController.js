const courseModel = require('../models/courseModel');

exports.listCourses = async (req, res) => {
  try {
    // Tangkap query string dari URL (contoh: ?search=inggris&category=Bahasa)
    const { search, category } = req.query;
    
    // Kirim ke model
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
    // Pastikan hanya admin/guru yang bisa tambah
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