const midtransClient = require("midtrans-client");
const transactionModel = require("../models/transactionModel");
const adminOfflineRegistrationModel = require("../models/adminOfflineRegistrationModel");

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

exports.createOfflinePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const registration =
      await adminOfflineRegistrationModel.getOfflineRegistrationDetail(id);

    if (!registration) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Pendaftaran offline tidak ditemukan",
        });
    }

    if (
      registration.final_price === null ||
      registration.final_price === undefined ||
      registration.final_price === ""
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Harga belum ditentukan" });
    }

    const amount = Number(registration.final_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Harga belum ditentukan" });
    }

    const pendingTransaction = registration.transaction_id
      ? await transactionModel.getTransactionById?.(registration.transaction_id)
      : null;
    const existingTransaction =
      pendingTransaction && pendingTransaction.status_pembayaran === "pending"
        ? pendingTransaction
        : null;
    const orderId =
      existingTransaction?.order_id ||
      `OFF-${Date.now()}-${String(registration.id).slice(0, 8)}`;
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: registration.course_id,
          price: amount,
          quantity: 1,
          name: registration.course?.title || "Pendaftaran Offline",
        },
      ],
      customer_details: {
        first_name: registration.nama_lengkap,
        phone: registration.no_telp || registration.no_telp_ortu || undefined,
      },
    };

    const payment = await snap.createTransaction(parameter);
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const transaction = existingTransaction
      ? await transactionModel.updateStatus(orderId, {
          amount,
          status_pembayaran: "pending",
          snap_token: payment.token,
          redirect_url: payment.redirect_url || null,
          expired_at: expiredAt,
          is_confirmed_by_admin: false,
          offline_registration_id: registration.id,
        })
      : await transactionModel.createTransaction({
          user_id: registration.user_id,
          course_id: registration.course_id,
          order_id: orderId,
          amount,
          status_pembayaran: "pending",
          snap_token: payment.token,
          redirect_url: payment.redirect_url || null,
          expired_at: expiredAt,
          offline_registration_id: registration.id,
        });

    await adminOfflineRegistrationModel.updateOfflineRegistration(id, {
      transaction_id: transaction.id,
      status: "waiting_payment",
      payment_status: "waiting_payment",
      handled_by: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Pembayaran berhasil dibuat.",
      data: {
        transaction_id: transaction.id,
        snap_token: payment.token,
        redirect_url: payment.redirect_url || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
