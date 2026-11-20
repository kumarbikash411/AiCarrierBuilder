const prisma = require('../config/db');
const { isEmailConfigured, sendWelcomeEmail } = require('./email.service');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sends the welcome email to existing email users who haven't received it.
// Idempotent: welcomeEmailSentAt is set after each successful send, so reruns
// and redeploys skip users already emailed. Capped per run to stay under
// Gmail's daily sending limit; rerun the next day for the remainder.
async function run() {
  const mode = process.env.WELCOME_BACKFILL;
  const limit = Number(process.env.WELCOME_BACKFILL_LIMIT) || 400;
  const where = { email: { not: null }, welcomeEmailSentAt: null };

  const pending = await prisma.user.count({ where });
  console.log(`[welcome-backfill] mode=${mode} pending=${pending} limit=${limit}`);
  if (mode !== 'true') return;
  if (!isEmailConfigured()) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD not set');

  const users = await prisma.user.findMany({ where, take: limit, orderBy: { createdAt: 'asc' } });
  let sent = 0;
  let failed = 0;
  for (const user of users) {
    try {
      await sendWelcomeEmail(user.email, user.name || 'there');
      await prisma.user.update({ where: { id: user.id }, data: { welcomeEmailSentAt: new Date() } });
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[welcome-backfill] failed for user ${user.id}: ${err.message}`);
      if (/quota|limit|too many/i.test(err.message)) break;
    }
    await sleep(1500);
  }
  console.log(`[welcome-backfill] done sent=${sent} failed=${failed} remaining=${pending - sent}`);
}

module.exports = { run };
