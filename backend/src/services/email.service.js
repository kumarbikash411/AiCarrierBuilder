const axios = require('axios');

async function sendPasswordResetCode(email, code) {
  const { RESEND_API_KEY, RESET_EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !RESET_EMAIL_FROM) {
    const error = new Error('Password reset email is not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }

  await axios.post(
    'https://api.resend.com/emails',
    {
      from: RESET_EMAIL_FROM,
      to: [email],
      subject: 'Your AiCarrierBuilder password reset code',
      text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<p>Your AiCarrierBuilder password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    },
    { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
  );
}

module.exports = { sendPasswordResetCode };
