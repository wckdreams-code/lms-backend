const supabase = require('../config/supabase');

/**
 * GET /api/v1/stats/landing
 * Mengembalikan angka-angka untuk stats bar di hero landing page:
 *  - total_students : jumlah profiles dengan role = 'siswa'
 *  - total_courses  : jumlah kursus yang bukan placement test
 *  - avg_rating     : rata-rata rating dari user_feedback
 */
exports.getLandingStats = async (req, res) => {
    try {
        // 1. Hitung total siswa aktif
        const { count: total_students, error: errStudents } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'siswa');

        if (errStudents) throw errStudents;

        // 2. Hitung total kursus (bukan placement test)
        const { count: total_courses, error: errCourses } = await supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .eq('is_placement_test', false);

        if (errCourses) throw errCourses;

        // 3. Hitung rata-rata rating dari user_feedback
        const { data: feedbackData, error: errFeedback } = await supabase
            .from('user_feedback')
            .select('rating');

        if (errFeedback) throw errFeedback;

        const avg_rating = feedbackData.length > 0
            ? (feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length).toFixed(1)
            : '0.0';

        res.status(200).json({
            status: 'success',
            data: {
                total_students: total_students ?? 0,
                total_courses:  total_courses  ?? 0,
                avg_rating
            }
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};