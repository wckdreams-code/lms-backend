const midtransClient = require('midtrans-client');
const transactionModel = require('../models/transactionModel');

// Inisialisasi Midtrans
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

exports.checkout = async (req, res) => {
  try {
    const { course_id, amount, course_title } = req.body;
    const orderId = `ORDER-${Date.now()}-${req.user.id}`;

    // 1. Buat parameter untuk Midtrans
    let parameter = {
      "transaction_details": {
        "order_id": orderId,
        "gross_amount": amount
      },
      "customer_details": {
        "first_name": req.user.email, // Ambil dari supabase auth user
      },
      "item_details": [{
        "id": course_id,
        "price": amount,
        "quantity": 1,
        "name": course_title
      }]
    };

    // 2. Dapatkan Snap Token
    const transaction = await snap.createTransaction(parameter);
    
    // 3. Simpan ke database kita (Status: pending)
    await transactionModel.createTransaction({
      user_id: req.user.id,
      course_id: course_id,
      order_id: orderId,
      amount: amount,
      status_pembayaran: 'pending'
    });

    res.status(200).json({
      status: 'success',
      snap_token: transaction.token
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Webhook untuk menerima notifikasi otomatis dari Midtrans
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

// Admin mengonfirmasi akses kursus
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