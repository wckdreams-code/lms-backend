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

        const user    = await authModel.registerUser(email, password);
        const profile = await authModel.insertProfile(user.id, full_name);

        res.status(201).json({
            status:  'success',
            message: 'Akun berhasil dibuat.',
            user_id: user.id,
            profile
        });

    } catch (error) {
        // Pesan Supabase bisa verbose — sederhanakan untuk klien
        const msg = error.message?.includes('already registered')
            ? 'Email ini sudah terdaftar. Silakan login.'
            : error.message;

        res.status(500).json({ status: 'error', message: msg });
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
                message: 'Profil pengguna tidak ditemukan.'
            });
        }

        // Validasi role: jika login sebagai admin tapi role di DB bukan admin/guru → tolak
        if (role === 'admin' && profile.role === 'siswa') {
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
        // Jika error berasal dari Supabase (Invalid credentials)
        const msg = error.message?.includes('Invalid login credentials') 
            ? 'Email atau password salah.' 
            : error.message;
        res.status(401).json({ status: 'error', message: msg });
    }
};