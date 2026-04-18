const supabase = require('../config/supabase');

const moduleModel = {
  // Ambil semua modul berdasarkan ID Kursus
  getModulesByCourse: async (courseId) => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    if (error) throw error;
    return data;
  },

  // Create Modul Baru
  createModule: async (moduleData) => {
    const { data, error } = await supabase
      .from('modules')
      .insert([moduleData])
      .select();
    if (error) throw error;
    return data[0];
  },

  // Update Modul
  updateModule: async (moduleId, updateData) => {
    const { data, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select();
    if (error) throw error;
    return data[0];
  },

  // Delete Modul
  deleteModule: async (moduleId) => {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId);
    if (error) throw error;
    return true;
  }
};

module.exports = moduleModel;