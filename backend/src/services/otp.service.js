const axios = require('axios');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

/**
 * Sends an OTP SMS via MSG91. If MSG91 credentials aren't configured (e.g.
 * during local development), the OTP is just logged to the console instead
 * of failing — so you can test the full login flow before paying for SMS
 * credits. Swap this out for Twilio or any other provider if you prefer;
 * only this function needs to change.
 */
async function sendOtpSms(phone, code) {
  const { MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID } = process.env;

  if (!MSG91_AUTH_KEY) {
    console.log(`[DEV MODE] OTP for ${phone}: ${code} (configure MSG91_AUTH_KEY to send real SMS)`);
    return;
  }

  await axios.post(
    'https://control.msg91.com/api/v5/otp',
    {
      mobile: phone,
      otp: code,
      sender: MSG91_SENDER_ID,
      template_id: MSG91_TEMPLATE_ID,
    },
    { headers: { authkey: MSG91_AUTH_KEY } }
  );
}

module.exports = { generateOtp, sendOtpSms };
