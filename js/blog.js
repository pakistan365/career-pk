const BLOG_PROXY_URL = '/api/sheets?sheet=Blog';
const BLOG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRciVbiyyI9Kk7LS99tAB3fAYMmMebHCAAi4WdpzKwPLKh0xb57GHRr99sN1audsiOqP2Ix_kx3Ocmo/pub?output=csv';

function parseCSVRow(row) {
  const out = []; let cur=''; let q=false;
  for (let i=0;i<row.length;i++) {
    const ch=row[i], nx=row[i+1];
    if (ch==='"') { if (q && nx==='"') { cur+='"'; i++; } else q=!q; }
    else if (ch===',' && !q) { out.push(cur); cur=''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

function parseCSV(csv) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const nx = csv[i + 1];

    if (ch === '"') {
      if (inQuotes && nx === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && nx === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];

  const expectedHeaders = ['id', 'title', 'category', 'description', 'short_description', 'image_url', 'author', 'date', 'tags', 'pdf_link', 'external_link', 'featured'];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ''));

  return rows.slice(1).map((values) => {
    const item = {};
    expectedHeaders.forEach((key) => {
      const idx = headers.indexOf(key);
      item[key] = idx >= 0 ? (values[idx] || '').trim() : '';
    });
    item.tagsArray = (item.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
    item.featured = /^(true|1|yes)$/i.test(item.featured || '');
    return item;
  }).filter((post) => post.id && post.title);
}

const safeText = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const safeUrl = (value = '') => {
  try {
    const u = new URL(String(value), window.location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch (_) {}
  return '';
};

function sanitizeRichText(raw = '') {
  const text = String(raw).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  return text
    .split(/\n{2,}/)
    .map(p => `<p>${safeText(p.trim())}</p>`)
    .join('');
}

function isValidBlogCsv(text = '') {
  const sample = String(text || '').trim();
  if (!sample) return false;
  if (sample.startsWith('{') || sample.startsWith('<!')) return false;
  const firstLine = sample.split(/\r?\n/, 1)[0].toLowerCase();
  return firstLine.includes('id') && firstLine.includes('title');
}

async function fetchPosts() {
  let csv = '';
  try {
    const proxyRes = await fetch(BLOG_PROXY_URL, { cache: 'no-store' });
    if (!proxyRes.ok) throw new Error('Proxy failed: ' + proxyRes.status);
    csv = await proxyRes.text();
    if (!isValidBlogCsv(csv)) throw new Error('Proxy returned non-CSV payload');
  } catch (e) {
    const res = await fetch(BLOG_CSV_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Direct CSV failed: ' + res.status);
    csv = await res.text();
  }
  return parseCSV(csv).sort((a,b)=> new Date(b.date||0)-new Date(a.date||0));
}

function adSlot(){ return '<div class="ad-slot" aria-label="Advertisement">Ad Space</div>'; }
function fmtDate(d){ return d ? new Date(d).toLocaleDateString() : ''; }

function initBlogListPage() {
  const state = { page:1, perPage:6, q:'', cat:'', tag:'', posts:[], filtered:[] };
  const list = document.getElementById('blogList');
  const loadBtn = document.getElementById('loadMoreBtn');
  const tagsEl = document.getElementById('tagFilter');

  function applyFilters() {
    state.filtered = state.posts.filter(p =>
      (!state.q || p.title.toLowerCase().includes(state.q) || (p.short_description||'').toLowerCase().includes(state.q)) &&
      (!state.cat || p.category===state.cat) &&
      (!state.tag || p.tagsArray.includes(state.tag))
    );
    state.page = 1;
    render();
  }

  function render() {
    const show = state.filtered.slice(0, state.page * state.perPage);
    list.innerHTML = '';
    show.forEach((p, idx) => {
      list.insertAdjacentHTML('beforeend', `<article class="blog-card"><img loading="lazy" decoding="async" src="${safeUrl(p.image_url)||'banner.png'}" alt="${safeText(p.title)}"><div class="blog-card-body"><span class="chip">${safeText(p.category||'General')}</span><h3>${safeText(p.title)}</h3><p>${safeText(p.short_description||'')}</p><div class="meta">${fmtDate(p.date)}</div><a class="btn btn-primary" href="blog-post.html?id=${encodeURIComponent(p.id)}">Read More</a></div></article>`);
      if ((idx+1)%4===0) list.insertAdjacentHTML('beforeend', adSlot());
    });
    loadBtn.style.display = show.length < state.filtered.length ? 'inline-flex':'none';
  }

  document.getElementById('blogSearch').addEventListener('input', e=>{state.q=e.target.value.toLowerCase();applyFilters();});
  document.getElementById('categoryFilter').addEventListener('change', e=>{state.cat=e.target.value;applyFilters();});
  tagsEl.addEventListener('change', e=>{state.tag=e.target.value;applyFilters();});
  loadBtn.addEventListener('click', ()=>{state.page++;render();});

  fetchPosts().then(posts=>{
    state.posts = posts;
    const tags = [...new Set(posts.flatMap(p=>p.tagsArray))];
    tags.forEach(t => tagsEl.insertAdjacentHTML('beforeend', `<option value="${safeText(t)}">${safeText(t)}</option>`));
    applyFilters();
  });
}

function initBlogPostPage() {
  const id = new URLSearchParams(location.search).get('id');
  fetchPosts().then(posts => {
    const post = posts.find(p => p.id === id) || posts[0];
    if (!post) return;
    document.getElementById('postTitle').textContent = post.title;
    document.getElementById('postMeta').textContent = `${post.category || 'General'} • ${fmtDate(post.date)}`;
    document.getElementById('postImage').src = safeUrl(post.image_url) || 'banner.png';
    document.getElementById('postImage').loading = 'lazy';
    const sanitized = sanitizeRichText(post.description || post.short_description || 'No content available.');
    const content = sanitized ? sanitized.split(/<\/p>/i).map((b, i) => `${b}</p>${i===2 ? adSlot() : ''}`).join('') : '<p>No content available.</p>';
    document.getElementById('postContent').innerHTML = content;
    const actions = document.getElementById('postActions');
    const pdfUrl = safeUrl(post.pdf_link);
    const externalUrl = safeUrl(post.external_link);
    if (pdfUrl) actions.insertAdjacentHTML('beforeend', `<a class="btn btn-secondary" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">View PDF</a>`);
    if (externalUrl) actions.insertAdjacentHTML('beforeend', `<a class="btn btn-primary" href="${externalUrl}" target="_blank" rel="noopener noreferrer">Reference Link</a>`);
    
    const related = posts.filter(p => p.id!==post.id && (p.category===post.category || p.tagsArray.some(t=>post.tagsArray.includes(t)))).slice(0,5);
    document.getElementById('relatedPosts').innerHTML = related.map(p=>`<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${safeText(p.title)}</a>`).join('');
    document.getElementById('latestPosts').innerHTML = posts.slice(0,5).map(p=>`<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${safeText(p.title)}</a>`).join('');
  });
}

function initHomeBlogHighlights() {
  const wrap = document.getElementById('homeBlogHighlights');
  if (!wrap) return;
  fetchPosts().then(posts => {
    const picks = posts.filter(p=>p.featured).slice(0,5);
    const data = picks.length ? picks : posts.slice(0,5);
    wrap.innerHTML = data.slice(0,5).map(p=>`<article class="mini-blog-card"><img loading="lazy" decoding="async" src="${safeUrl(p.image_url)||'banner.png'}" alt="${safeText(p.title)}"><h3>${safeText(p.title)}</h3><a href="blog-post.html?id=${encodeURIComponent(p.id)}">Read</a></article>`).join('');
  });
}
