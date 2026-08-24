const supabase = require("../config/supabase");

const adminOfflineRegistrationModel = {
  getAllOfflineRegistrations: async () => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .select(
        `
        id,
        nama_lengkap,
        status,
        final_price,
        created_at,
        course:course_id (
          title
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  getOfflineRegistrationDetail: async (id) => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .select(
        `
        *,
        course:course_id (
          title
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  updateOfflineRegistration: async (id, payload) => {
    const { data, error } = await supabase
      .from("offline_registrations")
      .update(payload)
      .eq("id", id)
      .select(
        `
        *,
        course:course_id (
          title
        )
      `,
      )
      .single();

    if (error) throw error;
    return data;
  },
};

module.exports = adminOfflineRegistrationModel;