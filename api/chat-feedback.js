// Vercel Serverless Function — /api/chat-feedback.js
// Run this in your Supabase SQL editor:
// create table chat_feedback (
//   id bigserial primary key,
//   rating text,
//   message text,
//   session_id text,
//   page text,
//   created_at timestamptz default now()
// );
// alter table chat_feedback enable row level security;
// create policy "insert only" on chat_feedback for insert with check (true);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const feedback = {
    rating: payload?.rating ?? null,
    message: payload?.message ?? null,
    session_id: payload?.sessionId ?? null,
    page: payload?.page ?? null,
  };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[Career Pakistan Feedback: no Supabase configured]', JSON.stringify(feedback));
    return res.status(200).json({ ok: true });
  }

  try {
    const insertUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/chat_feedback`;
    const upstream = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(feedback),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[Career Pakistan Feedback: Supabase insert failed]', upstream.status, errText);
    }
  } catch (error) {
    console.error('[Career Pakistan Feedback: unexpected insert error]', error);
  }

  return res.status(200).json({ ok: true });
}
