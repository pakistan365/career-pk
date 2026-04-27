(function () {
  const typeMap = {
    scholarship: { sheet: 'Scholarships', icon: '🎓', base: 'scholarships.html', label: 'Scholarships' },
    job: { sheet: 'Jobs', icon: '💼', base: 'jobs.html', label: 'Jobs' },
    internship: { sheet: 'Internships', icon: '🚀', base: 'internships.html', label: 'Internships' },
    exam: { sheet: 'Exams', icon: '📋', base: 'exams.html', label: 'Exams' },
    book: { sheet: 'Books', icon: '📚', base: 'books.html', label: 'Books' }
  };

  const params = new URLSearchParams(window.location.search);
  const type = (params.get('type') || 'job').toLowerCase();
  const id = Number(params.get('id'));
  const config = typeMap[type] || typeMap.job;

  function splitParagraphs(value) {
    const raw = text(value).trim();
    if (!raw) return ['Details will be published soon. Please check back for updates.'];
    return raw.split(/\n{2,}|\.\s+/).map((p) => p.trim()).filter(Boolean);
  }

  function tokens(item) {
    return `${text(item.title)} ${text(item.category)} ${text(item.tags)} ${text(item.exam_type)} ${text(item.type)}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
  }

  function relevance(source, candidate) {
    const base = new Set(tokens(source));
    let score = 0;
    tokens(candidate).forEach((w) => {
      if (base.has(w)) score += 1;
    });
    return score;
  }

  function renderRelatedList(items, mountId, label) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = `<p class="muted">No ${label.toLowerCase()} found yet.</p>`;
      return;
    }
    mount.innerHTML = items.map((item) => {
      const targetType = label === 'Jobs' ? 'job' : (label === 'Exams' ? 'exam' : 'book');
      const url = `opportunity.html?type=${targetType}&id=${Number(item.id) || 0}`;
      return `<a class="related-item" href="${url}"><strong>${escapeHtml(item.title || 'Untitled')}</strong><span>${escapeHtml(item.type || item.exam_type || item.category || 'Updated resource')}</span></a>`;
    }).join('');
  }

  function actionButton(label, url, primary) {
    if (!url) return '';
    return `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" class="btn ${primary ? 'btn-primary' : 'btn-secondary'}">${escapeHtml(label)}</a>`;
  }

  function updateDynamicSeo(item) {
    const pageTitle = `${item.title} | ${config.label} Details | Career Pakistan`;
    const pageDesc = text(item.description || item.details || `Complete ${config.label.toLowerCase()} details, deadlines, and preparation guidance.`).slice(0, 155);
    document.title = pageTitle;

    const setMeta = (selector, attr, value) => {
      if (!value) return;
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement('meta');
        const key = selector.includes('property=') ? 'property' : 'name';
        node.setAttribute(key, attr);
        document.head.appendChild(node);
      }
      node.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'description', pageDesc);
    setMeta('meta[property="og:title"]', 'og:title', pageTitle);
    setMeta('meta[property="og:description"]', 'og:description', pageDesc);
    setMeta('meta[name="twitter:title"]', 'twitter:title', pageTitle);
    setMeta('meta[name="twitter:description"]', 'twitter:description', pageDesc);

    const canonicalHref = `${window.location.origin}/opportunity.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(String(item.id || id))}`;
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: item.title,
      description: pageDesc,
      mainEntityOfPage: canonicalHref,
      datePublished: item.posted_date || new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: { '@type': 'Organization', name: 'Career Pakistan Editorial' },
      publisher: { '@type': 'Organization', name: 'Career Pakistan' }
    };
    const existing = document.getElementById('opportunity-schema');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'opportunity-schema';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  function mountOpportunity(item) {
    const title = text(item.title || 'Opportunity Details');
    document.getElementById('opportunityTitle').textContent = `${config.icon} ${title}`;
    document.getElementById('opportunitySubtitle').textContent = text(item.description || 'In-depth overview, eligibility guidance, timeline, and resources.');
    document.getElementById('opportunityBreadcrumb').innerHTML = `<a href="index.html">Home</a> <i class="fa fa-chevron-right fa-xs"></i> <a href="${config.base}">${config.label}</a> <i class="fa fa-chevron-right fa-xs"></i> <span>${escapeHtml(title)}</span>`;

    const cover = document.getElementById('opportunityCover');
    const coverSrc = imgSrc(item.image_url, type);
    if (coverSrc) {
      cover.src = coverSrc;
      cover.style.display = 'block';
    } else {
      cover.style.display = 'none';
    }

    document.getElementById('opportunityMeta').innerHTML = [
      detailField('Category', item.category || item.type || item.exam_type, 'fa-folder-open'),
      detailField('Location', item.location || item.country, 'fa-map-marker-alt'),
      detailField('Deadline', formatDate(item.deadline || item.test_date), 'fa-calendar'),
      detailField('Posted', formatDate(item.posted_date), 'fa-clock')
    ].filter(Boolean).join('');

    document.getElementById('opportunityOverview').textContent = text(item.description || item.details || 'Full details will be updated shortly.');

    const longContent = item.details || item.description;
    const fallbackParagraphs = splitParagraphs(longContent);
    const richBody = typeof renderRichTextWithPreviews === 'function'
      ? renderRichTextWithPreviews(longContent)
      : fallbackParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    document.getElementById('opportunityBody').innerHTML = richBody;

    document.getElementById('opportunityActions').innerHTML = [
      actionButton('Apply Now', item.apply_link, true),
      actionButton('Register', item.registration_link, true),
      actionButton('Official Source', item.source_link, false),
      actionButton('Download Guide', item.download_link || item.syllabus_link, false),
      actionButton('Past Papers', item.past_papers_link, false)
    ].filter(Boolean).join('') + renderResourceActions(item, title);

    const saveBtn = document.getElementById('saveOpportunityBtn');
    saveBtn.onclick = () => {
      const added = toggleFav(item.id, title, type);
      saveBtn.innerHTML = added ? '<i class="fa fa-check"></i> Saved to Favorites' : '<i class="fa fa-bookmark"></i> Save this Opportunity';
    };

    updateDynamicSeo(item);

    const jobs = (window.CMS_DATA.Jobs || []).filter((j) => Number(j.id) !== Number(item.id));
    const exams = window.CMS_DATA.Exams || [];
    const books = window.CMS_DATA.Books || [];

    const relatedJobs = jobs
      .map((j) => ({ score: relevance(item, j), item: j }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    const relatedExams = exams
      .map((e) => ({ score: relevance(item, e), item: e }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    const relatedBooks = books
      .map((b) => ({ score: relevance(item, b), item: b }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => r.item);

    renderRelatedList(relatedJobs, 'relatedJobs', 'Jobs');
    renderRelatedList(relatedExams, 'relatedExams', 'Exams');
    renderRelatedList(relatedBooks, 'relatedBooks', 'Books');
  }

  function renderNotFound() {
    document.getElementById('opportunityTitle').textContent = 'Opportunity not found';
    document.getElementById('opportunitySubtitle').textContent = 'This listing may have been removed or its ID is invalid.';
    document.getElementById('opportunityLayout').innerHTML = '<div class="empty-state" style="display:flex"><i class="fa fa-inbox"></i><h3>Listing not available</h3><p>Please return to the listings page and select another opportunity.</p><a href="jobs.html" class="btn btn-primary">Back to Jobs</a></div>';
  }

  function init() {
    updateFavCount();
    const list = window.CMS_DATA[config.sheet] || [];
    const item = list.find((entry) => Number(entry.id) === id);
    if (!item) {
      renderNotFound();
      return;
    }
    mountOpportunity(item);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.onCMSReady === 'function') {
      window.onCMSReady(init);
    } else {
      init();
    }
  });
})();
