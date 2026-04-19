// src/controllers/transactionController.js
const midtransClient = require('midtrans-client');
const transactionModel = require('../models/transactionModel');
const courseModel = require('../models/courseModel'); // Import course model

// Inisialisasi Midtrans
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

// 1. Fungsi Checkout (Beli / Klaim Gratis)
exports.checkout = async (req, res) => {
  try {
    const { course_id } = req.body;
    const userId = req.user.id;

    // Ambil detail kursus untuk cek harga
    const course = await courseModel.getCourseDetail(course_id);
    if (!course) {
        return res.status(404).json({ status: 'error', message: 'Kursus tidak ditemukan' });
    }

    const orderId = `ORDER-${Date.now()}-${userId}`;

    // A. LOGIKA KURSUS GRATIS (Price == 0)
    if (course.price == 0) {
        await transactionModel.createTransaction({
            user_id: userId,
            course_id: course_id,
            order_id: orderId,
            amount: 0,
            status_pembayaran: 'success',
            is_confirmed_by_admin: true // Langsung aktif
        });

        return res.status(200).json({
            status: 'success',
            message: 'Kursus gratis berhasil diklaim!',
            is_free: true
        });
    }

    // B. LOGIKA KURSUS BERBAYAR (Midtrans)
    let parameter = {
      "transaction_details": {
        "order_id": orderId,
        "gross_amount": course.price
      },
      "customer_details": {
        "email": req.user.email,
      },
      "item_details": [{
        "id": course.id,
        "price": course.price,
        "quantity": 1,
        "name": course.title
      }]
    };

    const transaction = await snap.createTransaction(parameter);
    
    await transactionModel.createTransaction({
      user_id: userId,
      course_id: course_id,
      order_id: orderId,
      amount: course.price,
      status_pembayaran: 'pending'
    });

    res.status(200).json({
      status: 'success',
      snap_token: transaction.token,
      is_free: false
    });

  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Webhook untuk menerima notifikasi otomatis dari Midtrans
exports.notificationWebhook = async (req, res) => {
  try {
    const statusResponse = await snap.transaction.notification(req.body);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;

    let updateData = {};
    if (transactionStatus == 'settlement' || transactionStatus == 'capture') {
      updateData.status_pembayaran = 'success';
    } else if (transactionStatus == 'pending') {
      updateData.status_pembayaran = 'pending';
    } else {
      updateData.status_pembayaran = 'failed';
    }

    await transactionModel.updateStatus(orderId, updateData);
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Admin mengonfirmasi akses kursus
exports.adminConfirm = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    
    const { order_id } = req.body;
    await transactionModel.updateStatus(order_id, { is_confirmed_by_admin: true });
    
    res.status(200).json({ status: 'success', message: 'Akses kursus telah dikonfirmasi' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};