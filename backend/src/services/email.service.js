const nodemailer = require('nodemailer');

// Override with PLAY_STORE_URL if the listing URL ever changes.
const PLAY_STORE_URL = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.bikashkumar.resumeai';

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
    from: `"AiCarrier" <${process.env.GMAIL_USER}>`,
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
  const appUrl = PLAY_STORE_URL;
  const safeName = escapeHtml(name);
  const preview = 'Your AI resume and job prep partner is ready.';
  const steps = [
    ['Build your resume with AI.', 'Answer a few questions and get a professional resume in minutes.'],
    ['Fix your existing resume.', 'Upload it and get AI suggestions on wording, formatting and missing keywords.'],
    ['Apply with confidence.', 'Get help tailoring your resume and applications to each job.'],
    ['Prepare for your exam or interview.', 'Practice for IT interviews, bank exams and government job tests.'],
  ];

  const text = [
    `Hi ${name},`,
    '',
    'Welcome to AiCarrier! We\u2019re glad you\u2019re here.',
    '',
    'Whether you\u2019re applying for an IT job, a bank exam or a government post, AiCarrier helps you get ready faster. Here\u2019s how to start:',
    '',
    ...steps.map(([t, d]) => `- ${t} ${d}`),
    '',
    `Open AiCarrier on Google Play: ${appUrl}`,
    '',
    'Tip: if you already have a resume, upload it first. It takes about a minute, and you\u2019ll see exactly what to improve.',
    '',
    'Need help? Just reply to this email.',
    '',
    'All the best,',
    'Team AiCarrier',
  ].join('\n');

  const html = `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6">
<p>Hi ${safeName},</p>
<p>Welcome to AiCarrier! We\u2019re glad you\u2019re here.</p>
<p>Whether you\u2019re applying for an IT job, a bank exam or a government post, AiCarrier helps you get ready faster. Here\u2019s how to start:</p>
<ul>${steps.map(([t, d]) => `<li><strong>${t}</strong> ${d}</li>`).join('')}</ul>
<p style="margin:28px 0"><a href="${appUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block">Open AiCarrier</a></p>
<p><strong>Tip:</strong> if you already have a resume, upload it first. It takes about a minute, and you\u2019ll see exactly what to improve.</p>
<p>Need help? Just reply to this email.</p>
<p>All the best,<br>Team AiCarrier</p>
</div>`;

  await sendMail({
    to: email,
    subject: 'Welcome to AiCarrier, let\u2019s build your career \ud83c\udfaf',
    text,
    html,
  });
}

async function sendUpdateNoticeEmail(email, name) {
  const safeName = escapeHtml(name);
  const features = [
    'Search IT, government and bank jobs in one place',
    'Apply links for government and bank vacancies',
    'A new interview question bank with answer tips',
  ];
  await sendMail({
    to: email,
    subject: 'Update AiCarrier on Google Play for new features',
    text: [
      `Hi ${name},`,
      '',
      'A new version of AiCarrier is available on the Google Play Store. Please update the app to get:',
      '',
      ...features.map((f) => `- ${f}`),
      '',
      `Update now: ${PLAY_STORE_URL}`,
      '',
      'Need help? Just reply to this email.',
      '',
      'All the best,',
      'Team AiCarrier',
    ].join('\n'),
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6">
<p>Hi ${safeName},</p>
<p>A new version of AiCarrier is available on the Google Play Store. Please update the app to get:</p>
<ul>${features.map((f) => `<li>${f}</li>`).join('')}</ul>
<p style="margin:28px 0"><a href="${PLAY_STORE_URL}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;display:inline-block">Update on Google Play</a></p>
<p>Need help? Just reply to this email.</p>
<p>All the best,<br>Team AiCarrier</p>
</div>`,
  });
}

module.exports = { isEmailConfigured, sendPasswordResetCode, sendWelcomeEmail, sendUpdateNoticeEmail };
