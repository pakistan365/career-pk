// Vercel Serverless Function — /api/web-search.js
// Set BRAVE_SEARCH_API_KEY env var. Free tier: 2,000 queries/month at api.search.brave.com

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';
const DUCK_API = 'https://api.duckduckgo.com/';
const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 10;

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeDuckResult(item) {
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

function dedupeByUrl(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function searchWithBrave(q, limit) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  const url = new URL(BRAVE_API);
  url.searchParams.set('q', q);
  url.searchParams.set('count', String(limit));
  url.searchParams.set('country', 'pk');
  url.searchParams.set('search_lang', 'en');

  const upstream = await fetch(url, {
    headers: {
      'X-Subscription-Token': apiKey,
      Accept: 'application/json',
    },
  });

  if (!upstream.ok) {
    throw new Error(`Search provider error (${upstream.status})`);
  }

  const data = await upstream.json();
  const results = (data?.web?.results || [])
    .map((item) => ({
      title: String(item?.title || item?.url || '').trim(),
      snippet: String(item?.description || '').trim(),
      url: String(item?.url || '').trim(),
    }))
    .filter((item) => item.url)
    .slice(0, limit);

  return dedupeByUrl(results);
}

async function searchWithDuckDuckGo(q, limit) {
  const url = `${DUCK_API}?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'CareerPakistanBot/1.0 (+https://careerpk.example)' },
  });

  if (!upstream.ok) {
    throw new Error(`Search provider error (${upstream.status})`);
  }

  const data = await upstream.json();
  const related = dedupeByUrl(
    flattenTopics(data?.RelatedTopics || [])
      .map(normalizeDuckResult)
      .filter((r) => r.url)
      .slice(0, limit)
  );

  if (!related.length && data?.AbstractURL) {
    related.push({
      title: data?.Heading || data?.AbstractURL,
      snippet: data?.AbstractText || 'Summary from external source',
      url: data?.AbstractURL,
    });
  }

  return related;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = String(req.query?.q || '').trim();
  const limit = parseLimit(req.query?.limit);

  if (!q) return res.status(400).json({ error: 'Missing q query parameter' });

  try {
    const braveResults = await searchWithBrave(q, limit);
    if (braveResults) {
      return res.status(200).json({ results: braveResults });
    }

    const duckResults = await searchWithDuckDuckGo(q, limit);
    return res.status(200).json({ results: duckResults });
  } catch (err) {
    return res.status(500).json({ error: `Search failed: ${err.message}` });
  }
}
