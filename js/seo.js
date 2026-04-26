// Career Pakistan — central SEO manager
(function () {
  const currentUrl = new URL(window.location.href);
  const siteUrl = `${currentUrl.protocol}//${currentUrl.host}`;
  const defaultImage = `${siteUrl}/logo-banner.svg`;

  const pageSEO = {
    '/': {
      title: 'Career Pakistan — Scholarships, Jobs, Internships, Exams & Books',
      description: 'Explore scholarships, jobs, internships, exam updates, and study books in one place for Pakistani students and professionals.'
    },
    '/scholarships.html': {
      title: 'Scholarships in Pakistan | Career Pakistan',
      description: 'Find the latest national and international scholarships for Pakistani students, including fully funded and need-based options.'
    },
    '/scholarships-national.html': {
      title: 'National Scholarships in Pakistan | Career Pakistan',
      description: 'Browse national scholarship opportunities in Pakistan including HEC, provincial, and merit-based programs.'
    },
    '/scholarships-international.html': {
      title: 'International Scholarships for Pakistanis | Career Pakistan',
      description: 'Discover international scholarship opportunities for Pakistani students across undergraduate, masters, and PhD levels.'
    },
    '/jobs.html': {
      title: 'Jobs in Pakistan — Government, Private & NGO | Career Pakistan',
      description: 'Search the latest jobs in Pakistan including government, private sector, NGO, and remote opportunities.'
    },
    '/jobs-government.html': {
      title: 'Government Jobs in Pakistan | Career Pakistan',
      description: 'Latest government jobs in Pakistan from federal and provincial departments with regularly updated listings.'
    },
    '/jobs-private.html': {
      title: 'Private, NGO & Remote Jobs in Pakistan | Career Pakistan',
      description: 'Find private company, NGO, and remote jobs in Pakistan across technology, healthcare, media, and more.'
    },
    '/internships.html': {
      title: 'Internships in Pakistan | Career Pakistan',
      description: 'Explore paid and unpaid internship opportunities in Pakistan for students and fresh graduates.'
    },
    '/exams.html': {
      title: 'Exam Preparation Hub — MDCAT, CSS, PPSC & More | Career Pakistan',
      description: 'Get exam guidance, dates, and resources for MDCAT, CSS, PPSC, FPSC, IELTS, NTS and other competitive exams.'
    },
    '/exams-mdcat.html': {
      title: 'MDCAT Exam Guide | Career Pakistan',
      description: 'Prepare for MDCAT with the latest updates, resources, and practical guidance for students in Pakistan.'
    },
    '/exams-css.html': {
      title: 'CSS Exam Guide | Career Pakistan',
      description: 'Access CSS exam guidance, resources, and updates to help you prepare effectively for civil services exams.'
    },
    '/exams-ppsc.html': {
      title: 'PPSC Exam Guide | Career Pakistan',
      description: 'Stay updated with PPSC exam information, preparation resources, and relevant announcements.'
    },
    '/books.html': {
      title: 'Books & Study Material | Career Pakistan',
      description: 'Find useful books and study material for scholarships, jobs tests, and major exams in Pakistan.'
    },
    '/resume-builder.html': {
      title: 'Resume Builder — ATS-Friendly CV Creator | Career Pakistan',
      description: 'Create a clean and ATS-friendly resume quickly using the free Career Pakistan resume builder.'
    },
    '/search.html': {
      title: 'Search Results | Career Pakistan',
      description: 'Search scholarships, jobs, internships, exams, and books across Career Pakistan.'
    },
    '/favorites.html': {
      title: 'Saved Items | Career Pakistan',
      description: 'Access your saved scholarships, jobs, internships, exams, and books on Career Pakistan.'
     }
  };

  const path = currentUrl.pathname.endsWith('/index.html')
    ? currentUrl.pathname.replace('/index.html', '/')
    : currentUrl.pathname;
  const isSearch = path === '/search.html';
  const canonicalUrl = `${siteUrl}${path}${isSearch ? currentUrl.search : ''}`;

    const seo = pageSEO[path] || {};
  const title = seo.title || (document.title || 'Career Pakistan').trim();
  const description = seo.description || document.querySelector('meta[name="description"]')?.content || 'Career Pakistan';

  document.title = title;

  const setMeta = (selector, make, content) => {
    if (!content) return;
    const nodes = document.head.querySelectorAll(selector);
    const node = nodes[0] || make();
    node.setAttribute('content', content);
    for (let i = 1; i < nodes.length; i += 1) nodes[i].remove();
  };

  setMeta('meta[name="description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
    return el;
  }, description);

  const canonical = document.querySelector('link[rel="canonical"]') || (() => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
    return el;
  })();
  canonical.setAttribute('href', canonicalUrl);

    setMeta('meta[property="og:title"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:title');
    document.head.appendChild(el);
    return el;
  }, title);
  setMeta('meta[property="og:description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:description');
    document.head.appendChild(el);
    return el;
  }, description);
  setMeta('meta[property="og:type"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:type');
    document.head.appendChild(el);
    return el;
  }, 'website');
  setMeta('meta[property="og:url"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:url');
    document.head.appendChild(el);
    return el;
  }, canonicalUrl);
  setMeta('meta[property="og:image"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:image');
    document.head.appendChild(el);
    return el;
  }, defaultImage);
  setMeta('meta[property="og:site_name"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('property', 'og:site_name');
    document.head.appendChild(el);
    return el;
  }, 'Career Pakistan');

  setMeta('meta[name="twitter:card"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:card');
    document.head.appendChild(el);
    return el;
  }, 'summary_large_image');
  setMeta('meta[name="twitter:title"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:title');
    document.head.appendChild(el);
    return el;
  }, title);
  setMeta('meta[name="twitter:description"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:description');
    document.head.appendChild(el);
    return el;
  }, description);
  setMeta('meta[name="twitter:image"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'twitter:image');
    document.head.appendChild(el);
    return el;
  }, defaultImage);
  
  const noIndexPages = new Set(['/search.html', '/favorites.html']);
  setMeta('meta[name="robots"]', () => {
    const el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
    return el;
  }, noIndexPages.has(path) ? 'noindex, follow' : 'index, follow, max-image-preview:large');

  const addJsonLd = (data, id) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  };

  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CareerHub Pakistan',
    url: siteUrl,
    logo: `${siteUrl}/logo.svg`
  }, 'seo-org-schema');

  addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Career Pakistan',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search.html?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }, 'seo-website-schema');

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
    '/exams-mdcat.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'MDCAT', url: '/exams-mdcat.html' }],
    '/exams-css.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'CSS', url: '/exams-css.html' }],
    '/exams-ppsc.html': [{ name: 'Home', url: '/' }, { name: 'Exams', url: '/exams.html' }, { name: 'PPSC', url: '/exams-ppsc.html' }],
    '/books.html': [{ name: 'Home', url: '/' }, { name: 'Books', url: '/books.html' }],
    '/resume-builder.html': [{ name: 'Home', url: '/' }, { name: 'Resume Builder', url: '/resume-builder.html' }]
  };

  const crumbs = breadcrumbMap[path];
  if (crumbs && crumbs.length > 1) {
    addJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: `${siteUrl}${c.url}`
      }))
    }, 'seo-breadcrumb-schema');
  }
})();
