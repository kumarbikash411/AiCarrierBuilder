const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const { rateLimit } = require('express-rate-limit');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateOtp, sendOtpSms } = require('../services/otp.service');
const { isEmailConfigured, sendPasswordResetCode, sendLoginCode, sendWelcomeEmail } = require('../services/email.service');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

function normalisePhone(phone) {
  return phone.replace(/[\s()-]/g, '');
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function referralCode() {
  return `CAREER-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function makeUniqueReferralCode(client) {
  // A collision is extremely unlikely, but avoid relying on probability for a unique database field.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = referralCode();
    const existing = await client.user.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error('Could not create referral code');
}

async function validateReferrer(client, rawCode) {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return null;
  const referrer = await client.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!referrer) {
    const error = new Error('Invalid referral code');
    error.statusCode = 400;
    throw error;
  }
  return referrer;
}

async function createReferredUser(client, data, rawReferralCode) {
  const referrer = await validateReferrer(client, rawReferralCode);
  const code = await makeUniqueReferralCode(client);
  const user = await client.user.create({ data: { ...data, referralCode: code, referredById: referrer?.id } });
  if (referrer) {
    await client.user.update({ where: { id: referrer.id }, data: { points: { increment: 500 } } });
    await client.referralReward.create({ data: { referrerId: referrer.id, referredUserId: user.id, pointsAwarded: 500 } });
  }
  return user;
}

// ---------- Email + password auth ----------

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  referralCode: z.string().trim().max(32).optional(),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, password } = parsed.data;
  const email = normaliseEmail(parsed.data.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.$transaction((tx) => createReferredUser(tx, { name, email, passwordHash }, parsed.data.referralCode));
    // Fire and forget: a mail failure must not fail signup.
    if (isEmailConfigured()) {
      sendWelcomeEmail(email, name)
        .then(() => prisma.user.update({ where: { id: user.id }, data: { welcomeEmailSentAt: new Date() } }))
        .catch((err) => console.error('Welcome email failed:', err.message));
    }
    return res.status(201).json({ token: signToken(user.id), user: safeUser(user) });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    throw err;
  }
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { password } = parsed.data;
  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

// ---------- Email password recovery ----------

const resetSendLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many reset code requests. Please try again later.' },
});
const resetCompleteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please request a new code later.' },
});

const resetEmailSchema = z.object({ email: z.string().email() });
router.post('/password-reset/email/send', resetSendLimit, asyncHandler(async (req, res) => {
  const parsed = resetEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address' });

  // Return the same response whether or not the account exists.
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Password recovery email is not configured yet' });
  }

  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return res.json({ ok: true, message: 'If an account exists for this email, a reset code has been sent.' });
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const otp = await prisma.$transaction(async (tx) => {
    await tx.otpCode.updateMany({
      where: { email, purpose: 'PASSWORD_RESET', consumed: false },
      data: { consumed: true },
    });
    return tx.otpCode.create({
      data: { email, purpose: 'PASSWORD_RESET', code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
  });

  try {
    await sendPasswordResetCode(email, code);
  } catch (err) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } }).catch(() => {});
    console.error('Password reset email failed:', err.response?.data || err.message);
    return res.status(err.code === 'EMAIL_NOT_CONFIGURED' ? 503 : 502).json({
      error: 'Could not send a reset code right now. Please try again later.',
    });
  }

  res.json({ ok: true, message: 'If an account exists for this email, a reset code has been sent.' });
}));

const completeResetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(8),
});
router.post('/password-reset/email/complete', resetCompleteLimit, asyncHandler(async (req, res) => {
  const parsed = completeResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email, 6-digit code, and password of at least 8 characters' });

  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return res.status(400).json({ error: 'Invalid or expired reset code' });

  const otp = await prisma.otpCode.findFirst({
    where: {
      email,
      purpose: 'PASSWORD_RESET',
      code: parsed.data.code,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return res.status(400).json({ error: 'Invalid or expired reset code' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.otpCode.updateMany({
        where: { id: otp.id, consumed: false, expiresAt: { gt: new Date() } },
        data: { consumed: true },
      });
      if (consumed.count !== 1) {
        const error = new Error('Invalid or expired reset code');
        error.statusCode = 400;
        throw error;
      }
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    throw err;
  }

  res.json({ ok: true, message: 'Password reset successfully. You can now log in.' });
}));

// ---------- Email one-time-code login (existing accounts only) ----------

router.post('/otp/email/send', resetSendLimit, asyncHandler(async (req, res) => {
  const parsed = resetEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!isEmailConfigured()) return res.status(503).json({ error: 'Login email is not configured yet' });

  const email = normaliseEmail(parsed.data.email);
  const generic = { ok: true, message: 'If an account exists for this email, a login code has been sent.' };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json(generic);

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const otp = await prisma.$transaction(async (tx) => {
    await tx.otpCode.updateMany({ where: { email, purpose: 'EMAIL_LOGIN', consumed: false }, data: { consumed: true } });
    return tx.otpCode.create({
      data: { email, purpose: 'EMAIL_LOGIN', code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
  });

  try {
    await sendLoginCode(email, code);
  } catch (err) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } }).catch(() => {});
    console.error('Login code email failed:', err.response?.data || err.message);
    return res.status(502).json({ error: 'Could not send a login code right now. Please try again later.' });
  }
  res.json(generic);
}));

const verifyEmailOtpSchema = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) });
router.post('/otp/email/verify', resetCompleteLimit, asyncHandler(async (req, res) => {
  const parsed = verifyEmailOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and 6-digit code' });

  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  const bad = () => res.status(401).json({ error: 'Invalid or expired code' });
  if (!user) return bad();

  const otp = await prisma.otpCode.findFirst({
    where: { email, purpose: 'EMAIL_LOGIN', code: parsed.data.code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return bad();

  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumed: false, expiresAt: { gt: new Date() } },
    data: { consumed: true },
  });
  if (consumed.count !== 1) return bad();

  res.json({ token: signToken(user.id), user: safeUser(user) });
}));

// ---------- Phone + OTP auth ----------

const phoneSchema = z.object({ phone: z.string().min(10).max(15) });

// Step 1: request an OTP for a given phone number (works for both new and
// returning users — we decide whether to create an account at verify time).
router.post('/otp/send', async (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const phone = normalisePhone(parsed.data.phone);
  const code = generateOtp();

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    console.error('OTP delivery failed:', err.response?.data || err.message);
    return res.status(502).json({ error: 'Could not send OTP, please try again' });
  }

  // Only make a code valid after the SMS provider has accepted delivery.
  await prisma.otpCode.create({
    data: { phone, purpose: 'LOGIN', code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  res.json({ ok: true, message: 'OTP sent' });
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
  name: z.string().min(2).optional(), // used only if this is a brand-new user
  referralCode: z.string().trim().max(32).optional(),
});

// Step 2: verify the OTP. Creates the user on first-ever login with this phone.
router.post('/otp/verify', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { code, name, referralCode: enteredReferralCode } = parsed.data;
  const phone = normalisePhone(parsed.data.phone);

  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose: 'LOGIN', code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return res.status(401).json({ error: 'Invalid or expired OTP' });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    try {
      user = await prisma.$transaction((tx) => createReferredUser(tx, { phone, name: name || 'New User' }, enteredReferralCode));
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
  }

  // Keep the OTP usable when an entered referral code is invalid, but consume it
  // as soon as login or new-account creation succeeds.
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

// ---------- Current user ----------

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

router.get('/referral', requireAuth, async (req, res) => {
  let user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.referralCode) {
    const code = await makeUniqueReferralCode(prisma);
    user = await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
  }
  const referrals = await prisma.referralReward.count({ where: { referrerId: user.id } });
  res.json({ referralCode: user.referralCode, points: user.points, referrals, pointsPerReferral: 500 });
});

module.exports = router;
