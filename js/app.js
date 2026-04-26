// ============================================================
// Career Pakistan — app.js  (v4 — always reads window.CMS_DATA)
// ============================================================
// IMPORTANT: Never cache window.CMS_DATA into a local const.
// Always read via window.CMS_DATA so live updates are reflected.
// ============================================================

// ── Utility: fetch sheet data from live window.CMS_DATA ──────
function fetchSheet(sheetName) {
  return Promise.resolve((window.CMS_DATA[sheetName] || []).slice());
}
function whenCMSReady(fn) {
  if (typeof window.onCMSReady === 'function') {
    window.onCMSReady(fn);
    return;
  }
  fn(window.CMS_DATA || {});
}
function text(value) {
  return String(value ?? '');
}

function normalizeText(value) {
  return text(value).trim().toLowerCase();
}

function matchesFilterValue(value, filterValue) {
  if (!filterValue) return true;
  return normalizeText(value) === normalizeText(filterValue);
}

function includesFilterValue(value, filterValue) {
  if (!filterValue) return true;
  return normalizeText(value).includes(normalizeText(filterValue));
}

function isGovernmentType(value) {
  const normalized = normalizeText(value);
  return normalized === 'government' ||
    normalized === 'govt' ||
    normalized.includes('government') ||
    normalized.includes('govt') ||
    normalized.includes('public sector');
}

function isPakistanValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return normalized === 'pakistan' || normalized === 'pk' || /\bpakistan\b/.test(normalized);
}

function scholarshipMatchesCountry(scholarship, selectedCountry) {
  if (!selectedCountry) return true;
  const selected = normalizeText(selectedCountry);
  const country = text(scholarship.country);
  const location = text(scholarship.location);
  const type = text(scholarship.type);
  const fields = [country, location, type];

  if (selected === 'pakistan') {
    return fields.some(isPakistanValue);
  }
  if (selected === 'international') {
    const explicitlyInternational = fields.some(v => includesFilterValue(v, 'international'));
    const hasCountry = normalizeText(country).length > 0;
    return explicitlyInternational || (hasCountry && !isPakistanValue(country));
  }

  return fields.some(v => matchesFilterValue(v, selectedCountry));
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url) {
  const raw = text(url).trim();
  if (!raw) return '#';
  try {
    const parsed = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
    return parsed.href;
  } catch {
    return '#';
  }
}

function escapeJsSingleQuote(value) {
  return text(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/<\/script/gi, '<\\/script');
}

// ── Days until deadline ──────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function urgencyBadge(deadline) {
  const d = daysUntil(deadline);
  if (d === null) return '';
  if (d < 0)  return '<span class="badge badge-expired">Expired</span>';
  if (d <= 7)  return `<span class="badge badge-urgent">⚡ ${d}d left</span>`;
  if (d <= 30) return `<span class="badge badge-soon">🔔 ${d}d left</span>`;
  return '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Favourites (localStorage) ────────────────────────────────
function getFavs() {
  try { return JSON.parse(localStorage.getItem('ch_favs') || '[]'); } catch { return []; }
}
function toggleFav(id, title, type) {
  let favs = getFavs();
  const idx = favs.findIndex(f => f.id === id && f.type === type);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push({ id, title, type }); }
  localStorage.setItem('ch_favs', JSON.stringify(favs));
  updateFavCount();
  return idx < 0; // true = added
}
function isFav(id, type) {
  return getFavs().some(f => f.id === id && f.type === type);
}
function updateFavCount() {
  const el = document.getElementById('favCount');
  if (el) el.textContent = getFavs().length;
}

// ── Tag chips ────────────────────────────────────────────────
function renderTags(tags) {
  if (!tags) return '';
  return tags.split(',').slice(0, 3).map(t =>
    `<span class="tag">${t.trim()}</span>`
  ).join('');
}

// ── Fallback image ───────────────────────────────────────────
function imgSrc(url, type) {
  if (!url || url.includes('REPLACE_WITH')) {
    const icons = {
      scholarship: '🎓', job: '💼', internship: '🚀', exam: '📋', book: '📚'
    };
    return null; // use emoji placeholder
  }
  return url;
}

// ── Card renderers ───────────────────────────────────────────
function cardScholarship(s) {
  const fav = isFav(s.id, 'scholarship');
  const src = imgSrc(s.image_url, 'scholarship');
  const imgHTML = src
    ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(s.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  return `
  <div class="card" data-id="${s.id}" data-type="scholarship">
    <div class="card-img">
      ${imgHTML}
      <div class="card-img-placeholder" style="${src ? 'display:none' : ''}">🎓</div>
      ${s.is_featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
      ${urgencyBadge(s.deadline)}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-tag">${escapeHtml(s.type || '')}</span>
        <span class="card-tag fund-${escapeHtml((s.funding || '').toLowerCase().replace(/\s+/g, '-'))}">${escapeHtml(s.funding || '')}</span>
      </div>
      <h3 class="card-title">${escapeHtml(s.title)}</h3>
      <p class="card-desc">${escapeHtml(s.description)}</p>
      <div class="card-details">
        ${s.location ? `<span><i class="fa fa-map-marker-alt"></i> ${escapeHtml(s.location)}</span>` : ''}
        ${s.level ? `<span><i class="fa fa-graduation-cap"></i> ${escapeHtml(s.level)}</span>` : ''}
        ${s.deadline ? `<span><i class="fa fa-calendar"></i> ${formatDate(s.deadline)}</span>` : ''}
      </div>
      ${renderTags(s.tags)}
    </div>
    <div class="card-footer">
      <a href="${safeUrl(s.apply_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Apply Now <i class="fa fa-arrow-right"></i></a>
      <button class="btn-fav ${fav ? 'active' : ''}" onclick="handleFav(${Number(s.id) || 0},'${escapeJsSingleQuote(s.title)}','scholarship',this)" aria-label="Save">
        <i class="fa${fav ? 's' : 'r'} fa-bookmark"></i>
      </button>
    </div>
  </div>`;
}

function cardJob(j) {
  const fav = isFav(j.id, 'job');
  const src = imgSrc(j.image_url, 'job');
  const imgHTML = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(j.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  return `
  <div class="card" data-id="${j.id}" data-type="job">
    <div class="card-img">
      ${imgHTML}
      <div class="card-img-placeholder" style="${src ? 'display:none' : ''}">💼</div>
      ${j.is_featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
      ${urgencyBadge(j.deadline)}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-tag">${escapeHtml(j.type || '')}</span>
        <span class="card-tag">${escapeHtml(j.category || '')}</span>
      </div>
      <h3 class="card-title">${escapeHtml(j.title)}</h3>
      <p class="card-desc">${escapeHtml(j.description)}</p>
      <div class="card-details">
        ${j.location ? `<span><i class="fa fa-map-marker-alt"></i> ${escapeHtml(j.location)}</span>` : ''}
        ${j.salary ? `<span><i class="fa fa-money-bill"></i> ${escapeHtml(j.salary)}</span>` : ''}
        ${j.deadline ? `<span><i class="fa fa-calendar"></i> ${formatDate(j.deadline)}</span>` : ''}
      </div>
      ${renderTags(j.tags)}
    </div>
    <div class="card-footer">
      <a href="${safeUrl(j.apply_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Apply Now <i class="fa fa-arrow-right"></i></a>
      <button class="btn-fav ${fav ? 'active' : ''}" onclick="handleFav(${Number(j.id) || 0},'${escapeJsSingleQuote(j.title)}','job',this)">
        <i class="fa${fav ? 's' : 'r'} fa-bookmark"></i>
      </button>
    </div>
  </div>`;
}

function cardInternship(i) {
  const fav = isFav(i.id, 'internship');
  const src = imgSrc(i.image_url, 'internship');
  const imgHTML = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(i.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  const paidClass = (i.type || '').toLowerCase() === 'paid' ? 'paid' : 'unpaid';
  return `
  <div class="card" data-id="${i.id}" data-type="internship">
    <div class="card-img">
      ${imgHTML}
      <div class="card-img-placeholder" style="${src ? 'display:none' : ''}">🚀</div>
      ${i.is_featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
      ${urgencyBadge(i.deadline)}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-tag ${paidClass}">${escapeHtml(i.type || '')}</span>
        ${i.duration ? `<span class="card-tag">${escapeHtml(i.duration)}</span>` : ''}
      </div>
      <h3 class="card-title">${escapeHtml(i.title)}</h3>
      <p class="card-desc">${escapeHtml(i.description)}</p>
      <div class="card-details">
        ${i.location ? `<span><i class="fa fa-map-marker-alt"></i> ${escapeHtml(i.location)}</span>` : ''}
        ${i.stipend ? `<span><i class="fa fa-money-bill"></i> ${escapeHtml(i.stipend)}</span>` : ''}
        ${i.deadline ? `<span><i class="fa fa-calendar"></i> ${formatDate(i.deadline)}</span>` : ''}
      </div>
      ${renderTags(i.tags)}
    </div>
    <div class="card-footer">
      <a href="${safeUrl(i.apply_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Apply Now <i class="fa fa-arrow-right"></i></a>
      <button class="btn-fav ${fav ? 'active' : ''}" onclick="handleFav(${Number(i.id) || 0},'${escapeJsSingleQuote(i.title)}','internship',this)">
        <i class="fa${fav ? 's' : 'r'} fa-bookmark"></i>
      </button>
    </div>
  </div>`;
}

function cardExam(e) {
  const src = imgSrc(e.image_url, 'exam');
  const imgHTML = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(e.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  return `
  <div class="card" data-id="${e.id}" data-type="exam">
    <div class="card-img">
      ${imgHTML}
      <div class="card-img-placeholder" style="${src ? 'display:none' : ''}">📋</div>
      ${urgencyBadge(e.test_date)}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-tag">${escapeHtml(e.exam_type || '')}</span>
        ${e.fee ? `<span class="card-tag">${escapeHtml(e.fee)}</span>` : ''}
      </div>
      <h3 class="card-title">${escapeHtml(e.title)}</h3>
      <div class="card-details">
        ${e.test_date ? `<span><i class="fa fa-calendar"></i> Test: ${formatDate(e.test_date)}</span>` : ''}
        ${e.eligibility ? `<span><i class="fa fa-user-check"></i> ${escapeHtml(e.eligibility)}</span>` : ''}
        ${e.conducting_body ? `<span><i class="fa fa-building"></i> ${escapeHtml(e.conducting_body)}</span>` : ''}
      </div>
      ${renderTags(e.tags)}
    </div>
    <div class="card-footer exam-links">
      ${e.registration_link ? `<a href="${safeUrl(e.registration_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Register <i class="fa fa-arrow-right"></i></a>` : ''}
      ${e.syllabus_link ? `<a href="${safeUrl(e.syllabus_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Syllabus</a>` : ''}
      ${e.past_papers_link ? `<a href="${safeUrl(e.past_papers_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Past Papers</a>` : ''}
    </div>
  </div>`;
}

function cardBook(b) {
  const src = imgSrc(b.image_url, 'book');
  const imgHTML = src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(b.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : '';
  return `
  <div class="card" data-id="${b.id}" data-type="book">
    <div class="card-img">
      ${imgHTML}
      <div class="card-img-placeholder" style="${src ? 'display:none' : ''}">📚</div>
      ${b.is_free ? '<span class="featured-badge free-badge">📥 Free PDF</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-tag">${escapeHtml(b.exam_type || '')}</span>
        ${b.language ? `<span class="card-tag">${escapeHtml(b.language)}</span>` : ''}
      </div>
      <h3 class="card-title">${escapeHtml(b.title)}</h3>
      <div class="card-details">
        ${b.author ? `<span><i class="fa fa-user"></i> ${escapeHtml(b.author)}</span>` : ''}
        ${b.edition ? `<span><i class="fa fa-book"></i> ${escapeHtml(b.edition)}</span>` : ''}
        ${b.category ? `<span><i class="fa fa-tag"></i> ${escapeHtml(b.category)}</span>` : ''}
      </div>
      ${renderTags(b.tags)}
    </div>
    <div class="card-footer">
      ${b.is_free && b.download_link ? `<a href="${safeUrl(b.download_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">📥 Download PDF</a>` : ''}
      ${b.buy_link ? `<a href="${safeUrl(b.buy_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">🛒 Buy</a>` : ''}
    </div>
  </div>`;
}

// ── Generic renderCards dispatcher ───────────────────────────
function renderCards(items, gridId, type) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (!items || items.length === 0) {
    grid.innerHTML = '';
    return;
  }
  const renderers = {
    scholarship: cardScholarship,
    job: cardJob,
    internship: cardInternship,
    exam: cardExam,
    book: cardBook
  };
  const fn = renderers[type] || cardScholarship;
  grid.innerHTML = items.map(fn).join('');
  
  // Ensure cards are always visible — force opacity & visibility
  // This is the primary visibility fix for all sub-pages
  const cards = grid.querySelectorAll('.card, .exam-card');
  cards.forEach((card) => {
    card.classList.add('visible');
    card.style.opacity = '1';
    card.style.transform = 'translateY(0)';
    card.style.visibility = 'visible';
  });
  // Also trigger IntersectionObserver re-scan for smooth animation
  setTimeout(() => {
    if (typeof observeCards === 'function') observeCards();
  }, 60);
}

// ── Favourite handler ─────────────────────────────────────────
function handleFav(id, title, type, btn) {
  const added = toggleFav(id, title, type);
  if (btn) {
    btn.classList.toggle('active', added);
    btn.querySelector('i').className = `fa${added ? 's' : 'r'} fa-bookmark`;
  }
}

// ── Sort helper ───────────────────────────────────────────────
function sortItems(items, sort) {
  const arr = [...items];
  if (sort === 'deadline') {
    arr.sort((a, b) => {
      const da = a.deadline || a.test_date || '9999';
      const db = b.deadline || b.test_date || '9999';
      return new Date(da) - new Date(db);
    });
  } else if (sort === 'oldest') {
    arr.sort((a, b) => new Date(a.posted_date || 0) - new Date(b.posted_date || 0));
  } else {
    arr.sort((a, b) => new Date(b.posted_date || 0) - new Date(a.posted_date || 0));
  }
  return arr;
}

// ── Homepage data loader ──────────────────────────────────────
function loadHomePageData() {

  const scholarships = window.CMS_DATA.Scholarships || [];
  const jobs         = window.CMS_DATA.Jobs || [];
  const internships  = window.CMS_DATA.Internships || [];
  const books        = window.CMS_DATA.Books || [];

  renderCards(scholarships.slice(0, 4), 'scholarshipsGrid', 'scholarship');
  renderCards(jobs.slice(0, 4), 'jobsGrid', 'job');
  renderCards(books.slice(0, 4), 'booksGrid', 'book');
  renderCards(internships.slice(0, 4), 'internshipsGrid', 'internship');
}

// ── Notification bar loader ───────────────────────────────────
function loadNotifications() {
  const track = document.getElementById('notifTrack');
  if (!track) return;
  const notifs = (window.CMS_DATA.Notifications || []).filter(n => n.is_active);
  if (notifs.length === 0) return;
  const html = notifs.map(n =>
    `<a href="${safeUrl(n.link)}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none;">${escapeHtml(n.message)}</a>`
).join('&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;');
  track.innerHTML = `<span>${html}&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;${html}</span>`;
}

// ── AI chatbot fallback loader (ensures toggle on every page) ─
function ensureChatbotLoaded() {
  if (document.querySelector('script[src*="gemini-chatbot.js"]')) return;
  const script = document.createElement('script');
  script.src = 'js/gemini-chatbot.js';
  script.defer = true;
  (document.body || document.head || document.documentElement).appendChild(script);
}

// ── Navbar toggle ─────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('navLinks')?.classList.toggle('open');
  document.getElementById('hamburger')?.classList.toggle('open');
}
function toggleSearch() {
  document.getElementById('navSearch')?.classList.toggle('open');
  document.getElementById('navSearchInput')?.focus();
}

// ── Dark mode ─────────────────────────────────────────────────
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('ch_dark', isDark);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = isDark ? '<i class="fa fa-sun"></i>' : '<i class="fa fa-moon"></i>';
}
function initDarkMode() {
  if (localStorage.getItem('ch_dark') === 'true') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.innerHTML = '<i class="fa fa-sun"></i>';
  }
}

// ── Popup modal ───────────────────────────────────────────────
function showPopup() {
  const urgent = (window.CMS_DATA.Scholarships || []).find(s => {
    const d = daysUntil(s.deadline);
    return d !== null && d > 0 && d <= 30;
  });
  if (!urgent) return;
  document.getElementById('popupTitle').textContent = text(urgent.title);
  document.getElementById('popupDesc').textContent = text(urgent.description);
  document.getElementById('popupDeadline').textContent = formatDate(urgent.deadline);
  document.getElementById('popupLink').href = safeUrl(urgent.apply_link);
  document.getElementById('popupOverlay').style.display = 'block';
  document.getElementById('popupModal').style.display = 'block';
}
function closePopup() {
  document.getElementById('popupOverlay').style.display = 'none';
  document.getElementById('popupModal').style.display = 'none';
}

// ── Search page ───────────────────────────────────────────────
function runSearch(query) {
  if (!query) return;
  const q = query.toLowerCase();
  const results = [];

  (window.CMS_DATA.Scholarships || []).forEach(s => {
    if ((text(s.title) + text(s.description) + text(s.tags)).toLowerCase().includes(q))
      results.push({...s, _type:'scholarship'});
  });
  (window.CMS_DATA.Jobs || []).forEach(j => {
    if ((text(j.title) + text(j.description) + text(j.tags)).toLowerCase().includes(q))
      results.push({...j, _type:'job'});
  });
  (window.CMS_DATA.Internships || []).forEach(i => {
    if ((text(i.title) + text(i.description) + text(i.tags)).toLowerCase().includes(q))
      results.push({...i, _type:'internship'});
  });
  (window.CMS_DATA.Exams || []).forEach(e => {
    if ((text(e.title) + text(e.tags)).toLowerCase().includes(q))
      results.push({...e, _type:'exam'});
  });
  (window.CMS_DATA.Books || []).forEach(b => {
    if ((text(b.title) + text(b.tags) + text(b.author)).toLowerCase().includes(q))
      results.push({...b, _type:'book'});
  });

  const grid = document.getElementById('searchResultsGrid');
  const count = document.getElementById('searchResultsCount');
  if (count) count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`;
  if (grid) {
    if (results.length === 0) {
      grid.innerHTML = '<div class="empty-state"><i class="fa fa-search"></i><h3>No results found</h3><p>Try different keywords.</p></div>';
    } else {
      grid.innerHTML = results.map(item => {
        if (item._type === 'scholarship') return cardScholarship(item);
        if (item._type === 'job') return cardJob(item);
        if (item._type === 'internship') return cardInternship(item);
        if (item._type === 'exam') return cardExam(item);
        if (item._type === 'book') return cardBook(item);
        return '';
      }).join('');
    }
  }
}

// ── Favorites page ────────────────────────────────────────────
function loadFavoritesPage() {
  const favs = getFavs();
  const grid = document.getElementById('favoritesGrid');
  const count = document.getElementById('favCount');
  if (count) count.textContent = favs.length;
  if (!grid) return;
  if (favs.length === 0) {
    grid.innerHTML = '<div class="empty-state"><i class="fa fa-bookmark"></i><h3>No saved items</h3><p>Browse scholarships, jobs and more to save items.</p></div>';
    return;
  }
  const allData = {
    scholarship: window.CMS_DATA.Scholarships || [],
    job: window.CMS_DATA.Jobs || [],
    internship: window.CMS_DATA.Internships || [],
    exam: window.CMS_DATA.Exams || [],
    book: window.CMS_DATA.Books || []
  };
  const cards = [];
  favs.forEach(fav => {
    const item = (allData[fav.type] || []).find(x => x.id === fav.id);
    if (!item) return;
    if (fav.type === 'scholarship') cards.push(cardScholarship(item));
    else if (fav.type === 'job') cards.push(cardJob(item));
    else if (fav.type === 'internship') cards.push(cardInternship(item));
    else if (fav.type === 'exam') cards.push(cardExam(item));
    else if (fav.type === 'book') cards.push(cardBook(item));
  });
  grid.innerHTML = cards.join('');
}

// ── Init on DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateFavCount();
  ensureChatbotLoaded();
  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
  });
  // Run CMS-dependent things only after data is ready
   whenCMSReady(() => {
    loadNotifications();
    updateFavCount();
    // Popup on homepage after 4s
    if (document.getElementById('popupModal')) {
      setTimeout(showPopup, 4000);
    }
    // Search page (fallback if search.html didn't handle it)
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q && document.getElementById('searchResultsGrid')) {
      const input = document.getElementById('searchQueryInput');
      if (input) input.value = q;
      runSearch(q);
    }
  });
});

// ── Scroll-triggered card animations ────────────────────────
(function () {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  // Expose globally so renderCards can trigger re-scan
  window.observeCards = function observeCards() {
    document.querySelectorAll('.card:not(.visible), .exam-card:not(.visible)').forEach(c => io.observe(c));
  };
  window.observeCards();

  // Re-run after CMS renders cards
  const cardGrids = ['scholarshipsGrid','jobsGrid','booksGrid','internshipsGrid','examsGrid','cardsGrid','resultsGrid','searchResultsGrid','favoritesGrid'];
  function hookGrids() {
    cardGrids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._observed) {
        el._observed = true;
        new MutationObserver(() => setTimeout(window.observeCards, 50)).observe(el, { childList: true });
      }
    });
  }
  document.addEventListener('DOMContentLoaded', hookGrids);
  setTimeout(hookGrids, 500);
})();

// ── Animated counter for hero stats ─────────────────────────
function animateCounter(el, target, suffix) {
  let start = 0;
  const duration = 1200;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const counters = [
    { id: 'statScholarships', target: 500, suffix: '+' },
    { id: 'statJobs',         target: 1200, suffix: '+' },
    { id: 'statExams',        target: 50,  suffix: '+' },
    { id: 'statBooks',        target: 300, suffix: '+' },
  ];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const counter = counters.find(c => c.id === el.id);
      if (counter) animateCounter(el, counter.target, counter.suffix);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) io.observe(el);
  });
}
document.addEventListener('DOMContentLoaded', initCounters);

// ── Navbar scroll shadow ─────────────────────────────────────
(function() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();
