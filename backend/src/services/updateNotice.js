const prisma = require('../config/db');
const { isEmailConfigured, sendUpdateNoticeEmail } = require('./email.service');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let running = false;

// Sends the "update the app" email to every user with an email address once
// UPDATE_NOTICE_AT (ISO time, e.g. 2026-11-21T11:00:00+05:30) has passed.
// Idempotent via User.updateNoticeSentAt, so redeploys never resend.
// Capped per run for Gmail's daily limit (UPDATE_NOTICE_LIMIT, default 400).
async function runIfDue() {
  const at = Date.parse(process.env.UPDATE_NOTICE_AT || '');
  if (Number.isNaN(at) || Date.now() < at || running) return;
  if (!isEmailConfigured()) return;

  running = true;
  try {
    const limit = Number(process.env.UPDATE_NOTICE_LIMIT) || 400;
    const users = await prisma.user.findMany({
      where: { email: { not: null }, updateNoticeSentAt: null },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    if (!users.length) return;
    console.log(`[update-notice] sending to ${users.length} users`);
    let sent = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await sendUpdateNoticeEmail(user.email, user.name || 'there');
        await prisma.user.update({ where: { id: user.id }, data: { updateNoticeSentAt: new Date() } });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`[update-notice] failed for user ${user.id}: ${err.message}`);
        if (/quota|limit|too many/i.test(err.message)) break;
      }
      await sleep(1500);
    }
    console.log(`[update-notice] done sent=${sent} failed=${failed}`);
    // Stop retrying this run's failures every minute; they retry on next deploy/restart.
    if (failed) process.env.UPDATE_NOTICE_AT = '';
  } finally {
    running = false;
  }
}

function start() {
  if (!process.env.UPDATE_NOTICE_AT) return;
  console.log(`[update-notice] scheduled for ${process.env.UPDATE_NOTICE_AT}`);
  setInterval(() => runIfDue().catch((err) => console.error('[update-notice] error:', err.message)), 60 * 1000);
}

module.exports = { start };
