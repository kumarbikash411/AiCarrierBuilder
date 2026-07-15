const express = require('express');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  getOrCreateCustomer,
  createAnnualSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../services/razorpay.service');

const router = express.Router();

router.get('/status', requireAuth, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  res.json(sub);
});

router.post('/create', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  const customer = await getOrCreateCustomer({ name: user.name, email: user.email, phone: user.phone });
  const rzpSubscription = await createAnnualSubscription({ customerId: customer.id });

  await prisma.subscription.update({
    where: { userId: req.userId },
    data: { razorpayCustomerId: customer.id, razorpaySubscriptionId: rzpSubscription.id },
  });

  res.json({ subscriptionId: rzpSubscription.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID });
});

router.post('/verify', requireAuth, async (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;
  const valid = verifyPaymentSignature({ razorpay_payment_id, razorpay_subscription_id, razorpay_signature });
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
});

// Mounted with express.raw() in server.js so the signature check gets the raw body
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const valid = verifyWebhookSignature(req.body, signature);
  if (!valid) return res.status(400).json({ error: 'Invalid webhook signature' });

  const event = JSON.parse(req.body.toString());
  const subEntity = event.payload?.subscription?.entity;
  if (!subEntity) return res.json({ ok: true });

  const sub = await prisma.subscription.findFirst({ where: { razorpaySubscriptionId: subEntity.id } });
  if (!sub) return res.json({ ok: true });

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(subEntity.current_start * 1000),
          currentPeriodEnd: new Date(subEntity.current_end * 1000),
        },
      });
      break;
    case 'subscription.pending':
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } });
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELLED' } });
      break;
  }

  res.json({ ok: true });
});

module.exports = router;
