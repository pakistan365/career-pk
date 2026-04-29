/**
 * Career Pakistan — Comprehensive Fix Script
 * Drop this file in /js/ and include it in all HTML pages AFTER app.js
 */

(function () {
  'use strict';

  function fixMobileMenuDoubleCross() {
    const style = document.createElement('style');
    style.id = 'cpk-fix-double-cross';
    style.textContent = `
      .nav-links.open::before { display: none !important; }
      .close-mobile-menu {
        display: flex !important;
        align-items: center;
        gap: 8px;
        background: none;
        border: 1px solid var(--border, #e5e7eb);
        color: var(--text-main);
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-left: auto;
        margin-bottom: 8px;
        transition: background 0.15s, color 0.15s;
      }
      .close-mobile-menu::before { content: '✕'; font-size: 16px; line-height: 1; }
      .close-mobile-menu:hover {
        background: var(--primary, #0f766e);
        color: #fff;
        border-color: var(--primary, #0f766e);
      }
      .close-mobile-menu .visually-hidden { display: none; }
      .close-mobile-menu i.fa-times { display: none; }
      .hamburger.open i { transform: rotate(90deg); }
    `;
    document.head.appendChild(style);
  }

  function fixFooterAdSlot() {
    const style = document.createElement('style');
    style.id = 'cpk-fix-footer-ad';
    style.textContent = `
      .ad-slot-footer { margin: 0 !important; padding: 0 !important; max-width: 100% !important; position: relative; }
      .ad-slot-footer .ad-slot-inner {
        min-height: 0 !important;
        padding: 10px 48px 10px 16px !important;
        border-radius: 0 !important;
        border: none !important;
        border-top: 1px solid rgba(15,118,110,.2) !important;
        background: rgba(15,118,110,.04) !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .ad-slot-footer .ad-chip { font-size: .65rem !important; background: var(--primary, #0f766e); color: #fff; padding: 2px 7px; border-radius: 4px; }
      .ad-slot-footer strong { font-size: .82rem !important; font-weight: 500; color: var(--text-muted, #6b7280); }
      .ad-slot-footer small { display: none !important; }
      .ad-dismiss-btn {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
        background: none; border: none; color: var(--text-muted, #9ca3af); cursor: pointer; font-size: 16px;
      }
      .ad-dismiss-btn:hover { color: var(--text-main); }
      .ad-slot-header { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
      .ad-slot-header .ad-slot-inner {
        min-height: 0 !important; padding: 8px 16px !important; border-radius: 0 !important; border: none !important;
        border-bottom: 1px solid rgba(15,118,110,.15) !important; background: rgba(15,118,110,.03) !important;
      }
      .ad-slot-incontent { max-width: 720px !important; margin: 0 auto 20px !important; padding: 0 14px !important; }
    `;
    document.head.appendChild(style);

    function addDismissButton() {
      const footerAd = document.querySelector('.ad-slot-footer');
      if (footerAd && !footerAd.querySelector('.ad-dismiss-btn')) {
        const btn = document.createElement('button');
        btn.className = 'ad-dismiss-btn';
        btn.setAttribute('aria-label', 'Dismiss ad');
        btn.textContent = '×';
        btn.onclick = () => { footerAd.style.display = 'none'; };
        footerAd.appendChild(btn);
      }
    }

    setTimeout(addDismissButton, 500);
    document.addEventListener('DOMContentLoaded', () => setTimeout(addDismissButton, 600));
  }

  function enhanceBlogPage() {
    if (!document.querySelector('.opportunity-article')) return;
    const progressBar = document.createElement('div');
    progressBar.id = 'cpk-read-progress';
    document.body.appendChild(progressBar);
    const style = document.createElement('style');
    style.textContent = '#cpk-read-progress{position:fixed;top:0;left:0;height:3px;width:0%;background:linear-gradient(90deg,var(--primary,#0f766e),#22d3c8);z-index:99999}';
    document.head.appendChild(style);

    window.addEventListener('scroll', () => {
      const doc = document.documentElement;
      const scrolled = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
      progressBar.style.width = Math.min(scrolled, 100) + '%';
    }, { passive: true });
  }

  function applyGeneralFixes() {
    const style = document.createElement('style');
    style.id = 'cpk-general-fixes';
    style.textContent = '.card{transition:transform .2s ease,box-shadow .2s ease !important}.card:hover{transform:translateY(-3px) !important;box-shadow:0 14px 36px rgba(15,23,42,.1) !important}';
    document.head.appendChild(style);
  }

  function enhanceBooksPage() {
    if (!document.querySelector('.books-grid, [data-page="books"]')) return;
  }

  fixMobileMenuDoubleCross();
  fixFooterAdSlot();
  applyGeneralFixes();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceBlogPage();
      enhanceBooksPage();
    });
  } else {
    enhanceBlogPage();
    enhanceBooksPage();
  }
})();
