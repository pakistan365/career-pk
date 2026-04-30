// Vercel Serverless Function — /api/deadline-alerts.js
// Supabase SQL:
// create table push_subscriptions (
//   id bigserial primary key,
//   subscription jsonb not null,
//   favorites jsonb not null default '[]'::jsonb,
//   created_at timestamptz default now()
// );
//
// vercel.json cron example:
// {
//   "crons": [
//     { "path": "/api/deadline-alerts?secret=@cron_secret", "schedule": "0 4 * * *" }
//   ]
// }

import crypto from 'node:crypto';

function base64urlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function base64urlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function toUrlSafeBase64(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeVapidJwt(aud, subject, privateKeyPem) {
  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = base64urlEncode(
    JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject })
  );
  const signingInput = `${header}.${payload}`;
  const sigDer = crypto.sign('sha256', Buffer.from(signingInput), privateKeyPem);
  const sigRaw = derToJose(sigDer, 'ES256');
  return `${signingInput}.${toUrlSafeBase64(sigRaw)}`;
}

function derToJose(signature) {
  const sig = Buffer.from(signature);
  let offset = 3;
  const rLen = sig[3];
  const r = sig.slice(4, 4 + rLen);
  offset = 4 + rLen + 1;
  const sLen = sig[offset];
  const s = sig.slice(offset + 1, offset + 1 + sLen);
  return Buffer.concat([r.length < 32 ? Buffer.concat([Buffer.alloc(32 - r.length), r]) : r.slice(-32), s.length < 32 ? Buffer.concat([Buffer.alloc(32 - s.length), s]) : s.slice(-32)]);
}

function getDaysLeft(deadline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

async function sendWebPush(subscription, payload, vapidKeys) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Invalid subscription object');

  const endpointUrl = new URL(endpoint);
  const aud = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = makeVapidJwt(aud, vapidKeys.email, vapidKeys.privateKey);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '86400',
      'Content-Type': 'application/json',
      'Content-Encoding': 'aes128gcm',
      Authorization: `WebPush ${jwt}`,
      Urgency: 'normal',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok && resp.status !== 201) {
    const text = await resp.text();
    throw new Error(`Push failed (${resp.status}): ${text}`);
  }

  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.query?.secret;
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  try {
    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/push_subscriptions?select=id,subscription,favorites`;
    const upstream = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      return res.status(500).json({ error: `Supabase query failed: ${txt}` });
    }

    const rows = await upstream.json();
    let sent = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const favorites = Array.isArray(row?.favorites) ? row.favorites : [];
        const upcoming = favorites
          .map((fav) => ({ ...fav, daysLeft: getDaysLeft(fav?.deadline) }))
          .filter((fav) => Number.isFinite(fav.daysLeft) && fav.daysLeft >= 0 && fav.daysLeft <= 7)
          .sort((a, b) => a.daysLeft - b.daysLeft);

        if (!upcoming.length) continue;

        const top = upcoming[0];
        const title = top.title || top.name || 'A saved opportunity';
        const payload = {
          title: 'Deadline approaching!',
          body: `${title} closes in ${top.daysLeft} day${top.daysLeft === 1 ? '' : 's'}`,
          url: '/favorites',
        };

        await sendWebPush(row.subscription, payload, {
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
          email: VAPID_EMAIL,
        });
        sent += 1;
      } catch {
        errors += 1;
      }
    }

    return res.status(200).json({ sent, errors });
  } catch (error) {
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}
