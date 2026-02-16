const sgMail = require('@sendgrid/mail');

// Konfigurimi i SendGrid – variablat nga .env:
// SENDGRID_API_KEY – API key nga SendGrid (obligativ)
// COMPANY_NAME – emri i kompanisë (subject + from name)
// EMAIL_REPLY_TO – adresa për përgjigje
// EMAIL_FROM – adresa "nga" e cila dërgohet (duhet të jetë e verifikuar në SendGrid)
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const COMPANY_NAME = process.env.COMPANY_NAME || 'Interpad';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set – email sending will fail.');
}

/**
 * Formaton adresën "From" për SendGrid (emri i kompanisë + email)
 */
function getFromAddress() {
  const email = EMAIL_FROM || 'noreply@example.com';
  return COMPANY_NAME ? { name: COMPANY_NAME, email } : email;
}

/**
 * Dërgon kodin e verifikimit në email-in e përdoruesit (SendGrid)
 * @param {string} toEmail - email-i i marrësit
 * @param {string} code - kodi 6-shifror i verifikimit
 */
async function sendVerificationCodeEmail(toEmail, code) {
  const from = getFromAddress();
  const msg = {
    to: toEmail,
    from,
    replyTo: EMAIL_REPLY_TO || undefined,
    subject: `Your ${COMPANY_NAME} verification code`,
    text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Your verification code</h2>
        <p>Your ${COMPANY_NAME} verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
}

/**
 * Dërgon email për reset password me link (SendGrid)
 * @param {string} toEmail - email-i i marrësit
 * @param {string} resetToken - token-i për reset password (plain text, jo hash)
 */
async function sendPasswordResetEmail(toEmail, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const from = getFromAddress();
  const msg = {
    to: toEmail,
    from,
    replyTo: EMAIL_REPLY_TO || undefined,
    subject: `Reset your ${COMPANY_NAME} password`,
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

  await sgMail.send(msg);
}

module.exports = {
  sendVerificationCodeEmail,
  sendPasswordResetEmail,
};
