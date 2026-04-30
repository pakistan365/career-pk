// Vercel Serverless Function — /api/subscribe.js
// Env vars:
// - RESEND_API_KEY (required)
// - RESEND_FROM_EMAIL (optional, default: Career Pakistan <hello@careerpk.co>)
// - RESEND_AUDIENCE_ID (optional)

const RESEND_API = 'https://api.resend.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let payload;
  try {
    payload = parseJsonBody(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const email = String(payload?.email || '').trim().toLowerCase();
  const name = String(payload?.name || '').trim();

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Email service not configured' });
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Career Pakistan <hello@careerpk.co>';
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  try {
    if (audienceId) {
      const contactResp = await fetch(`${RESEND_API}/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, first_name: name || undefined, unsubscribed: false }),
      });

      if (!contactResp.ok) {
        const errorJson = await contactResp.json().catch(() => ({}));
        const message = String(errorJson?.message || '').toLowerCase();
        if (contactResp.status === 409 || message.includes('already exists') || message.includes('duplicate')) {
          return res.status(409).json({ error: 'Email already subscribed' });
        }
      }
    }

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#0f766e;padding:20px 24px;color:#ffffff;">
            <h1 style="margin:0;font-size:24px;line-height:1.3;">Welcome to Career Pakistan 🎓</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Hi${name ? ` ${name}` : ''},</p>
            <p style="margin:0 0 12px;line-height:1.6;">You're officially subscribed! We'll send you curated updates on scholarships, jobs, internships, and exam opportunities across Pakistan.</p>
            <p style="margin:0 0 12px;line-height:1.6;">Stay ready for deadlines and apply early to maximize your chances.</p>
            <p style="margin:16px 0 0;">— Team Career Pakistan</p>
          </div>
          <div style="padding:16px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#475569;">
            You’re receiving this because you subscribed on Career Pakistan. You can unsubscribe any time from future emails.
          </div>
        </div>
      </div>
    `;

    const emailResp = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Welcome to Career Pakistan — You're in! 🎓",
        html,
      }),
    });

    if (!emailResp.ok) {
      const errorJson = await emailResp.json().catch(() => ({}));
      const message = String(errorJson?.message || '').toLowerCase();
      if (emailResp.status === 409 || message.includes('already exists') || message.includes('duplicate')) {
        return res.status(409).json({ error: 'Email already subscribed' });
      }
      return res.status(500).json({ error: 'Server error' });
    }

    return res.status(200).json({ ok: true, message: 'Subscribed successfully' });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
}
