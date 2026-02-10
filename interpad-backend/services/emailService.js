const nodemailer = require('nodemailer');

// Krijo dhe cache-oj transporterin që përdoret për dërgim emailash
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // për Gmail me portën 587 përdoret TLS (STARTTLS), jo secure=true
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
}

/**
 * Dërgon kodin e verifikimit në email-in e përdoruesit
 * @param {string} toEmail - email-i i marrësit
 * @param {string} code - kodi 6-shifror i verifikimit
 */
async function sendVerificationCodeEmail(toEmail, code) {
  const transporterInstance = getTransporter();

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'Your Interpad verification code',
    text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Your verification code</h2>
        <p>Your Interpad verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporterInstance.sendMail(mailOptions);
}

module.exports = {
  sendVerificationCodeEmail,
};


