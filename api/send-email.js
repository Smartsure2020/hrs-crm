import { requireAuth } from './_auth.js';

// Email sending handler via Resend
// Dev: logs the payload and returns success when RESEND_API_KEY_C is absent
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { to, subject, html, body } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required' });
  }

  // Dev stub
  if (!process.env.RESEND_API_KEY_C) {
    console.log('[send-email dev stub]', { to, subject });
    return res.status(200).json({ id: 'dev-stub', message: 'Email logged (no RESEND_API_KEY_C)' });
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY_C);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@hrsinsurance.co.za',
      to,
      subject,
      html: html || body || '',
    });
    if (error) throw new Error(error.message);
    return res.status(200).json({ id: data.id });
  } catch (err) {
    console.error('send-email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
