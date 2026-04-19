const supabase = require('../config/supabase');

const courseModel = {
  getAllCourses: async (filters = {}) => {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_placement_test', false);

    // Filter berdasarkan teks pencarian (case-insensitive)
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    // Filter berdasarkan kategori yang dipilih
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Ambil detail satu kursus beserta modulnya
  getCourseDetail: async (courseId) => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        modules (
          id,
          title,
          order_index,
          pdf_content_url
        )
      `)
      .eq('id', courseId)
      .single();
    if (error) throw error;
    return data;
  },

  // Khusus ambil data placement test
  getPlacementTest: async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_placement_test', true)
      .single();
    if (error) throw error;
    return data;
  },

  // Admin: Buat kursus baru
  createCourse: async (courseData) => {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData]);
    if (error) throw error;
    return data;
  },

  updateCourse: async (courseId, updateData) => {
    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select();
    if (error) throw error;
    return data;
  },

  deleteCourse: async (courseId) => {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
    if (error) throw error;
    return true;
  }

};

module.exports = courseModel;