const BLOG_PROXY_URL = '/api/sheets?sheet=Blogs';
const BLOG_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRciVbiyyI9Kk7LS99tAB3fAYMmMebHCAAi4WdpzKwPLKh0xb57GHRr99sN1audsiOqP2Ix_kx3Ocmo/pub?output=csv';
const FALLBACK_IMAGE = 'banner.png';

function safeText(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(v = '') {
  try {
    const parsed = new URL(String(v || '').trim(), window.location.origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return parsed.toString();
  } catch (_) {}
  return '';
}

function isEmailLike(v = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

function normalizeActionLink(v = '') {
  const raw = String(v || '').trim();
  if (!raw) return '';
  if (isEmailLike(raw)) return `mailto:${raw}`;
  return safeUrl(raw);
}

function isTeraboxUrl(v = '') {
  return /(?:^|\.)terabox\.com|1024terabox\.com|terashare/i.test(String(v || ''));
}

function imageWithFallback(src = '', alt = 'Image') {
  const safeSrc = safeUrl(src);
  return `<img loading="lazy" decoding="async" src="${safeSrc || FALLBACK_IMAGE}" alt="${safeText(alt)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">`;
}

function sanitizeRichText(raw = '') {
  const plain = String(raw).replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
  if (!plain) return '';
  return plain
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${safeText(chunk.replace(/\n+/g, ' '))}</p>`)
    .join('');
}

function dedupePosts(posts = []) {
  const seen = new Set();
  return posts.filter((post, index) => {
    const key = String(post.id || `${post.title}-${post.date || index}`).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeBlogPost(post = {}, index = 0) {
  return {
    id: String(post.id || `blog-${index + 1}`).trim(),
    title: String(post.title || '').trim(),
    category: String(post.category || '').trim(),
    description: String(post.description || post.details || '').trim(),
    short_description: String(post.short_description || '').trim(),
    image_url: String(post.image_url || '').trim(),
    author: String(post.author || '').trim(),
    date: String(post.date || post.posted_date || '').trim(),
    tags: String(post.tags || '').trim(),
    pdf_link: String(post.pdf_link || '').trim(),
    external_link: String(post.external_link || post.apply_link || post.source_link || '').trim(),
    featured: Boolean(post.featured || post.is_featured),
    tagsArray: String(post.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

async function fetchPosts() {
  if (typeof window.onCMSReady === 'function' && !(window.CMS_DATA?.Blogs || []).length) {
    await new Promise((resolve) => window.onCMSReady(resolve));
  }

  // 1) Prefer already-loaded CMS data so Blogs behave exactly like other tabs.
  const liveRows = (window.CMS_DATA && Array.isArray(window.CMS_DATA.Blogs)) ? window.CMS_DATA.Blogs : [];
  if (liveRows.length) {
    return dedupePosts(liveRows.map(normalizeBlogPost).filter((p) => p.title))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  // 2) If CMS data isn't ready yet, use same proxy/fallback pattern as loader.
  const tryUrls = [BLOG_PROXY_URL, BLOG_CSV_URL];
  for (const url of tryUrls) {
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const csv = await res.text();
      if (!csv || csv.trim().startsWith('{') || csv.trim().startsWith('<!')) continue;
      const rows = csv.trim().split(/\r?\n/);
      if (rows.length < 2) continue;
      const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
      const titleIdx = headers.findIndex((h) => h.includes('title'));
      if (titleIdx < 0) continue;
    } catch (_) {}
  }

  throw new Error('Could not load blog posts');
}

const adSlot = () => '<div class="ad-slot" aria-label="Advertisement">Ad Space</div>';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');

function initBlogListPage() {
  const list = document.getElementById('blogList');
  if (!list) return;

  const state = { page: 1, perPage: 6, q: '', cat: '', tag: '', posts: [], filtered: [] };
  const loadBtn = document.getElementById('loadMoreBtn');
  const tagsEl = document.getElementById('tagFilter');

  const applyFilters = () => {
    state.filtered = state.posts.filter((p) =>
      (!state.q || p.title.toLowerCase().includes(state.q) || (p.short_description || '').toLowerCase().includes(state.q)) &&
      (!state.cat || p.category === state.cat) &&
      (!state.tag || p.tagsArray.includes(state.tag))
    );
    state.page = 1;
    render();
  };

  const render = () => {
    const show = state.filtered.slice(0, state.page * state.perPage);
    list.innerHTML = show.length ? '' : '<p style="text-align:center;">No blog posts found.</p>';

    show.forEach((p, idx) => {
      const imageSrc = safeUrl(p.image_url);
      const imageHtml = imageWithFallback(imageSrc, p.title);
      list.insertAdjacentHTML('beforeend', `<article class="blog-card">${imageHtml}<div class="blog-card-body"><span class="chip">${safeText(p.category || 'General')}</span><h3>${safeText(p.title)}</h3><p>${safeText(p.short_description || '')}</p><div class="meta">${fmtDate(p.date)}</div><a class="btn btn-primary" href="blog-post.html?id=${encodeURIComponent(p.id)}">Read More</a></div></article>`);
      if ((idx + 1) % 4 === 0) list.insertAdjacentHTML('beforeend', adSlot());

      // TeraBox image fallback link (preview method when direct render is blocked).
      if (!imageSrc && isTeraboxUrl(p.image_url)) {
        list.insertAdjacentHTML('beforeend', `<p class="meta" style="margin-top:-8px;"><a href="${safeUrl(p.image_url)}" target="_blank" rel="noopener noreferrer">Open image source</a></p>`);
      }
    });

    loadBtn.style.display = show.length < state.filtered.length ? 'inline-flex' : 'none';
  };

  document.getElementById('blogSearch').addEventListener('input', (e) => { state.q = e.target.value.toLowerCase(); applyFilters(); });
  document.getElementById('categoryFilter').addEventListener('change', (e) => { state.cat = e.target.value; applyFilters(); });
  tagsEl.addEventListener('change', (e) => { state.tag = e.target.value; applyFilters(); });
  loadBtn.addEventListener('click', () => { state.page += 1; render(); });

  list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';

  fetchPosts()
    .then((posts) => {
      state.posts = posts;
      [...new Set(posts.flatMap((p) => p.tagsArray))]
        .forEach((tag) => tagsEl.insertAdjacentHTML('beforeend', `<option value="${safeText(tag)}">${safeText(tag)}</option>`));
      applyFilters();
    })
    .catch(() => {
      list.innerHTML = '<p style="text-align:center;">Could not load blog posts. Please try again later.<br><button type="button" onclick="location.reload()">Retry</button></p>';
    });
}

function initBlogPostPage() {
  const postTitle = document.getElementById('postTitle');
  if (!postTitle) return;

  const id = new URLSearchParams(location.search).get('id');
  fetchPosts()
    .then((posts) => {
      const post = posts.find((p) => p.id === id) || posts[0];
      if (!post) return;

      postTitle.textContent = post.title;
      document.getElementById('postMeta').textContent = `${post.category || 'General'} • ${fmtDate(post.date)}`;

      const postImageEl = document.getElementById('postImage');
      postImageEl.src = safeUrl(post.image_url) || FALLBACK_IMAGE;
      postImageEl.loading = 'lazy';
      postImageEl.onerror = () => { postImageEl.onerror = null; postImageEl.src = FALLBACK_IMAGE; };

      const contentHtml = sanitizeRichText(post.description || post.short_description || 'No content available.') || '<p>No content available.</p>';
      document.getElementById('postContent').innerHTML = contentHtml;

      const actions = document.getElementById('postActions');
      actions.innerHTML = '';
      const pdfUrl = normalizeActionLink(post.pdf_link);
      const externalUrl = normalizeActionLink(post.external_link);

      if (pdfUrl) {
        actions.insertAdjacentHTML('beforeend', `<a class="btn btn-secondary" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">View PDF</a>`);
        actions.insertAdjacentHTML('beforeend', `<a class="btn btn-ghost" href="${pdfUrl}" download rel="noopener noreferrer">Download PDF</a>`);
      }
      if (externalUrl) {
        actions.insertAdjacentHTML('beforeend', `<a class="btn btn-primary" href="${externalUrl}" target="_blank" rel="noopener noreferrer">Reference Link</a>`);
      }
      if (isTeraboxUrl(post.image_url)) {
        actions.insertAdjacentHTML('beforeend', `<a class="btn btn-ghost" href="${safeUrl(post.image_url)}" target="_blank" rel="noopener noreferrer">Open Image Source</a>`);
      }

      const related = posts.filter((p) => p.id !== post.id && (p.category === post.category || p.tagsArray.some((tag) => post.tagsArray.includes(tag)))).slice(0, 5);
      document.getElementById('relatedPosts').innerHTML = related.map((p) => `<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${safeText(p.title)}</a>`).join('');
      document.getElementById('latestPosts').innerHTML = posts.slice(0, 5).map((p) => `<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${safeText(p.title)}</a>`).join('');
    })
    .catch(() => {
      document.getElementById('postContent').innerHTML = '<p style="text-align:center;">Could not load blog posts. Please try again later.<br><button type="button" onclick="location.reload()">Retry</button></p>';
    });
}

function initHomeBlogHighlights() {
  const wrap = document.getElementById('homeBlogHighlights');
  if (!wrap) return;

  fetchPosts()
    .then((posts) => {
      const picks = posts.filter((p) => p.featured).slice(0, 5);
      const data = picks.length ? picks : posts.slice(0, 5);
      wrap.innerHTML = data.map((p) => `<article class="mini-blog-card">${imageWithFallback(p.image_url, p.title)}<h3>${safeText(p.title)}</h3><a href="blog-post.html?id=${encodeURIComponent(p.id)}">Read</a></article>`).join('');
    })
    .catch(() => {
      wrap.innerHTML = '<p style="text-align:center;">Could not load blog posts. Please try again later.<br><button type="button" onclick="location.reload()">Retry</button></p>';
    });
}
