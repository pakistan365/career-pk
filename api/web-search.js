// Vercel Serverless Function — /api/web-search.js
// Lightweight external search used only when internal Career Pakistan data is insufficient.

const DUCK_API = 'https://api.duckduckgo.com/';

function normalizeResult(item) {
  const title = String(item.Text || item.Heading || '').trim();
  const url = String(item.FirstURL || '').trim();
  return {
    title: title || url,
    snippet: title,
    url,
  };
}

function flattenTopics(topics = []) {
  const out = [];
  topics.forEach((topic) => {
    if (Array.isArray(topic.Topics)) {
      topic.Topics.forEach((sub) => out.push(sub));
    } else {
      out.push(topic);
    }
  });
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = String(req.query?.q || '').trim();
  const limit = Math.min(Number(req.query?.limit || 4), 8);

  if (!q) return res.status(400).json({ error: 'Missing q query parameter' });

  try {
    const url = `${DUCK_API}?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'CareerPakistanBot/1.0 (+https://careerpk.example)' },
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: `Search provider error (${upstream.status})` });
    }

    const data = await upstream.json();
    const related = flattenTopics(data?.RelatedTopics || [])
      .map(normalizeResult)
      .filter((r) => r.url)
      .slice(0, limit);

    if (!related.length && data?.AbstractURL) {
      related.push({
        title: data?.Heading || data?.AbstractURL,
        snippet: data?.AbstractText || 'Summary from external source',
        url: data?.AbstractURL,
      });
    }

    return res.status(200).json({ results: related });
  } catch (err) {
    return res.status(500).json({ error: `Search failed: ${err.message}` });
  }
}
