const adminOfflineRegistrationModel = require("../models/adminOfflineRegistrationModel");

exports.getAllOfflineRegistrations = async (req, res) => {
  try {
    const registrations =
      await adminOfflineRegistrationModel.getAllOfflineRegistrations();
    res.status(200).json({ status: "success", data: registrations });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getOfflineRegistrationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const registration =
      await adminOfflineRegistrationModel.getOfflineRegistrationDetail(id);
    if (!registration) {
      return res
        .status(404)
        .json({ status: "error", message: "Pendaftaran offline tidak ditemukan" });
    }
    res.status(200).json({ status: "success", data: registration });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateOfflineRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const {
      status,
      final_price,
      payment_type,
      payment_status,
      admin_notes,
    } = req.body;

    const updatePayload = {
      status,
      final_price,
      payment_type,
      payment_status,
      admin_notes,
      handled_by: adminId,
    };

    const updatedRegistration =
      await adminOfflineRegistrationModel.updateOfflineRegistration(
        id,
        updatePayload,
      );

    res.status(200).json({
      status: "success",
      message: "Pendaftaran offline berhasil diperbarui",
      data: updatedRegistration,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};