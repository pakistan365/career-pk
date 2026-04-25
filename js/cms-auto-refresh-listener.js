/**
 * ============================================================
 * CareerHub Pakistan — cms-auto-refresh-listener.js
 * Automatic UI re-rendering on data refresh
 * ============================================================
 * 
 * This utility ensures that pages automatically re-render
 * their content when CMS data is refreshed (every 5 minutes).
 * 
 * Include AFTER app.js so it can use your page functions.
 */

(function() {
  'use strict';

  /**
   * Register a page section for auto-refresh
   * Usage:
   *   registerAutoRefreshSection('Scholarships', () => loadScholarships());
   *   registerAutoRefreshSection('Jobs', () => loadData());
   */
  window._AUTO_REFRESH_SECTIONS = {};

  window.registerAutoRefreshSection = function(tabName, reloadFunction) {
    if (!window._AUTO_REFRESH_SECTIONS) {
      window._AUTO_REFRESH_SECTIONS = {};
    }
    window._AUTO_REFRESH_SECTIONS[tabName] = reloadFunction;
  };

  /**
   * Initialize auto-refresh listeners
   * Call this after page setup is complete
   */
  window.initializeAutoRefreshListeners = function() {
    // Listen to refresh events
    onCMSRefresh((data, changedTabs) => {
      if (!window._AUTO_REFRESH_SECTIONS) return;

      changedTabs.forEach(tabName => {
        if (window._AUTO_REFRESH_SECTIONS[tabName]) {
          try {
            console.log(`[CareerHub] Auto-refreshing UI for: ${tabName}`);
            window._AUTO_REFRESH_SECTIONS[tabName]();
          } catch (err) {
            console.error(`[CareerHub] Error refreshing ${tabName}:`, err);
          }
        }
      });

      // Also refresh any multi-tab sections
      if (window._AUTO_REFRESH_SECTIONS['_multi']) {
        try {
          console.log('[CareerHub] Auto-refreshing multi-tab section');
          window._AUTO_REFRESH_SECTIONS['_multi']();
        } catch (err) {
          console.error('[CareerHub] Error refreshing multi-tab:', err);
        }
      }
    });

    console.info('[CareerHub] Auto-refresh listeners initialized', Object.keys(window._AUTO_REFRESH_SECTIONS || {}));
  };

  /**
   * For pages that display all tabs (like favorites, search)
   * Register with '_multi' to trigger on ANY refresh
   */
  window.registerMultiTabRefresh = function(reloadFunction) {
    window._AUTO_REFRESH_SECTIONS = window._AUTO_REFRESH_SECTIONS || {};
    window._AUTO_REFRESH_SECTIONS['_multi'] = reloadFunction;
  };

  // Auto-initialize if page uses global data
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (window._AUTO_REFRESH_SECTIONS && Object.keys(window._AUTO_REFRESH_SECTIONS).length > 0) {
          initializeAutoRefreshListeners();
        }
      }, 100);
    });
  } else {
    setTimeout(() => {
      if (window._AUTO_REFRESH_SECTIONS && Object.keys(window._AUTO_REFRESH_SECTIONS).length > 0) {
        initializeAutoRefreshListeners();
      }
    }, 100);
  }
})();
