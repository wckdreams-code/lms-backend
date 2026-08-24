const supabase = require("../config/supabase");

const transactionModel = {
  // Cek apakah user adalah akun dummy (boleh bypass payment gateway).
  // Flag hanya bisa di-set lewat database/admin, tidak dari input user,
  // sehingga user biasa tidak bisa melewati pembayaran.
  // Defensif: jika kolom belum ada di DB, anggap bukan dummy (false).
  isDummyAccount: async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_dummy_account")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // Kolom belum dibuat / error lain → jangan pernah bypass.
      console.warn("isDummyAccount check gagal:", error.message);
      return false;
    }

    return Boolean(data?.is_dummy_account);
  },

  // Buat draft transaksi awal
  createTransaction: async (payload) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select();
    if (error) throw error;
    return data[0];
  },

  getTransactionById: async (transactionId) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  updateStatus: async (orderId, updateData) => {
    const { data, error } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("order_id", orderId)
      .select();
    if (error) throw error;
    return data[0];
  },

  // Admin: Lihat semua transaksi yang butuh konfirmasi
  getPendingConfirmations: async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        profiles (full_name),
        courses (title)
      `,
      )
      .eq("status_pembayaran", "success")
      .eq("is_confirmed_by_admin", false);
    if (error) throw error;
    return data;
  },

  getTransactionDetail: async ({ transactionId, userId }) => {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        courses (
          id,
          title,
          price,
          thumbnail_url,
          category
        )
      `,
      )
      .eq("id", transactionId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    if (
      data.status_pembayaran === "pending" &&
      data.expired_at &&
      new Date(data.expired_at) < new Date()
    ) {
      const { data: updated, error: updateError } = await supabase
        .from("transactions")
        .update({ status_pembayaran: "failed" })
        .eq("id", transactionId)
        .eq("user_id", userId)
        .select(
          `
          *,
          courses (
            id,
            title,
            price,
            thumbnail_url,
            category
          )
        `,
        )
        .single();

      if (updateError) throw updateError;
      return updated;
    }

    return data;
  },

  markExpiredTransaction: async ({ transactionId, userId }) => {
    const { data: transaction, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    if (transaction.status_pembayaran !== "pending") {
      return transaction;
    }

    if (
      transaction.expired_at &&
      new Date(transaction.expired_at) > new Date()
    ) {
      throw new Error("Transaksi belum melewati batas waktu pembayaran.");
    }

    const { data, error: updateError } = await supabase
      .from("transactions")
      .update({ status_pembayaran: "failed" })
      .eq("id", transactionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  },
};

module.exports = transactionModel;
