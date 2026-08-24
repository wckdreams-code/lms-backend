// src/controllers/transactionController.js
const midtransClient = require("midtrans-client");
const supabase = require("../config/supabase");
const transactionModel = require("../models/transactionModel");
const courseModel = require("../models/courseModel"); // Import course model
const adminOfflineRegistrationModel = require("../models/adminOfflineRegistrationModel");

// Inisialisasi Midtrans
let snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

const getTransactionByOrderId = async (orderId) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// 1. Fungsi Checkout (Beli / Klaim Gratis)
exports.checkout = async (req, res) => {
  try {
    const { course_id } = req.body;
    const userId = req.user.id;

    // Ambil detail kursus untuk cek harga
    const course = await courseModel.getCourseDetail(course_id);
    if (!course) {
      return res
        .status(404)
        .json({ status: "error", message: "Kursus tidak ditemukan" });
    }

    const orderId = `ORD-${Date.now()}-${userId.slice(0, 8)}`;

    // A. LOGIKA KURSUS GRATIS (Price == 0)
    if (course.price == 0) {
      await transactionModel.createTransaction({
        user_id: userId,
        course_id: course_id,
        order_id: orderId,
        amount: 0,
        status_pembayaran: "success",
        is_confirmed_by_admin: true, // Langsung aktif
      });

      return res.status(200).json({
        status: "success",
        message: "Kursus gratis berhasil diklaim!",
        is_free: true,
      });
    }

    // A2. SIMULASI PEMBAYARAN untuk akun dummy (testing tanpa Midtrans).
    // Flag dibaca dari database berdasarkan user login, bukan dari body request,
    // sehingga hanya akun yang ditandai admin yang bisa bypass.
    const isDummy = await transactionModel.isDummyAccount(userId);

    if (isDummy) {
      await transactionModel.createTransaction({
        user_id: userId,
        course_id: course_id,
        order_id: orderId,
        amount: course.price,
        status_pembayaran: "success",
        is_confirmed_by_admin: true,
      });

      return res.status(200).json({
        status: "success",
        message:
          "Pembayaran simulasi (akun dummy) berhasil. Kursus langsung aktif.",
        is_free: false,
        is_dummy: true,
      });
    }

    // B. LOGIKA KURSUS BERBAYAR (Midtrans)
    let parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(course.price),
      },
      customer_details: {
        email: req.user.email,
      },
      item_details: [
        {
          id: course.id,
          price: Number(course.price),
          quantity: 1,
          name: course.title,
        },
      ],
    };

    const transaction = await snap.createTransaction(parameter);
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await transactionModel.createTransaction({
      user_id: userId,
      course_id: course_id,
      order_id: orderId,
      amount: course.price,
      status_pembayaran: "pending",
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url || null,
      expired_at: expiredAt,
    });

    res.status(200).json({
      status: "success",
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url || null,
      is_free: false,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

const getPaymentStatus = (statusResponse) => {
  if (statusResponse.transaction_status === "settlement") return "success";
  if (
    statusResponse.transaction_status === "capture" &&
    statusResponse.fraud_status !== "challenge"
  ) {
    return "success";
  }
  if (statusResponse.transaction_status === "pending") return "pending";
  return "failed";
};

const synchronizePaymentStatus = async (statusResponse) => {
  const orderId = statusResponse.order_id;
  const existingTransaction = await getTransactionByOrderId(orderId);

  if (!existingTransaction) return null;

  const statusPembayaran = getPaymentStatus(statusResponse);
  const updateData = { status_pembayaran: statusPembayaran };

  if (
    statusPembayaran === "success" &&
    existingTransaction.course_id &&
    !existingTransaction.offline_registration_id
  ) {
    updateData.is_confirmed_by_admin = true;
    updateData.confirmed_at = new Date().toISOString();
  }

  const transaction = await transactionModel.updateStatus(orderId, updateData);

  if (
    statusPembayaran === "success" &&
    existingTransaction.offline_registration_id
  ) {
    await adminOfflineRegistrationModel.updateOfflineRegistrationByTransactionId(
      transaction.id,
      {
        payment_status: "paid",
        status: "paid",
      },
    );
  }

  return transaction;
};

exports.notificationWebhook = async (req, res) => {
  try {
    const statusResponse = await snap.transaction.notification(req.body);
    await synchronizePaymentStatus(statusResponse);
    res.status(200).send("OK");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const existingTransaction = await getTransactionByOrderId(orderId);

    if (!existingTransaction || existingTransaction.user_id !== req.user.id) {
      return res.status(404).json({ status: "error", message: "Transaksi tidak ditemukan" });
    }

    const statusResponse = await snap.transaction.status(orderId);
    const transaction = await synchronizePaymentStatus(statusResponse);

    res.status(200).json({ status: "success", data: transaction });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

// 3. Admin mengonfirmasi akses kursus
exports.adminConfirm = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Forbidden" });

    const { order_id } = req.body;
    await transactionModel.updateStatus(order_id, {
      is_confirmed_by_admin: true,
      status_pembayaran: "success",
      confirmed_at: new Date().toISOString(),
    });

    res
      .status(200)
      .json({ status: "success", message: "Akses kursus telah dikonfirmasi" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getTransactionDetail = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const transaction = await transactionModel.getTransactionDetail({
      transactionId,
      userId,
    });

    res.json({
      status: "success",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

exports.markExpiredTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const transaction = await transactionModel.markExpiredTransaction({
      transactionId,
      userId,
    });

    res.json({
      status: "success",
      message:
        "Transaksi sudah dianggap gagal karena melewati batas waktu pembayaran.",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};
