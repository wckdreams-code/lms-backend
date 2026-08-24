const supabase = require("../config/supabase");

const offlineRegistrationModel = {
  create: async (data) => {
    const { data: result, error } = await supabase
      .from("offline_registrations")
      .insert([data])
      .select(
        `
        *,
        course:course_id (
          id,
          title,
          delivery_type,
          price
        )
      `,
      )
      .single();

    if (error) throw error;
    return result;
  },

  findMyRegistrations: async (userId) => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .select(
        `
        id,
        course:course_id (
          id,
          title,
          description,
          thumbnail_url,
          category,
          level,
          price
        ),
        final_price,
        payment_type,
        payment_status,
        status,
        admin_notes,
        created_at,
        transaction:transaction_id (
          snap_token,
          redirect_url,
          status_pembayaran
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  findById: async (id, userId) => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .select(
        `
        *,
        course:course_id (
          id,
          title,
          description,
          thumbnail_url,
          category,
          level,
          price
        ),
        transaction:transaction_id (
          snap_token,
          redirect_url,
          status_pembayaran
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  linkTransaction: async (registrationId, transactionId) => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .update({ transaction_id: transactionId })
      .eq("id", registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

module.exports = offlineRegistrationModel;
