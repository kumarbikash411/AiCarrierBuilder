const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createOrder({ amount, currency = 'INR', receipt, notes }) {
  if (!Number.isInteger(amount) || amount < 100) {
    const error = new Error('Amount must be at least 100 paise');
    error.statusCode = 400;
    throw error;
  }

  return razorpay.orders.create({ amount, currency, receipt, notes });
}

function verifyPaymentSignature({ orderId, razorpay_payment_id, razorpay_signature }) {
  const body = `${orderId}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  const received = Buffer.from(razorpay_signature, 'utf8');
  const generated = Buffer.from(expected, 'utf8');
  return received.length === generated.length && crypto.timingSafeEqual(generated, received);
}

module.exports = {
  razorpay,
  createOrder,
  verifyPaymentSignature,
};
