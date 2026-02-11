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

/**
 * Dërgon email për reset password me link
 * @param {string} toEmail - email-i i marrësit
 * @param {string} resetToken - token-i për reset password (plain text, jo hash)
 */
async function sendPasswordResetEmail(toEmail, resetToken) {
  const transporterInstance = getTransporter();

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from,
    to: toEmail,
    subject: 'Reset your Interpad password',
    text: `You requested to reset your password. Click the link below to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your password</h2>
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <p style="margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporterInstance.sendMail(mailOptions);
}

module.exports = {
  sendVerificationCodeEmail,
  sendPasswordResetEmail,
};


