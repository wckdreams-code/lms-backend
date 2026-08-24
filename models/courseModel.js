const supabase = require('../config/supabase');

const courseModel = {
  getAllCourses: async (filters = {}) => {
    let query = supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        thumbnail_url,
        delivery_type,
        category,
        level,
        learning_type,
        tags,
        price,
        teacher:teacher_id (id, full_name)
      `)
      .eq('is_placement_test', false)
      .is('deleted_at', null);

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.level && filters.level !== 'all') {
      query = query.eq('level', filters.level);
    }
    if (filters.delivery_type && filters.delivery_type !== 'all') {
      query = query.eq('delivery_type', filters.delivery_type);
    }
    if (filters.learning_type && filters.learning_type !== 'all') {
      query = query.eq('learning_type', filters.learning_type);
    }

    const { data, error } = await query.order('title', { ascending: true });
    if (error) throw error;
    return data;
  },

  // Ambil detail satu kursus beserta modul dan materinya
  getCourseDetail: async (courseId) => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
      *,
      teacher:teacher_id (
        id,
        full_name
      ),
      modules (
        id,
        title,
        order_index,
        materials (
          id,
          title,
          pdf_content_url,
          order_index
        ),
        questions (
          id,
          is_exam
        )
      )
      `)
      .eq('id', courseId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;

    // Course tidak ada / sudah di-soft-delete: beri error yang jelas,
    // bukan error .single() yang membingungkan.
    if (!data) {
      const notFound = new Error('Kursus tidak ditemukan atau sudah dihapus.');
      notFound.statusCode = 404;
      throw notFound;
    }

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
    const { data, error } = await supabase
      .from('courses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', courseId)
      .select()
      .single();
    if (error) throw error;
    return data;
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

  // Ambil pengaturan ujian akhir kursus
  getCourseExamSettings: async (courseId) => {
    const { data, error } = await supabase
      .from('course_exam_settings')
      .select('duration_minutes')
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;
    return data || { duration_minutes: null, show_review_after_submit: true };
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

  // Buat antrian sertifikat jika lulus.
  // Tidak ada lagi URL dummy — admin yang akan mengunggah file PDF-nya,
  // baris dibuat berstatus 'pending' dan FE menampilkan "sedang diproses".
  getExistingCertificate: async (userId, courseId) => {
    const { data, error } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0) ? data[0] : null;
  },

  createExamAttempt: async ({ userId, courseId, score, isPassed, attemptNumber, durationSeconds, nextAttemptAt }) => {
    const { data, error } = await supabase
      .from('exam_attempts')
      .insert([{
        user_id: userId,
        course_id: courseId,
        score,
        is_passed: isPassed,
        attempt_number: attemptNumber,
        duration_seconds: durationSeconds,
        started_at: new Date(Date.now() - (durationSeconds * 1000)).toISOString(),
        finished_at: new Date().toISOString(),
        next_attempt_at: nextAttemptAt || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getLastExamAttempt: async (userId, courseId) => {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  generateCertificate: async (userId, courseId) => {
    // Cek apakah sertifikat sudah ada
    const { data: existing } = await supabase
      .from('certificates')
      .select('id, certificate_url, certificate_number, status, issued_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .limit(1);

    if (existing && existing.length > 0) return existing[0];

    const { data, error } = await supabase
      .from('certificates')
      .insert([{ user_id: userId, course_id: courseId, status: 'pending', issued_at: null }])
      .select('id, certificate_url, certificate_number, status, issued_at');

    if (error) throw error;
    return data[0];
  }
};

module.exports = courseModel;