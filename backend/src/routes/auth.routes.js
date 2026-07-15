const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { generateOtp, sendOtpSms } = require('../services/otp.service');

const router = express.Router();

const TRIAL_DAYS = 7;

function trialEndsAt() {
  return new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ---------- Email + password auth ----------

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      subscription: { create: { status: 'TRIAL', trialEndsAt: trialEndsAt() } },
    },
  });

  res.status(201).json({ token: signToken(user.id), user: safeUser(user) });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
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

  const { phone } = parsed.data;
  const code = generateOtp();

  await prisma.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    return res.status(502).json({ error: 'Could not send OTP, please try again' });
  }

  res.json({ ok: true, message: 'OTP sent' });
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
  name: z.string().min(2).optional(), // used only if this is a brand-new user
});

// Step 2: verify the OTP. Creates the user on first-ever login with this phone.
router.post('/otp/verify', async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { phone, code, name } = parsed.data;

  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) return res.status(401).json({ error: 'Invalid or expired OTP' });

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        name: name || 'New User',
        subscription: { create: { status: 'TRIAL', trialEndsAt: trialEndsAt() } },
      },
    });
  }

  res.json({ token: signToken(user.id), user: safeUser(user) });
});

// ---------- Current user ----------

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

module.exports = router;
