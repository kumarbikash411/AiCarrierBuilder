const express = require('express');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  razorpay,
  createOrder,
  verifyPaymentSignature,
} = require('../services/razorpay.service');

const router = express.Router();
const ANNUAL_PLAN_AMOUNT = 49900;

router.get('/status', requireAuth, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  res.json(sub);
});

router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const order = await createOrder({
      amount: ANNUAL_PLAN_AMOUNT,
      currency: 'INR',
      receipt: `annual_${req.userId.slice(0, 18)}_${Date.now()}`,
      notes: { userId: req.userId, plan: 'ANNUAL_499' },
    });

    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    if (error.statusCode === 401) return res.status(401).json({ error: 'Razorpay authentication failed' });
    if (error.statusCode === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
});

router.post('/verify-payment', requireAuth, async (req, res, next) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Payment ID, order ID, and signature are required' });
  }

  try {
    const order = await razorpay.orders.fetch(razorpay_order_id);
    if (order.notes?.userId !== req.userId || order.amount !== ANNUAL_PLAN_AMOUNT || order.currency !== 'INR') {
      return res.status(400).json({ error: 'Order does not belong to this user' });
    }

    const valid = verifyPaymentSignature({
      orderId: order.id,
      razorpay_payment_id,
      razorpay_signature,
    });
    if (!valid) return res.status(400).json({ error: 'Signature verification failed' });

    const now = new Date();
    await prisma.subscription.update({
      where: { userId: req.userId },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
      },
    });

    res.json({ ok: true });
  } catch (error) {
    if (error.statusCode === 401) return res.status(401).json({ error: 'Razorpay authentication failed' });
    next(error);
  }
});

module.exports = router;
