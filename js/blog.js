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
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = parseCSVRow(lines[0]).map(h=>h.trim());
  return lines.slice(1).map(line => {
    const values = parseCSVRow(line);
    const item = {};
    headers.forEach((h,i)=> item[h] = (values[i] || '').trim());
    item.tagsArray = (item.tags || '').split(',').map(t=>t.trim()).filter(Boolean);
    item.featured = /^true$/i.test(item.featured || '');
    return item;
  }).filter(p => p.id && p.title);
}

async function fetchPosts() {
  let csv = '';
  try {
    const proxyRes = await fetch(BLOG_PROXY_URL, { cache: 'no-store' });
    if (!proxyRes.ok) throw new Error('Proxy failed: ' + proxyRes.status);
    csv = await proxyRes.text();
  } catch (e) {
    const res = await fetch(BLOG_CSV_URL, { cache: 'no-store' });
    csv = await res.text();
  }
  return parseCSV(csv).sort((a,b)=> new Date(b.date||0)-new Date(a.date||0));
}

function adSlot(){ return '<div class="ad-slot">Ad Space</div>'; }
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
      list.insertAdjacentHTML('beforeend', `<article class="blog-card"><img src="${p.image_url||'banner.png'}" alt="${p.title}"><div class="blog-card-body"><span class="chip">${p.category||'General'}</span><h3>${p.title}</h3><p>${p.short_description||''}</p><div class="meta">${fmtDate(p.date)}</div><a class="btn btn-primary" href="blog-post.html?id=${encodeURIComponent(p.id)}">Read More</a></div></article>`);
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
    tags.forEach(t => tagsEl.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));
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
    document.getElementById('postImage').src = post.image_url || 'banner.png';
    const desc = post.description || '';
    const blocks = desc.split(/<\/p>/i);
    const content = [];
    blocks.forEach((b,i)=>{ content.push(b + (b.includes('<p')?'</p>':'')); if (i===2) content.push(adSlot()); });
    document.getElementById('postContent').innerHTML = content.join('');
    const actions = document.getElementById('postActions');
    if (post.pdf_link) actions.insertAdjacentHTML('beforeend', `<a class="btn btn-secondary" href="${post.pdf_link}" target="_blank" rel="noopener">View PDF</a>`);
    if (post.external_link) actions.insertAdjacentHTML('beforeend', `<a class="btn btn-primary" href="${post.external_link}" target="_blank" rel="noopener">Reference Link</a>`);

    const related = posts.filter(p => p.id!==post.id && (p.category===post.category || p.tagsArray.some(t=>post.tagsArray.includes(t)))).slice(0,5);
    document.getElementById('relatedPosts').innerHTML = related.map(p=>`<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${p.title}</a>`).join('');
    document.getElementById('latestPosts').innerHTML = posts.slice(0,5).map(p=>`<a href="blog-post.html?id=${encodeURIComponent(p.id)}">${p.title}</a>`).join('');
  });
}

function initHomeBlogHighlights() {
  const wrap = document.getElementById('homeBlogHighlights');
  if (!wrap) return;
  fetchPosts().then(posts => {
    const picks = posts.filter(p=>p.featured).slice(0,5);
    const data = picks.length ? picks : posts.slice(0,5);
    wrap.innerHTML = data.slice(0,5).map(p=>`<article class="mini-blog-card"><img src="${p.image_url||'banner.png'}" alt="${p.title}"><h3>${p.title}</h3><a href="blog-post.html?id=${encodeURIComponent(p.id)}">Read</a></article>`).join('');
  });
}
