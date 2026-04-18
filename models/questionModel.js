const supabase = require('../config/supabase');

const questionModel = {
  // Ambil soal berdasarkan modul (Latihan)
  getQuestionsByModule: async (moduleId) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('module_id', moduleId)
      .eq('is_exam', false);
    if (error) throw error;
    return data;
  },

  // Ambil soal berdasarkan kursus (Ujian Akhir atau Placement Test)
  getQuestionsByCourse: async (courseId, isExam = true) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_exam', isExam);
    if (error) throw error;
    return data;
  },

  // Create Soal Baru
  createQuestion: async (questionData) => {
    const { data, error } = await supabase
      .from('questions')
      .insert([questionData])
      .select();
    if (error) throw error;
    return data[0];
  },

  // Simpan hasil jawaban & skor (Progres)
  saveProgress: async (progressData) => {
    const { data, error } = await supabase
      .from('student_progress')
      .insert([progressData])
      .select();
    if (error) throw error;
    return data[0];
  }
};

module.exports = questionModel;