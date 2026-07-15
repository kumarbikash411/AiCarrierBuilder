const prisma = require('../config/db');

async function requireActiveSubscription(req, res, next) {
  const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  if (!sub) return res.status(402).json({ error: 'No subscription found', action: 'subscribe' });

  const now = new Date();
  const trialValid = sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt > now;
  const paidValid = sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd > now;

  if (!trialValid && !paidValid) {
    return res.status(402).json({
      error: 'Your trial has ended. Subscribe for ₹499/year to keep using AI features.',
      action: 'renew',
    });
  }
  next();
}

module.exports = { requireActiveSubscription };
