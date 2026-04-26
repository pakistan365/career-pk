// Vercel Serverless Function — /api/gemini-chat.js
// Unified AI proxy with provider fallback (Gemini first, optional Groq).

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function normalizeBody(req) {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
}

function toGroqMessages(payload) {
  const systemText = payload?.system_instruction?.parts?.map((p) => p.text).join('\n') || '';
  const messages = [];
  if (systemText) messages.push({ role: 'system', content: systemText });

  const contents = Array.isArray(payload?.contents) ? payload.contents : [];
  contents.forEach((item) => {
    const role = item?.role === 'model' ? 'assistant' : 'user';
    const content = Array.isArray(item?.parts)
      ? item.parts.map((p) => p?.text || '').join('\n').trim()
      : '';
    if (content) messages.push({ role, content });
  });

  return messages;
}

async function callGemini(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key is not configured.');

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.message || 'Gemini API request failed.');
  }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error('No response text from Gemini.');
  return { reply, provider: 'gemini', model: GEMINI_MODEL };
}

async function callGroq(payload) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key is not configured.');

  const body = {
    model: GROQ_MODEL,
    messages: toGroqMessages(payload),
    temperature: payload?.generationConfig?.temperature ?? 0.7,
    max_tokens: payload?.generationConfig?.maxOutputTokens ?? 500,
  };

  const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    throw new Error(data?.error?.message || 'Groq API request failed.');
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('No response text from Groq.');
  return { reply, provider: 'groq', model: GROQ_MODEL };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let payload;
  try {
    payload = normalizeBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

    const providerMode = String(req.query?.provider || payload?.provider || 'auto').toLowerCase();
  
  try {
    if (providerMode === 'groq') {
      const response = await callGroq(payload);
      return res.status(200).json(response);
    }

    if (providerMode === 'gemini') {
      const response = await callGemini(payload);
      return res.status(200).json(response);
    }

      // auto mode: Gemini first, then Groq fallback
    try {
      const response = await callGemini(payload);
      return res.status(200).json(response);
    } catch (geminiError) {
      const fallback = await callGroq(payload);
      return res.status(200).json({ ...fallback, fallbackFrom: `gemini: ${geminiError.message}` });
    }
  } catch (err) {
    return res.status(500).json({ error: `AI provider error: ${err.message}` });
  }
}
