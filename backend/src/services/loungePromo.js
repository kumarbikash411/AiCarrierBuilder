const prisma = require('../config/db');
const { isEmailConfigured, sendLoungePromoEmail } = require('./email.service');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let running = false;

// Sends the Lounge Remote promo email to every user with an email address once
// LOUNGE_PROMO_AT (ISO time, e.g. 2026-11-21T11:00:00+05:30) has passed.
// Idempotent via User.loungePromoSentAt, so redeploys never resend.
// Capped per run for Gmail's daily limit (LOUNGE_PROMO_LIMIT, default 400).
async function runIfDue() {
  const at = Date.parse(process.env.LOUNGE_PROMO_AT || '');
  if (Number.isNaN(at) || Date.now() < at || running) return;
  if (!isEmailConfigured()) return;

  running = true;
  try {
    const limit = Number(process.env.LOUNGE_PROMO_LIMIT) || 400;
    const users = await prisma.user.findMany({
      where: { email: { not: null }, loungePromoSentAt: null },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    if (!users.length) return;
    console.log(`[lounge-promo] sending to ${users.length} users`);
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await sendLoungePromoEmail(user.email, user.name || 'there');
        await prisma.user.update({ where: { id: user.id }, data: { loungePromoSentAt: new Date() } });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`[lounge-promo] failed for user ${user.id}: ${err.message}`);
        if (/quota|limit|too many/i.test(err.message)) break;
      }
      await sleep(1500);
    }
    console.log(`[lounge-promo] done sent=${sent} failed=${failed}`);
    // Stop retrying this run's failures every minute; they retry on next deploy/restart.
    if (failed) process.env.LOUNGE_PROMO_AT = '';
  } finally {
    running = false;
  }
}

function start() {
  if (!process.env.LOUNGE_PROMO_AT) return;
  console.log(`[lounge-promo] scheduled for ${process.env.LOUNGE_PROMO_AT}`);
  setInterval(() => runIfDue().catch((err) => console.error('[lounge-promo] error:', err.message)), 60 * 1000);
}

module.exports = { start };
