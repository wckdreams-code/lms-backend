// controllers/authController.js
const authModel = require('../models/authModel');

exports.register = async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Email, password, dan nama lengkap wajib diisi.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Password minimal 8 karakter.'
            });
        }

        // 1. Buat User di Auth Supabase
        const user = await authModel.registerUser(email, password, full_name);
        
        // 2. Buat Profile. Pastikan backend menggunakan SERVICE_ROLE key di .env 
        // jika RLS di tabel profiles aktif, agar bisa melakukan bypass RLS saat insert.
        const profile = await authModel.insertProfile(user.id, full_name);

        res.status(201).json({
            status:  'success',
            message: 'Akun berhasil dibuat.',
            user_id: user.id,
            profile
        });

    } catch (error) {
        console.error("Register Error:", error); // Tambahkan console log untuk debugging BE
        
        const msg = error.message?.includes('already registered')
            ? 'Email ini sudah terdaftar. Silakan login.'
            : error.message;

        res.status(500).json({ status: 'error', message: msg, detail: error.details || null });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'error', message: 'Email dan password wajib diisi.' });
        }

        const result = await authModel.loginUser(email, password);

        // Ambil profile untuk cek role dari DB
        const profile = await authModel.getProfileByUserId(result.user.id);

        if (!profile) {
            return res.status(403).json({
                status: 'error',
                message: 'Profil pengguna tidak ditemukan. Proses registrasi mungkin belum sempurna.'
            });
        }

        // Validasi role opsional dari client
        if (role && role === 'admin' && profile.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Kamu tidak memiliki akses sebagai Admin.'
            });
        }

        res.status(200).json({
            status:       'success',
            access_token: result.access_token,
            user: {
                id:        result.user.id,
                email:     result.user.email,
                full_name: profile.full_name,
                role:      profile.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error); // Logging backend
        
        const msg = (error.message?.includes('Invalid login credentials') || error.message?.includes('Email not confirmed'))
            ? 'Email atau password salah, atau email belum dikonfirmasi.' 
            : error.message;
            
        res.status(401).json({ status: 'error', message: msg });
    }
};

exports.staffLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email dan password wajib diisi.'
            });
        }

        const result = await authModel.loginUser(email, password);
        const profile = await authModel.getProfileByUserId(result.user.id);

        if (!profile) {
            return res.status(403).json({
                status: 'error',
                message: 'Profil pengguna tidak ditemukan.'
            });
        }

        if (!['admin', 'guru'].includes(profile.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Akun ini bukan Guru atau Admin.'
            });
        }

        const redirect_url = profile.role === 'admin'
            ? '/admin/dashboard'
            : '/guru/dashboard';

        res.status(200).json({
            status: 'success',
            access_token: result.access_token,
            redirect_url,
            user: {
                id: result.user.id,
                email: result.user.email,
                full_name: profile.full_name,
                role: profile.role
            }
        });

    } catch (error) {
        console.error("Staff Login Error:", error);

        res.status(401).json({
            status: 'error',
            message: 'Email atau password salah.'
        });
    }
};