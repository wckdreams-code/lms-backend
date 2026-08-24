const userModel = require("../models/userModel");

exports.getProfile = async (req, res) => {
  try {
    // req.user.id didapat dari middleware auth nantinya
    const userId = req.user.id;
    const profile = await userModel.getProfileById(userId);

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.completePlacementTest = async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.user.id;

    // Logic penentuan level
    let level = "beginner";
    if (score >= 60 && score <= 80) level = "amateur";
    if (score > 80) level = "pro";

    await userModel.updateUserLevel(userId, level);

    res.status(200).json({
      status: "success",
      message: `Selamat! Kamu berada di level ${level}`,
      level,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.adminGetAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Akses ditolak" });
    const users = await userModel.getAllUsers();
    res.status(200).json({ status: "success", data: users });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Akses ditolak" });
    const { id } = req.params;
    const updated = await userModel.updateUser(id, req.body);
    res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const courses = await userModel.getMyCourses(userId);
    res.status(200).json({ status: "success", data: courses });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await userModel.getMyCertificates(userId);
    res.status(200).json({ status: "success", data: certificates });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const data = await userModel.getTransactionHistory(req.user.id);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name } = req.body;
    const updated = await userModel.updateProfile(req.user.id, { full_name });
    res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "File avatar wajib dikirim",
      });
    }

    const updated = await userModel.updateAvatar(userId, req.file);

    res.status(200).json({
      status: "success",
      message: "Foto profil berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Password baru wajib diisi",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password minimal 8 karakter",
      });
    }

    await userModel.changePassword(userId, password);

    res.status(200).json({
      status: "success",
      message: "Password berhasil diubah",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    await userModel.deleteUserFull(req.user.id);
    res
      .status(200)
      .json({ status: "success", message: "Akun berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
