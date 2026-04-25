// CareerHub Pakistan — seo.js (enhanced)
// Runs deferred: fixes canonical, ensures OG/Twitter completeness, injects breadcrumbs
(function () {
  const currentUrl = new URL(window.location.href);
  const SITE_URL = `${currentUrl.protocol}//${currentUrl.host}`;
  const DEFAULT_IMAGE = `${SITE_URL}/logo-banner.svg`;

  const ensureMeta = (attr, key, value) => {
    if (!value) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    if (!el.getAttribute('content')) el.setAttribute('content', value);
  };

  const title = (document.title || 'CareerHub Pakistan').trim();
  const descEl = document.querySelector('meta[name="description"]');
  const description = (descEl?.content || 'Find scholarships, jobs, internships, exams and books in one place.').trim();
  const current = currentUrl;
  
  // Canonical — normalise index.html → /
  const canonicalPath = current.pathname.endsWith('/index.html')
    ? current.pathname.replace('index.html', '')
    : current.pathname;
  const isSearch = canonicalPath === '/search.html';
  const canonicalUrl = `${SITE_URL}${canonicalPath}${isSearch ? current.search : ''}`;

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalUrl);

  // OG tags — only set if empty/missing
  ensureMeta('property', 'og:title', title);
  ensureMeta('property', 'og:description', description);
  ensureMeta('property', 'og:type', 'website');
  ensureMeta('property', 'og:url', canonicalUrl);
  ensureMeta('property', 'og:image', document.querySelector('meta[property="og:image"]')?.content || DEFAULT_IMAGE);
  ensureMeta('property', 'og:site_name', 'CareerHub Pakistan');
  ensureMeta('property', 'og:locale', 'en_PK');

  // Twitter
  ensureMeta('name', 'twitter:card', 'summary_large_image');
  ensureMeta('name', 'twitter:title', title);
  ensureMeta('name', 'twitter:description', description);
  ensureMeta('name', 'twitter:image', document.querySelector('meta[name="twitter:image"]')?.content || DEFAULT_IMAGE);
  ensureMeta('name', 'twitter:site', '@CareerHubPK');

  // Robots
  const noIndexPages = new Set(['/search.html', '/favorites.html']);
  const robots = noIndexPages.has(current.pathname)
    ? 'noindex, follow'
    : 'index, follow, max-image-preview:large';
  let robotsEl = document.querySelector('meta[name="robots"]');
  if (!robotsEl) {
    robotsEl = document.createElement('meta');
    robotsEl.setAttribute('name', 'robots');
    document.head.appendChild(robotsEl);
  }
  robotsEl.setAttribute('content', robots);

  // BreadcrumbList schema (auto-generated from pathname)
  const breadcrumbMap = {
    '/': [{ name: 'Home', url: '/' }],
    '/scholarships.html': [{ name: 'Home', url: '/' }, { name: 'Scholarships', url: '/scholarships.html' }],
    '/scholarships-national.html': [{ name: 'Home', url: '/' }, { name: 'Scholarships', url: '/scholarships.html' }, { name: 'National Scholarships', url: '/scholarships-national.html' }],
    '/scholarships-international.html': [{ name: 'Home', url: '/' }, { name: 'Scholarships', url: '/scholarships.html' }, { name: 'International Scholarships', url: '/scholarships-international.html' }],
    '/jobs.html': [{ name: 'Home', url: '/' }, { name: 'Jobs', url: '/jobs.html' }],
    '/jobs-government.html': [{ name: 'Home', url: '/' }, { name: 'Jobs', url: '/jobs.html' }, { name: 'Government Jobs', url: '/jobs-government.html' }],
    '/jobs-private.html': [{ name: 'Home', url: '/' }, { name: 'Jobs', url: '/jobs.html' }, { name: 'Private & NGO Jobs', url: '/jobs-private.html' }],
    '/internships.html': [{ name: 'Home', url: '/' }, { name: 'Internships', url: '/internships.html' }],
    '/exams.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }],
    '/exams-mdcat.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'MDCAT 2025', url: '/exams-mdcat.html' }],
    '/exams-css.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'CSS 2026', url: '/exams-css.html' }],
    '/exams-ppsc.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'PPSC 2025', url: '/exams-ppsc.html' }],
    '/books.html': [{ name: 'Home', url: '/' }, { name: 'Free Books', url: '/books.html' }],
    '/resume-builder.html': [{ name: 'Home', url: '/' }, { name: 'Resume Builder', url: '/resume-builder.html' }],
  };

  const crumbs = breadcrumbMap[canonicalPath];
  if (crumbs && crumbs.length > 1) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: SITE_URL + c.url
      }))
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }

  // Add FAQ schema helper — call window.addFAQSchema([{q,a}]) from page scripts
  window.addFAQSchema = function(items) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a }
      }))
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  };

})();
