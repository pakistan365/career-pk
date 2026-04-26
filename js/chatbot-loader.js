// Career Pakistan — chatbot-loader.js
// Loads the chatbot script early so AI adviser is visible on every page
(function () {
  function loadChatbot() {
    if (document.querySelector('script[src*="gemini-chatbot"]')) return;
    const script = document.createElement('script');
    script.src = 'js/gemini-chatbot.js';
    document.body.appendChild(script);
  }
  // Make AI adviser available quickly on all pages, especially homepage.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChatbot, { once: true });
  } else {
    loadChatbot();
  }
    // Load during idle as a fallback.
  if ('requestIdleCallback' in window) requestIdleCallback(loadChatbot, { timeout: 1500 });
  // Also load immediately on any user interaction
  ['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, loadChatbot, { once: true, passive: true });
  });
})();
