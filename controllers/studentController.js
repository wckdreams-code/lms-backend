const offlineScheduleModel = require("../models/offlineScheduleModel");

exports.getOfflineSchedules = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrationId =
      req.query.registration_id || req.query.registrationId;
    const schedules = await offlineScheduleModel.getStudentSchedulesByUserId(
      userId,
      registrationId || null,
    );

    res.status(200).json({
      status: "success",
      data: schedules,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
