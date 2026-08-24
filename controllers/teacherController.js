const teacherModel = require('../models/teacherModel');

async function checkPermission(teacherId, action) {
  const permissions = await teacherModel.getTeacherPermissions(teacherId);

  if (action === 'create' && !permissions.can_create_material) {
    throw new Error('Anda tidak memiliki akses create.');
  }

  if (action === 'update' && !permissions.can_update_material) {
    throw new Error('Anda tidak memiliki akses update.');
  }

  if (action === 'delete' && !permissions.can_delete_material) {
    throw new Error('Anda tidak memiliki akses delete.');
  }

  return permissions;
}

exports.getDashboardCourses = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const courses = await teacherModel.getTeacherCourses(teacherId);
    const permissions = await teacherModel.getTeacherPermissions(teacherId);

    res.json({
      status: 'success',
      data: {
        courses,
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getCourseModules = async (req, res) => {
  try {
    const { courseId, teacherId } = req.params;

    const modules = await teacherModel.getCourseModules(courseId, teacherId);

    res.json({
      status: 'success',
      data: modules
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.createModule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    await checkPermission(teacherId, 'create');

    const module = await teacherModel.createModule(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Modul berhasil dibuat.',
      data: module
    });
  } catch (error) {
    res.status(403).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { teacherId, moduleId } = req.params;
    await checkPermission(teacherId, 'update');

    const module = await teacherModel.updateModule(moduleId, req.body);

    res.json({
      status: 'success',
      message: 'Modul berhasil diperbarui.',
      data: module
    });
  } catch (error) {
    res.status(403).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { teacherId, moduleId } = req.params;
    await checkPermission(teacherId, 'delete');

    await teacherModel.deleteModule(moduleId);

    res.json({
      status: 'success',
      message: 'Modul berhasil dihapus.'
    });
  } catch (error) {
    res.status(403).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { teacherId } = req.params;
    await checkPermission(teacherId, 'create');

    const material = await teacherModel.createMaterial({
      body: req.body,
      file: req.file
    });

    res.status(201).json({
      status: 'success',
      message: 'Materi berhasil dibuat.',
      data: material
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { teacherId, materialId } = req.params;
    await checkPermission(teacherId, 'update');

    const material = await teacherModel.updateMaterial(materialId, {
      body: req.body,
      file: req.file
    });

    res.status(200).json({
      status: 'success',
      message: 'Materi berhasil diperbarui.',
      data: material
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const { teacherId, materialId } = req.params;
    await checkPermission(teacherId, 'delete');

    await teacherModel.deleteMaterial(materialId);

    res.json({
      status: 'success',
      message: 'Materi berhasil dihapus.'
    });
  } catch (error) {
    res.status(403).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.reorderModules = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { course_id, modules } = req.body;

    await checkPermission(teacherId, 'update');

    if (!course_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Course ID wajib dikirim.'
      });
    }

    if (!Array.isArray(modules) || !modules.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Data urutan modul tidak valid.'
      });
    }

    await teacherModel.reorderModules({
      teacherId,
      courseId: course_id,
      modules
    });

    res.json({
      status: 'success',
      message: 'Urutan modul berhasil diperbarui.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Gagal memperbarui urutan modul.'
    });
  }
};

exports.reorderMaterials = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { module_id, materials } = req.body;

    await checkPermission(teacherId, 'update');

    if (!module_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Module ID wajib dikirim.'
      });
    }

    if (!Array.isArray(materials) || !materials.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Data urutan materi tidak valid.'
      });
    }

    await teacherModel.reorderMaterials({
      teacherId,
      moduleId: module_id,
      materials
    });

    res.json({
      status: 'success',
      message: 'Urutan materi berhasil diperbarui.'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Gagal memperbarui urutan materi.'
    });
  }
};

exports.getModuleQuestions = async (req, res) => {
  try {
    const { teacherId, moduleId } = req.params;

    const questions = await teacherModel.getModuleQuestions({
      teacherId,
      moduleId
    });

    res.json({
      status: 'success',
      data: questions
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.createModuleQuestion = async (req, res) => {
  try {
    const { teacherId } = req.params;

    await checkPermission(teacherId, 'create');

    const question = await teacherModel.createModuleQuestion({
      teacherId,
      body: req.body,
      file: req.file
    });

    res.status(201).json({
      status: 'success',
      message: 'Soal berhasil dibuat.',
      data: question
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.importModuleQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    await checkPermission(teacherId, 'create');

    const questions = await teacherModel.importModuleQuestions({
      teacherId,
      body: req.body,
      file: req.file
    });

    res.status(201).json({
      status: 'success',
      message: `${questions.length} soal berhasil diimport.`,
      data: questions
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.downloadQuestionTemplate = async (req, res) => {
  const csv = [
    'question,option_a,option_b,option_c,option_d,answer,explanation',
    'Apa kepanjangan dari CPU?,Central Processing Unit,Computer Personal Unit,Central Program User,Control Processing Unit,A,CPU adalah pusat pemrosesan komputer.'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="template-soal-modul.csv"');
  res.status(200).send(csv);
};

exports.syncModuleQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    await checkPermission(teacherId, 'create');

    const questions = await teacherModel.syncModuleQuestions({
      teacherId,
      body: req.body,
      files: req.files || []
    });

    res.status(200).json({
      status: 'success',
      message: `${questions.length} soal berhasil disimpan.`,
      data: questions
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteModuleQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { module_id, question_ids = [] } = req.body;

    await checkPermission(teacherId, 'delete');

    if (!module_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Module ID wajib dikirim.'
      });
    }

    await teacherModel.deleteModuleQuestions({
      teacherId,
      moduleId: module_id,
      questionIds: question_ids
    });

    res.json({
      status: 'success',
      message: question_ids.length
        ? 'Soal terpilih berhasil dihapus.'
        : 'Semua soal modul berhasil dihapus.'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getCourseExam = async (req, res) => {
  try {
    const { teacherId, courseId } = req.params;

    const data = await teacherModel.getCourseExam({
      teacherId,
      courseId
    });

    res.json({
      status: 'success',
      data
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.syncCourseExamQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    await checkPermission(teacherId, 'create');

    const questions = await teacherModel.syncCourseExamQuestions({
      teacherId,
      body: req.body,
      files: req.files || []
    });

    res.json({
      status: 'success',
      message: `${questions.length} soal ujian berhasil disimpan.`,
      data: questions
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.deleteCourseExamQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { course_id, question_ids = [] } = req.body;

    await checkPermission(teacherId, 'delete');

    await teacherModel.deleteCourseExamQuestions({
      teacherId,
      courseId: course_id,
      questionIds: question_ids
    });

    res.json({
      status: 'success',
      message: question_ids.length
        ? 'Soal ujian terpilih berhasil dihapus.'
        : 'Semua soal ujian berhasil dihapus.'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateCourseExamSetting = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { course_id, duration_minutes } = req.body;

    await checkPermission(teacherId, 'update');

    const setting = await teacherModel.upsertCourseExamSetting({
      teacherId,
      courseId: course_id,
      durationMinutes: duration_minutes
    });

    res.json({
      status: 'success',
      message: 'Setting waktu ujian berhasil disimpan.',
      data: setting
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.downloadExamTemplate = async (req, res) => {
  const csv = [
    'question,option_a,option_b,option_c,option_d,answer',
    'Apa kepanjangan dari CPU?,Central Processing Unit,Computer Personal Unit,Central Program User,Control Processing Unit,A'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="template-soal-ujian-course.csv"');
  res.status(200).send(csv);
};

exports.importCourseExamQuestions = async (req, res) => {
  try {
    const { teacherId } = req.params;

    await checkPermission(teacherId, 'create');

    const questions = await teacherModel.importCourseExamQuestions({
      teacherId,
      body: req.body,
      file: req.file
    });

    res.status(201).json({
      status: 'success',
      message: `${questions.length} soal ujian berhasil diimport.`,
      data: questions
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Teacher Profile Controller Methods
exports.getTeacherProfile = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const profile = await teacherModel.getTeacherProfile(teacherId);

    res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateTeacherProfile = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama lengkap wajib diisi'
      });
    }

    const updated = await teacherModel.updateTeacherProfile(teacherId, { full_name });

    res.status(200).json({
      status: 'success',
      message: 'Profil berhasil diperbarui',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.changeTeacherPassword = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { current_password, new_password } = req.body;

    await teacherModel.changeTeacherPassword(teacherId, {
      currentPassword: current_password,
      newPassword: new_password
    });

    res.status(200).json({
      status: 'success',
      message: 'Password berhasil diubah'
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.updateTeacherAvatar = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'File avatar wajib dikirim'
      });
    }

    const updated = await teacherModel.updateTeacherAvatar(teacherId, req.file);

    res.status(200).json({
      status: 'success',
      message: 'Foto profil berhasil diperbarui',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};