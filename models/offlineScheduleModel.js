const supabase = require("../config/supabase");

const offlineScheduleModel = {
  createSchedule: async (data) => {
    const { data: result, error } = await supabase
      .from("offline_class_schedules")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  getScheduleByRegistrationId: async (registrationId) => {
    const { data, error } = await supabase
      .from("offline_class_schedules")
      .select("*")
      .eq("offline_registration_id", registrationId)
      .eq("status", "confirmed")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  getStudentSchedulesByUserId: async (userId, registrationId = null) => {
    const { data: registrations, error: registrationError } = await supabase
      .from("offline_registrations")
      .select("id, course:course_id(title)")
      .eq("user_id", userId);

    if (registrationError) throw registrationError;

    const filteredRegistrations = registrationId
      ? (registrations || []).filter((item) => item.id === registrationId)
      : registrations || [];

    const registrationIds = (filteredRegistrations || []).map(
      (item) => item.id,
    );
    if (registrationIds.length === 0) return [];

    const courseNameByRegistrationId = Object.fromEntries(
      (filteredRegistrations || []).map((item) => [
        item.id,
        item.course?.title || "Kursus Offline",
      ]),
    );

    const { data, error } = await supabase
      .from("offline_class_schedules")
      .select(
        "id, day, start_time, end_time, location, notes, status, offline_registration_id",
      )
      .eq("status", "confirmed")
      .in("offline_registration_id", registrationIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((schedule) => ({
      id: schedule.id,
      course_name:
        courseNameByRegistrationId[schedule.offline_registration_id] ||
        "Kursus Offline",
      day: schedule.day,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location: schedule.location,
      notes: schedule.notes,
      status: schedule.status,
    }));
  },

  updateSchedule: async (id, data) => {
    const updateData = { ...data, updated_at: new Date().toISOString() };

    const { data: result, error } = await supabase
      .from("offline_class_schedules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  },
};

module.exports = offlineScheduleModel;
