const userModel = require('../models/userModel');

exports.getProfile = async (req, res) => {
  try {
    // req.user.id didapat dari middleware auth nantinya
    const userId = req.user.id; 
    const profile = await userModel.getProfileById(userId);
    
    res.status(200).json({
      status: 'success',
      data: profile
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.completePlacementTest = async (req, res) => {
  try {
    const { score } = req.body;
    const userId = req.user.id;
    
    // Logic penentuan level
    let level = 'beginner';
    if (score >= 60 && score <= 80) level = 'amateur';
    if (score > 80) level = 'pro';

    await userModel.updateUserLevel(userId, level);

    res.status(200).json({
      status: 'success',
      message: `Selamat! Kamu berada di level ${level}`,
      level
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.adminGetAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
    const users = await userModel.getAllUsers();
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
    const { id } = req.params;
    const updated = await userModel.updateUser(id, req.body);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};