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
  }
};

module.exports = userModel;