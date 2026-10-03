import nodemailer from 'nodemailer';

/**
 * Sends an email via SMTP using env credentials (Gmail by default).
 *
 * If SMTP is not configured (e.g. local development), the message is
 * logged to the server console instead so verification / reset links
 * remain testable. Links are NEVER sent in API responses, so no
 * authentication secret ever reaches the frontend.
 *
 * If sending fails (bad credentials, network, ...), the error is logged
 * with full detail but NOT rethrown, so flows like registration still
 * succeed - check the server console if no email arrives.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(
      `\n[DEV EMAIL - not sent, SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM || `"Worker Management" <${SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error(
      `\n[EMAIL DELIVERY FAILED]\nTo: ${to}\nSubject: ${subject}\nReason: ${
        error?.response || error?.message
      }\nCheck SMTP_USER / SMTP_PASS in backend/.env.\n`
    );
  }
};

export default sendEmail;
