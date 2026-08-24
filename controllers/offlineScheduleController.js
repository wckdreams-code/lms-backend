const offlineScheduleModel = require('../models/offlineScheduleModel');
const supabase = require('../config/supabase');

exports.create = async (req, res) => {
  try {
    const {
      offline_registration_id,
      teacher_id,
      day,
      start_time,
      end_time,
      location,
      notes
    } = req.body;

    if (!offline_registration_id || !day || !start_time || !end_time) {
      return res.status(400).json({
        status: 'error',
        message: 'offline_registration_id, day, start_time, dan end_time wajib diisi'
      });
    }

    const { data: registration, error: regError } = await supabase
      .from('offline_registrations')
      .select('id, course:course_id ( delivery_type )')
      .eq('id', offline_registration_id)
      .maybeSingle();

    if (regError) throw regError;

    if (!registration) {
      return res.status(404).json({
        status: 'error',
        message: 'Registrasi tidak ditemukan'
      });
    }

    if (registration.course?.delivery_type !== 'Offline') {
      return res.status(400).json({
        status: 'error',
        message: 'Jadwal hanya dapat dibuat untuk registrasi offline'
      });
    }

    const schedule = await offlineScheduleModel.createSchedule({
      offline_registration_id,
      teacher_id: teacher_id || null,
      day,
      start_time,
      end_time,
      location: location || 'LPIA Wisma Asri',
      notes: notes || null
    });

    res.status(201).json({
      status: 'success',
      message: 'Jadwal berhasil dibuat',
      data: schedule
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'Registrasi ini sudah memiliki jadwal aktif'
      });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getByRegistrationId = async (req, res) => {
  try {
    const { registrationId } = req.params;

    const schedule = await offlineScheduleModel.getScheduleByRegistrationId(registrationId);

    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal tidak ditemukan untuk registrasi ini'
      });
    }

    res.status(200).json({ status: 'success', data: schedule });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
