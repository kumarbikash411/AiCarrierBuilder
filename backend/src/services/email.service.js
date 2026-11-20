const nodemailer = require('nodemailer');

let transporter;

function isEmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!isEmailConfigured()) {
    const error = new Error('Email is not configured (set GMAIL_USER and GMAIL_APP_PASSWORD)');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function sendMail({ to, subject, text, html }) {
  await getTransporter().sendMail({
    from: `"AiCarrierBuilder" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

async function sendPasswordResetCode(email, code) {
  await sendMail({
    to: email,
    subject: 'Your AiCarrierBuilder password reset code',
    text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your AiCarrierBuilder password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
}

async function sendWelcomeEmail(email, name) {
  await sendMail({
    to: email,
    subject: 'Welcome to AiCarrierBuilder',
    text: `Hi ${name}, welcome to AiCarrierBuilder! Build your resume, prep for interviews and match jobs with AI.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Welcome to AiCarrierBuilder! Build your resume, prep for interviews and match jobs with AI.</p>`,
  });
}

module.exports = { isEmailConfigured, sendPasswordResetCode, sendWelcomeEmail };
