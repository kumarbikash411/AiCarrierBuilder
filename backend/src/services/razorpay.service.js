const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function getOrCreateCustomer({ name, email, phone }) {
  const customer = await razorpay.customers.create({
    name: name || 'ResumeAI User',
    email: email || undefined,
    contact: phone || undefined,
    fail_existing: 0,
  });
  return customer;
}

/**
 * Creates a subscription against the pre-configured ₹499/year plan.
 * Create the plan once in Razorpay Dashboard -> Subscriptions -> Plans
 * (amount ₹499, interval "yearly", period 1) and put its ID in
 * RAZORPAY_PLAN_ID_ANNUAL_499.
 */
async function createAnnualSubscription({ customerId, totalCount = 10 }) {
  return razorpay.subscriptions.create({
    plan_id: process.env.RAZORPAY_PLAN_ID_ANNUAL_499,
    customer_notify: 1,
    total_count: totalCount,
    notes: { app: 'resume-builder-ai' },
  });
}

function verifyPaymentSignature({ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }) {
  const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === razorpay_signature;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expected === signatureHeader;
}

module.exports = {
  razorpay,
  getOrCreateCustomer,
  createAnnualSubscription,
  verifyPaymentSignature,
  verifyWebhookSignature,
};
