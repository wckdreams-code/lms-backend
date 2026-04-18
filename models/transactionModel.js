const supabase = require('../config/supabase');

const transactionModel = {
  // Buat draft transaksi awal
  createTransaction: async (payload) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select();
    if (error) throw error;
    return data[0];
  },

  // Update status (dari Webhook Midtrans atau Manual Admin)
  updateStatus: async (orderId, updateData) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('order_id', orderId)
      .select();
    if (error) throw error;
    return data[0];
  },

  // Admin: Lihat semua transaksi yang butuh konfirmasi
  getPendingConfirmations: async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (full_name),
        courses (title)
      `)
      .eq('status_pembayaran', 'success')
      .eq('is_confirmed_by_admin', false);
    if (error) throw error;
    return data;
  }
};

module.exports = transactionModel;