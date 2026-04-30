function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDeadlineStatus(dateStr) {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) {
    return { status: 'ok', daysLeft: Number.POSITIVE_INFINITY };
  }

  const today = startOfDay(new Date());
  const deadline = startOfDay(parsed);
  const diffMs = deadline.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { status: 'expired', daysLeft };
  if (daysLeft <= 3) return { status: 'urgent', daysLeft };
  if (daysLeft <= 7) return { status: 'soon', daysLeft };
  return { status: 'ok', daysLeft };
}

function ensureStyles() {
  if (document.getElementById('cpk-deadline-styles')) return;
  const style = document.createElement('style');
  style.id = 'cpk-deadline-styles';
  style.textContent = `
    .cpk-badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; margin-top:8px; }
    .cpk-badge--urgent { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
    .cpk-badge--soon { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }
    .cpk-badge--expired { background:#e5e7eb; color:#374151; border:1px solid #d1d5db; }
    .cpk-card--expired { opacity:0.75; }
    .cpk-badge--ok { background:color-mix(in srgb, var(--primary, #0f766e) 14%, white); color:var(--primary, #0f766e); border:1px solid color-mix(in srgb, var(--primary, #0f766e) 30%, white); }
  `;
  document.head.appendChild(style);
}

export function initDeadlineBadges() {
  ensureStyles();
  const nodes = document.querySelectorAll('[data-deadline]');

  nodes.forEach((el) => {
    if (el.querySelector('.cpk-badge')) return;

    const dateStr = el.getAttribute('data-deadline');
    const { status, daysLeft } = getDeadlineStatus(dateStr);
    if (status === 'ok') return;

    const badge = document.createElement('span');
    badge.className = `cpk-badge cpk-badge--${status}`;

    if (status === 'urgent') {
      badge.textContent = `Closing in ${Math.max(0, daysLeft)} day${daysLeft === 1 ? '' : 's'}`;
    } else if (status === 'soon') {
      badge.textContent = 'Closing soon';
    } else {
      badge.textContent = 'Closed';
      const card = el.closest('.cpk-card, .card, article, li, .opportunity-card') || el.parentElement;
      if (card) card.classList.add('cpk-card--expired');
    }

    el.appendChild(badge);
  });
}
