const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateOtp, sendOtpSms } = require('../services/otp.service');

const router = express.Router();

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
    data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
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
    where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
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
