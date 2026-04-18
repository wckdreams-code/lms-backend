const moduleModel = require('../models/moduleModel');
const courseModel = require('../models/courseModel');
const supabase = require('../config/supabase');


exports.addModule = async (req, res) => {
  try {
    if (req.user.role === 'siswa') return res.status(403).json({ message: 'Forbidden' });

    const { course_id, title, order_index } = req.body;
    let pdf_url = null;

    // Logic Upload File ke Supabase Storage (Jika ada file)
    if (req.file) {
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `materi/${fileName}`;

      const { data, error } = await supabase.storage
        .from('materials') // Nama bucket di Supabase
        .upload(filePath, file.buffer, { contentType: 'application/pdf' });

      if (error) throw error;

      // Ambil Public URL
      const { data: publicData } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);
      
      pdf_url = publicData.publicUrl;
    }

    const newModule = await moduleModel.createModule({
      course_id,
      title,
      order_index,
      pdf_content_url: pdf_url
    });

    res.status(201).json({ status: 'success', data: newModule });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;
    const modules = await moduleModel.getModulesByCourse(courseId);
    res.status(200).json({ status: 'success', data: modules });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    await moduleModel.deleteModule(id);
    res.status(200).json({ status: 'success', message: 'Modul berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

//AI CONTEXT Endpoint untuk memberikan konteks ke AI berdasarkan course dan module yang dipilih

exports.getAIContext = async (req, res) => {
  try {
    const { courseId, moduleId } = req.body;

    const course = await courseModel.getCourseDetail(courseId);
    const modules = await moduleModel.getModulesByCourse(courseId);

    const currentModule = modules.find(m => m.id == moduleId);

    res.json({
      course_name: course.title,
      current_module: currentModule.title,
      modules: modules.map(m => m.title),
      module_content: currentModule.pdf_content_url // nanti bisa di-extract text
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};