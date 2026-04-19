const supabase = require('../config/supabase');

const userModel = {
  // Ambil profil lengkap berdasarkan ID
  getProfileById: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  // Update level setelah placement test atau progress
  updateUserLevel: async (userId, level) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ current_level: level })
      .eq('id', userId);
    if (error) throw error;
    return data;
  },

  // Sinkronisasi auth supabase ke tabel profiles kita
  createProfile: async (profileData) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData]);
    if (error) throw error;
    return data;
  },

  // Admin: Lihat semua user
  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Admin: Update data user (misal ubah role atau level manual)
  updateUser: async (userId, updateData) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select();
    if (error) throw error;
    return data;
  },

  // Admin: Hapus user (Data di auth.users juga akan terhapus jika di-cascade)
  deleteUser: async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
    return true;
  },

  // Tambahan: Ambil kursus yang sudah dibeli dan dikonfirmasi
  getMyCourses: async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        course_id,
        status_pembayaran,
        is_confirmed_by_admin,
        created_at,
        courses (
          id,
          title,
          thumbnail_url,
          category,
          description
        )
      `)
      .eq('user_id', userId)
      .eq('status_pembayaran', 'success')
      .eq('is_confirmed_by_admin', true)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  // Tambahan: Ambil sertifikat milik user
  getMyCertificates: async (userId) => {
    const { data, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_url,
        issued_at,
        courses ( title )
      `)
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },

  // Ambil semua transaksi (termasuk yang pending/failed untuk riwayat)
  getTransactionHistory: async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id, order_id, amount, status_pembayaran, created_at,
        courses ( title )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Update Nama/Data Profil
  updateProfile: async (userId, updateData) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select();
    if (error) throw error;
    return data[0];
  },

  // Hapus Akun (Hapus di profiles & auth.users menggunakan Admin API)
  deleteUserFull: async (userId) => {
    // 1. Hapus di tabel public.profiles (Akan terhapus otomatis jika ada cascade, 
    // tapi kita lakukan manual untuk keamanan)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) throw profileError;

    // 2. Hapus di auth.users (Membutuhkan SERVICE_ROLE_KEY di config supabase)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    return true;
  }
};



module.exports = userModel;