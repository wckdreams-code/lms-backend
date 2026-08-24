const supabase = require('../config/supabase');

// Guard khusus route /admin/*
// Memastikan user yang login benar-benar punya role admin.
// Dipasang SETELAH authMiddleware (req.user sudah terisi).
const adminGuard = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || profile?.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Hanya admin yang boleh mengakses resource ini.'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error pada Admin Guard'
    });
  }
};

module.exports = adminGuard;
