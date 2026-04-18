const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    // 1. Ambil token dari header (format: Bearer <token>)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifikasi token ke Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ status: 'error', message: 'Sesi tidak valid atau kadaluarsa' });
    }

    // 3. Simpan data user ke req untuk dipakai di controller
    req.user = user;
    
    // Lanjut ke proses berikutnya
    next();
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Internal Server Error pada Auth' });
  }
};

module.exports = authMiddleware;