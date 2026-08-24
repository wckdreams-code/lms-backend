const supabase = require('../config/supabase');

// Guard khusus route /teacher/:teacherId/*
// Memastikan teacherId di URL benar-benar milik user yang sedang login.
// Dipasang SETELAH authMiddleware (req.user sudah terisi).
const teacherGuard = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({
        status: 'error',
        message: 'Teacher ID wajib dikirim.'
      });
    }

    // User hanya boleh mengakses resource dirinya sendiri,
    // kecuali dia admin.
    if (req.user.id !== teacherId) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || profile?.role !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak berhak mengakses data guru lain.'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error pada Teacher Guard'
    });
  }
};

module.exports = teacherGuard;
