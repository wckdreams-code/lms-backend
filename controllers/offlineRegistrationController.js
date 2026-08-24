const offlineRegistrationModel = require("../models/offlineRegistrationModel");
const courseModel = require("../models/courseModel");
const transactionModel = require("../models/transactionModel");

exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      course_id,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      agama,
      alamat_lengkap,
      no_telp,
      asal_sekolah_kampus,
      kelas,
      prestasi_sekolah,
      prestasi_luar_sekolah,
      nama_orang_tua,
      no_telp_ortu,
      pekerjaan,
      pilihan_jam_belajar,
      sumber_informasi,
    } = req.body;

    if (!course_id) {
      return res
        .status(400)
        .json({ status: "error", message: "course_id wajib diisi" });
    }

    const course = await courseModel.getCourseDetail(course_id);
    if (!course) {
      return res
        .status(404)
        .json({ status: "error", message: "Kursus tidak ditemukan" });
    }

    if (course.delivery_type !== "Offline") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Pendaftaran offline hanya untuk kursus dengan tipe Offline",
        });
    }

    const registration = await offlineRegistrationModel.create({
      user_id: userId,
      course_id,
      nama_lengkap,
      tempat_lahir,
      tanggal_lahir,
      agama,
      alamat_lengkap,
      no_telp,
      asal_sekolah_kampus,
      kelas,
      prestasi_sekolah,
      prestasi_luar_sekolah,
      nama_orang_tua,
      no_telp_ortu,
      pekerjaan,
      pilihan_jam_belajar,
      sumber_informasi,
      status: "pending_review",
      payment_status: "waiting_payment",
      final_price: null,
      transaction_id: null,
    });

    const initialTransaction = await transactionModel.createTransaction({
      user_id: userId,
      course_id,
      order_id: `OFF-${Date.now()}-${String(registration.id).slice(0, 8)}`,
      amount: 0,
      status_pembayaran: "pending",
      is_confirmed_by_admin: false,
      offline_registration_id: registration.id,
      expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await offlineRegistrationModel.linkTransaction(
      registration.id,
      initialTransaction.id,
    );

    res.status(201).json({
      status: "success",
      message: "Pendaftaran offline berhasil dikirim",
      data: registration,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getMyRegistrations = async (req, res) => {
  try {
    const userId = req.user.id;
    const registrations =
      await offlineRegistrationModel.findMyRegistrations(userId);

    const data = registrations.map((r) => ({
      id: r.id,
      course: r.course,
      status: r.status,
      final_price: r.final_price,
      payment_type: r.payment_type,
      payment_status: r.payment_status,
      transaction: r.transaction,
      admin_notes: r.admin_notes,
      created_at: r.created_at,
    }));

    res.status(200).json({ status: "success", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const registration = await offlineRegistrationModel.findById(id, userId);

    res.status(200).json({ status: "success", data: registration });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
