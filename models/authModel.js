// src/models/authModel.js
const supabase = require('../config/supabase');
const supabaseAuth = require('../config/supabaseAuth');

// 1. Register user menggunakan Admin API (Bypass limit email & auto-confirm)
exports.registerUser = async (email, password, full_name) => {
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name
        }
    });

    if (error) throw error;
    return data.user;
};

// 2. Insert ke tabel profiles
exports.insertProfile = async (userId, full_name) => {
    const { data, error } = await supabase
        .from('profiles')
        .upsert(
            [{ id: userId, full_name, role: 'siswa' }],
            { onConflict: 'id' }
        )
        .select('id, full_name, role')
        .single();

    if (error) throw error;
    return data;
};

// 3. Login user
exports.loginUser = async (email, password) => {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    return {
        access_token: data.session.access_token,
        user: data.user
    };
};

// 4. Ambil profile dari tabel profiles berdasarkan user ID
exports.getProfileByUserId = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, current_level')
        .eq('id', userId)
        .single();
        
    if (error) throw error;
    return data;
};