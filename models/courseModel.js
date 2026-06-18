const supabase = require('../config/supabase');

const courseModel = {
  // Ambil semua kursus (kecuali placement test)
  getAllCourses: async (filters = {}) => {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_placement_test', false);

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Ambil detail satu kursus beserta modul dan materinya
  getCourseDetail: async (courseId) => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules (
          id,
          title,
          order_index,
          materials (
            id,
            title,
            pdf_content_url,
            order_index
          )
        )
      `)
      .eq('id', courseId)
      .single();
    if (error) throw error;
    return data;
  },

  getPlacementTest: async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_placement_test', true)
      .single();
    if (error) throw error;
    return data;
  },

  createCourse: async (courseData) => {
    const { data, error } = await supabase.from('courses').insert([courseData]);
    if (error) throw error;
    return data;
  },

  updateCourse: async (courseId, updateData) => {
    const { data, error } = await supabase.from('courses').update(updateData).eq('id', courseId).select();
    if (error) throw error;
    return data;
  },

  deleteCourse: async (courseId) => {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) throw error;
    return true;
  },

  // ─────────────────────────────────────────────────────────
  //  FUNGSI RUANG BELAJAR (LEARN)
  // ─────────────────────────────────────────────────────────

  // Cek apakah user sudah membeli kursus ini
  checkOwnership: async (userId, courseId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('status_pembayaran', 'success')
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0; 
  },

  // Ambil progres siswa di kursus ini
  getStudentProgress: async (userId, courseId) => {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  // Ambil semua pertanyaan untuk kursus ini
  getCourseQuestions: async (courseId) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  // Simpan progres (bisa tipe 'material' atau 'module_quiz')
  saveProgress: async (userId, courseId, type, itemId, score) => {
    const columnToCheck = type === 'material' ? 'material_id' : 'module_id';
    
    // Cek apakah data progress sudah ada sebelumnya
    const { data: existing } = await supabase
      .from('student_progress')
      .select('id')
      .eq('user_id', userId)
      .eq(columnToCheck, itemId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update jika sudah ada
      const { data, error } = await supabase
        .from('student_progress')
        .update({ score: score || null, is_completed: true, finished_at: new Date() })
        .eq('id', existing[0].id);
      if (error) throw error;
      return data;
    } else {
      // Insert baru
      const payload = { 
        user_id: userId, 
        course_id: courseId, 
        is_completed: true, 
        score: score || null 
      };
      payload[columnToCheck] = itemId; // material_id atau module_id
      
      const { data, error } = await supabase.from('student_progress').insert([payload]);
      if (error) throw error;
      return data;
    }
  },

  // Buat sertifikat jika lulus
  generateCertificate: async (userId, courseId) => {
    // Cek apakah sertifikat sudah ada
    const { data: existing } = await supabase
      .from('certificates')
      .select('id, certificate_url')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .limit(1);
      
    if (existing && existing.length > 0) return existing[0];

    const certUrl = `https://lpia.edu/certificates/${courseId}-${userId}`;
    const { data, error } = await supabase
      .from('certificates')
      .insert([{ user_id: userId, course_id: courseId, certificate_url: certUrl }])
      .select();
      
    if (error) throw error;
    return data[0];
  }
};

module.exports = courseModel;