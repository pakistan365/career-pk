(function () {
  const typeMap = {
    scholarship: { sheet: 'Scholarships', icon: '🎓', base: 'scholarships.html', label: 'Scholarships' },
    job: { sheet: 'Jobs', icon: '💼', base: 'jobs.html', label: 'Jobs' },
    internship: { sheet: 'Internships', icon: '🚀', base: 'internships.html', label: 'Internships' },
    exam: { sheet: 'Exams', icon: '📋', base: 'exams.html', label: 'Exams' },
    book: { sheet: 'Books', icon: '📚', base: 'books.html', label: 'Books' }
  };

    const relatedPlan = {
    job: { sidebar: ['exam', 'book'], end: 'job' },
    scholarship: { sidebar: ['exam', 'book'], end: 'scholarship' },
    internship: { sidebar: ['job', 'exam'], end: 'internship' },
    exam: { sidebar: ['book', 'exam'], end: 'exam' },
    book: { sidebar: ['exam', 'book'], end: 'book' }
  };

  const params = new URLSearchParams(window.location.search);
  const type = (params.get('type') || 'job').toLowerCase();
  const group = text(params.get('group')).trim();
  const id = Number(params.get('id'));
  const config = typeMap[type] || typeMap.job;

    function getExamGroup(item) {
    const fromHelper = typeof getExamGroupName === 'function' ? getExamGroupName(item) : '';
    return text(fromHelper || item.exam_type || item.category || item.type || 'General').trim();
  }

  function getBookGroup(item) {
    return text(item.category || item.exam_type || 'General').trim();
  }

  function itemMatchesGroup(item, groupName, targetType) {
    if (!groupName) return true;
    if (targetType === 'book') {
      return matchesFilterValue(getBookGroup(item), groupName) ||
        matchesFilterValue(item.category, groupName) ||
        matchesFilterValue(item.exam_type, groupName);
    }
    if (targetType === 'exam') {
      return matchesFilterValue(getExamGroup(item), groupName) ||
        matchesFilterValue(item.exam_type, groupName) ||
        includesFilterValue(item.title, groupName);
    }
    return includesFilterValue(item.title, groupName) || includesFilterValue(item.details, groupName);
  }

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

  function getListByType(targetType) {
    const sheet = (typeMap[targetType] || {}).sheet;
    if (!sheet) return [];
    return window.CMS_DATA[sheet] || [];
  }

  function getTargetDetail(targetType, item) {
    return text(item.type || item.exam_type || item.category || item.location || 'Updated listing');
  }

  function renderRelatedList(items, mountId, targetType, emptyLabel) {
  const mount = document.getElementById(mountId);
    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = `<p class="muted">No ${emptyLabel.toLowerCase()} found yet.</p>`;
      return;
    }
    mount.innerHTML = items.map((entry) => {
      const item = entry.item || entry;
      const url = `opportunity.html?type=${targetType}&id=${Number(item.id) || 0}`;
      return `<a class="related-item" href="${url}"><strong>${escapeHtml(item.title || 'Untitled')}</strong><span>${escapeHtml(getTargetDetail(targetType, item))}</span></a>`;
    }).join('');
  }

  function renderSameTypeCards(items, targetType) {
    const mount = document.getElementById('relatedSameTypeCards');
    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = `<p class="muted">More ${typeMap[targetType].label.toLowerCase()} will appear here soon.</p>`;
      return;
    }
    mount.innerHTML = items.map((entry) => {
      const item = entry.item || entry;
      return `
      <a class="related-card" href="opportunity.html?type=${targetType}&id=${Number(item.id) || 0}">
        <h3>${escapeHtml(item.title || 'Untitled')}</h3>
        <p>${escapeHtml(text(item.description || item.details || 'Open this card to read complete details.').slice(0, 120))}</p>
        <span>${escapeHtml(getTargetDetail(targetType, item))}</span>
      </a>`;
    }).join('');
  }

    function renderGroupCards(items, targetType) {
    const mount = document.getElementById('relatedSameTypeCards');
    if (!mount) return;
    if (!items.length) {
      mount.innerHTML = `<p class="muted">No ${typeMap[targetType].label.toLowerCase()} found in this category yet.</p>`;
      return;
    }
    mount.innerHTML = items.map((item) => `
      <a class="related-card" href="opportunity.html?type=${targetType}&id=${Number(item.id) || 0}">
        <h3>${escapeHtml(item.title || 'Untitled')}</h3>
        <p>${escapeHtml(text(item.description || item.details || 'Open to read complete details.').slice(0, 130))}</p>
        <span>${escapeHtml(getTargetDetail(targetType, item))} ${item.deadline || item.test_date ? `• ${escapeHtml(formatDate(item.deadline || item.test_date))}` : ''}</span>
      </a>
    `).join('');
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

    const overviewText = text(item.description || item.details || 'Full details will be updated shortly.');
    document.getElementById('opportunityOverview').textContent = overviewText;
    
    const longContent = item.details || item.description;
    const fallbackParagraphs = splitParagraphs(longContent);
    const richBody = typeof renderRichTextWithPreviews === 'function'
      ? renderRichTextWithPreviews(longContent)
      : fallbackParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
    document.getElementById('opportunityBody').innerHTML = richBody;

        const normalizedOverview = overviewText.replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedDetails = text(longContent).replace(/\s+/g, ' ').trim().toLowerCase();
    const detailsSection = document.getElementById('detailsSection');
    if (detailsSection && normalizedOverview && normalizedOverview === normalizedDetails) {
      detailsSection.style.display = 'none';
    }

    document.getElementById('opportunityActions').innerHTML = [
      actionButton('Apply Now', item.apply_link, true),
      actionButton('Register', item.registration_link, true),
      `<button class="btn btn-secondary" onclick="shareOpportunity(${Number(item.id) || 0},'${escapeJsSingleQuote(type)}','${escapeJsSingleQuote(title)}')"><i class="fa fa-share-nodes"></i> Share</button>`,
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

    const plan = relatedPlan[type] || relatedPlan.job;
    const sideOneType = plan.sidebar[0];
    const sideTwoType = plan.sidebar[1];

    document.getElementById('sidebarRelatedOneTitle').textContent = `Related ${typeMap[sideOneType].label}`;
    document.getElementById('sidebarRelatedTwoTitle').textContent = `Related ${typeMap[sideTwoType].label}`;
    document.getElementById('relatedSameTypeTitle').textContent = `More ${config.label}`;

    const sameTypeItems = getListByType(plan.end)
      .filter((row) => Number(row.id) !== Number(item.id))
      .map((row) => ({ score: relevance(item, row), item: row }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const sideOneItems = getListByType(sideOneType)
      .map((row) => ({ score: relevance(item, row), item: row }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const sideTwoItems = getListByType(sideTwoType)
      .map((row) => ({ score: relevance(item, row), item: row }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    renderRelatedList(sideOneItems, 'sidebarRelatedOne', sideOneType, typeMap[sideOneType].label);
    renderRelatedList(sideTwoItems, 'sidebarRelatedTwo', sideTwoType, typeMap[sideTwoType].label);
    renderSameTypeCards(sameTypeItems, plan.end);
  }

  function renderNotFound() {
    document.getElementById('opportunityTitle').textContent = 'Opportunity not found';
    document.getElementById('opportunitySubtitle').textContent = 'This listing may have been removed or its ID is invalid.';
    document.getElementById('opportunityLayout').innerHTML = '<div class="empty-state" style="display:flex"><i class="fa fa-inbox"></i><h3>Listing not available</h3><p>Please return to the listings page and select another opportunity.</p><a href="jobs.html" class="btn btn-primary">Back to Jobs</a></div>';
  }

    function mountGroupBlog() {
    const groupItems = getListByType(type).filter((entry) => itemMatchesGroup(entry, group, type));
    document.getElementById('opportunityTitle').textContent = `${config.icon} ${group} ${config.label} Guide`;
    document.getElementById('opportunitySubtitle').textContent = `All ${group} related ${config.label.toLowerCase()} with connected updates in one place.`;
    document.getElementById('opportunityBreadcrumb').innerHTML = `<a href="index.html">Home</a> <i class="fa fa-chevron-right fa-xs"></i> <a href="${config.base}">${config.label}</a> <i class="fa fa-chevron-right fa-xs"></i> <span>${escapeHtml(group)}</span>`;

    const cover = document.getElementById('opportunityCover');
    cover.style.display = 'none';
    document.getElementById('opportunityMeta').innerHTML = detailField('Category', `${group} ${config.label}`, 'fa-layer-group');
    document.getElementById('opportunityOverview').textContent = `This blog section shows every ${config.label.toLowerCase().slice(0, -1)} linked with ${group}. Click any card below to open full post details.`;
    document.getElementById('opportunityBody').innerHTML = `<p>Total listings in this category: <strong>${groupItems.length}</strong>.</p><p>You can open each listing for full details, links, and related resources.</p>`;
    document.getElementById('opportunityActions').innerHTML = `<a class="btn btn-primary" href="${config.base}?${type === 'book' ? 'book_group' : 'exam_group'}=${encodeURIComponent(group)}#resultsGrid">Open ${escapeHtml(group)} ${config.label} List</a>`;
    document.getElementById('saveOpportunityBtn').style.display = 'none';
    const engagementBox = document.querySelector('.engagement-box');
    if (engagementBox) engagementBox.style.display = 'none';

    document.getElementById('relatedSameTypeTitle').textContent = `${group} ${config.label}`;
    renderGroupCards(groupItems, type);

    if (type === 'book') {
      const relatedExams = getListByType('exam')
        .filter((entry) => itemMatchesGroup(entry, group, 'exam'))
        .sort((a, b) => new Date(a.test_date || a.deadline || 0) - new Date(b.test_date || b.deadline || 0))
        .slice(0, 6);
      document.getElementById('sidebarRelatedOneTitle').textContent = 'Related Exams & Dates';
      document.getElementById('sidebarRelatedTwoTitle').textContent = 'Related Books';
      renderRelatedList(relatedExams, 'sidebarRelatedOne', 'exam', 'Exams');
      renderRelatedList(groupItems.slice(0, 6), 'sidebarRelatedTwo', 'book', 'Books');
      return;
    }

    if (type === 'exam') {
      const relatedBooks = getListByType('book')
        .filter((entry) => itemMatchesGroup(entry, group, 'book'))
        .slice(0, 6);
      const relatedExams = groupItems
        .sort((a, b) => new Date(a.test_date || a.deadline || 0) - new Date(b.test_date || b.deadline || 0))
        .slice(0, 6);
      document.getElementById('sidebarRelatedOneTitle').textContent = 'Related Books';
      document.getElementById('sidebarRelatedTwoTitle').textContent = 'Related Exams & Dates';
      renderRelatedList(relatedBooks, 'sidebarRelatedOne', 'book', 'Books');
      renderRelatedList(relatedExams, 'sidebarRelatedTwo', 'exam', 'Exams');
    }
  }

  function init() {
    updateFavCount();
    if (!id && group && (type === 'book' || type === 'exam')) {
      mountGroupBlog();
      return;
    }
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
