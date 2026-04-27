// ============================================================
// Career Pakistan — gemini-chatbot.js  (FIXED v2)
// Floating AI chatbot powered by Google Gemini via Cloudflare Function
// ============================================================

const CHAT_ENDPOINT = '/api/gemini-chat';
const FEEDBACK_ENDPOINT = '/api/chat-feedback';
const WEB_SEARCH_ENDPOINT = '/api/web-search';
const AI_ENABLED_KEY = 'ch_ai_enabled';
const CHAT_FEEDBACK_KEY = 'ch_ai_feedback';
const CHAT_MEMORY_KEY = 'ch_ai_memory';
const CHAT_PROVIDER_KEY = 'ch_ai_provider_mode';

// Build context from CMS data (safe — handles missing data)
function buildContext() {
  const d = window.CMS_DATA || {};
  const s = (d.Scholarships || []).slice(0, 5).map(x => `- ${x.title} (${x.country || ''}, ${x.funding || ''}, deadline: ${x.deadline || 'TBD'})`).join('\n');
  const j = (d.Jobs || []).slice(0, 5).map(x => `- ${x.title} (${x.type || ''}, ${x.location || ''}, salary: ${x.salary || 'N/A'})`).join('\n');
  const e = (d.Exams || []).slice(0, 4).map(x => `- ${x.title} (${x.exam_type || ''}, date: ${x.test_date || 'TBD'})`).join('\n');
  const b = (d.Books || []).slice(0, 4).map(x => `- ${x.title} by ${x.author || 'Unknown'} (${x.exam_type || ''})`).join('\n');
  const i = (d.Internships || []).slice(0, 4).map(x => `- ${x.title} at ${x.organization || ''} (${x.stipend || 'N/A'}, ${x.location || ''})`).join('\n');
  const memory = getMemoryContext();
  return `You are Career Pakistan AI — a helpful assistant for Career Pakistan. Help users find scholarships, jobs, internships, exam prep resources, and books. Be friendly, concise, and practical. Respond in the same language the user uses (Urdu or English).
  Before long answers, ask one short clarifying question if user intent is broad.
Give answers in 3 parts: (1) best options, (2) why they match, (3) next step.
Do not invent deadlines or links. If uncertain, clearly say data may be incomplete.
When relevant, recommend Career Pakistan internal pages directly using site links provided in prompt.

Current Career Pakistan listings:
SCHOLARSHIPS:\n${s || 'Loading…'}
JOBS:\n${j || 'Loading…'}
EXAMS:\n${e || 'Loading…'}
BOOKS:\n${b || 'Loading…'}
INTERNSHIPS:\n${i || 'Loading…'}

Learned user preference memory (recent interactions):\n${memory}

Help users find opportunities, prepare for exams, build careers, and navigate Career Pakistan.`;
}

let chatHistory = [];
let chatbotReady = false;

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode / blocked cookies).
  }
}

function loadMemory() {
  try {
    const parsed = JSON.parse(safeStorageGet(CHAT_MEMORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMemory(memory) {
  safeStorageSet(CHAT_MEMORY_KEY, JSON.stringify(memory.slice(-25)));
}

function getProviderMode() {
  return safeStorageGet(CHAT_PROVIDER_KEY) || 'auto';
}

function setProviderMode(mode) {
  const normalized = ['auto', 'gemini', 'groq', 'local'].includes(mode) ? mode : 'auto';
  safeStorageSet(CHAT_PROVIDER_KEY, normalized);
  updateProviderStatus(normalized);
}

function storeMemory(question, answer, helpfulScore = 0) {
  if (!question || !answer) return;
  const memory = loadMemory();
  memory.push({
    q: String(question).slice(0, 220),
    a: String(answer).slice(0, 320),
    helpfulScore,
    ts: new Date().toISOString()
  });
  saveMemory(memory);
}

function getMemoryContext() {
  const memory = loadMemory();
  if (!memory.length) return 'No saved user preferences yet.';

  return memory
    .sort((a, b) => (b.helpfulScore || 0) - (a.helpfulScore || 0))
    .slice(0, 8)
    .map(m => `- Q: ${m.q}\n  Preferred style hint: ${m.helpfulScore > 0 ? 'User marked as helpful.' : 'Neutral memory.'}\n  A: ${m.a}`)
    .join('\n');
}

const CAREERHUB_LINKS = [
  { slug: 'scholarships', keywords: ['scholarship', 'funded', 'hec', 'financial aid', 'bursary'], label: 'Scholarships', url: '/scholarships.html' },
  { slug: 'national-scholarships', keywords: ['pakistan scholarship', 'local scholarship', 'national'], label: 'National Scholarships', url: '/scholarships-national.html' },
  { slug: 'international-scholarships', keywords: ['abroad', 'international scholarship', 'study abroad', 'foreign university'], label: 'International Scholarships', url: '/scholarships-international.html' },
  { slug: 'jobs', keywords: ['job', 'career', 'vacancy', 'hiring'], label: 'All Jobs', url: '/jobs.html' },
  { slug: 'government-jobs', keywords: ['government', 'fpsc', 'ppsc', 'public sector', 'govt'], label: 'Government Jobs', url: '/jobs-government.html' },
  { slug: 'private-jobs', keywords: ['private', 'ngo', 'company'], label: 'Private / NGO Jobs', url: '/jobs-private.html' },
  { slug: 'internships', keywords: ['internship', 'intern', 'trainee'], label: 'Internships', url: '/internships.html' },
  { slug: 'exams', keywords: ['exam', 'test prep', 'syllabus', 'entry test'], label: 'Exams Hub', url: '/exams.html' },
  { slug: 'mdcat', keywords: ['mdcat', 'medical entry test', 'pre-medical'], label: 'MDCAT Guide', url: '/exams-mdcat.html' },
  { slug: 'css', keywords: ['css exam', 'civil service'], label: 'CSS Guide', url: '/exams-css.html' },
  { slug: 'books', keywords: ['book', 'pdf', 'notes', 'past papers'], label: 'Books', url: '/books.html' },
  { slug: 'resume', keywords: ['cv', 'resume', 'portfolio'], label: 'Resume Builder', url: '/resume-builder.html' }
];

function getRelevantLinks(queryText) {
  const query = (queryText || '').toLowerCase();
  const matches = CAREERHUB_LINKS
    .map(link => {
      const score = link.keywords.reduce((acc, keyword) => acc + (query.includes(keyword) ? 1 : 0), 0);
      return { ...link, score };
    })
    .filter(link => link.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (matches.length) return matches;
  return CAREERHUB_LINKS.slice(0, 3);
}

function formatUsefulLinks(links) {
  if (!links.length) return '';
  const list = links.map(link => `• <a href="${link.url}">${link.label}</a>`).join('<br>');
  return `<div class="chat-useful-links"><strong>Useful Career Pakistan links:</strong><br>${list}</div>`;
}

function inferCategoryFromText(text) {
  const q = String(text || '').toLowerCase();
  if (/(scholarship|funded|financial aid|bursary|hec)/.test(q)) return 'Scholarships';
  if (/(internship|trainee|intern)/.test(q)) return 'Internships';
  if (/(job|vacancy|hiring|career|government|govt|private)/.test(q)) return 'Jobs';
  if (/(book|notes|pdf|past paper)/.test(q)) return 'Books';
  if (/(exam|mdcat|css|test prep|syllabus)/.test(q)) return 'Exams';
  return null;
}

function scoreItem(item, query) {
  const text = [
    item.title, item.description, item.country, item.type, item.tags,
    item.location, item.organization, item.exam_type, item.author
  ].join(' ').toLowerCase();
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  return tokens.reduce((acc, token) => acc + (text.includes(token) ? 1 : 0), 0);
}

function searchInternalListings(queryText) {
  const data = window.CMS_DATA || {};
  const preferred = inferCategoryFromText(queryText);
  const categories = preferred ? [preferred] : ['Scholarships', 'Jobs', 'Internships', 'Books', 'Exams'];
  const results = [];

  categories.forEach((category) => {
    const list = Array.isArray(data[category]) ? data[category] : [];
    list.forEach((item) => {
      const score = scoreItem(item, queryText);
      if (score > 0) {
        results.push({
          category,
          score,
          title: item.title || 'Untitled',
          details: [item.country, item.location, item.deadline, item.type].filter(Boolean).join(' • '),
          link: item.apply_link || item.source_link || ''
        });
      }
    });
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

function formatInternalResults(results) {
  if (!results.length) return 'No direct internal listing match found.';
  return results.map((r, idx) => (
    `${idx + 1}. [${r.category}] ${r.title}${r.details ? ` — ${r.details}` : ''}${r.link ? ` (link: ${r.link})` : ''}`
  )).join('\n');
}

async function fetchWebContext(queryText, shouldSearch) {
  if (!shouldSearch) return [];
  try {
    const response = await fetch(`${WEB_SEARCH_ENDPOINT}?q=${encodeURIComponent(queryText)}&limit=4`);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.results)) return [];
    return data.results;
  } catch (err) {
    console.warn('[ChatBot] web search unavailable:', err);
    return [];
  }
}

function shouldUseWebSearch(queryText, internalMatches) {
  const q = queryText.toLowerCase();
  const explicitRealtime = /(latest|today|new|recent|breaking|update|deadline|202[6-9]|official)/.test(q);
  return explicitRealtime || internalMatches.length < 2;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLocalAssistantReply(queryText, internalMatches, usefulLinks) {
  const modeLabel = getProviderMode() === 'local'
    ? 'Local mode (no API)'
    : 'Assistant response';
  const topMatches = internalMatches.slice(0, 4);
  const sections = [];
  sections.push(`**${modeLabel}**`);
  if (topMatches.length) {
    const bestOptions = topMatches.map((item, index) => (
      `${index + 1}. ${item.title}${item.details ? ` — ${item.details}` : ''}`
    )).join('\n');
    sections.push(`**Best options:**\n${bestOptions}`);
    sections.push('**Why these match:**\nYour request overlaps with current Career Pakistan listings and keywords.');
  } else {
    sections.push('**Best options:**\nI could not find a direct listing match in loaded data.');
    sections.push('**Why these match:**\nThe local assistant can only use on-page data when APIs are unavailable.');
  }
  const nextStepLinks = usefulLinks
    .slice(0, 3)
    .map((link) => `${link.label}: ${link.url}`)
    .join('\n');
  sections.push(`**Next step:**\nOpen one of these pages and refine your search:\n${nextStepLinks || '/search.html'}`);
  sections.push(`_Your query: "${queryText}"_`);
  return sections.join('\n\n');
}

function updateProviderStatus(mode) {
  const statusNode = document.getElementById('chatbotStatus');
  if (!statusNode) return;
  const labels = {
    auto: '● Smart combo (Gemini → Groq)',
    gemini: '● Gemini API',
    groq: '● Groq API',
    local: '● Local only (no API)'
  };
  statusNode.textContent = labels[mode] || labels.auto;
}

function isAIEnabled() {
  return safeStorageGet(AI_ENABLED_KEY) !== '0';
}

function setAIEnabled(enabled) {
  safeStorageSet(AI_ENABLED_KEY, enabled ? '1' : '0');
  const launcher = document.getElementById('chatbotBtn');
  const panel = document.getElementById('chatbotPanel');
  const enableBtn = document.getElementById('chatbotEnableBtn');

  if (launcher) launcher.style.display = enabled ? 'flex' : 'none';
  if (panel && !enabled) panel.classList.remove('open');
  if (enableBtn) enableBtn.style.display = enabled ? 'none' : 'inline-flex';
}

function toggleAIEnabled() {
  setAIEnabled(!isAIEnabled());
}

// ── Toggle panel ─────────────────────────────────────────────
function toggleChatbot() {
  if (!isAIEnabled()) return;
  const panel = document.getElementById('chatbotPanel');
  const btn   = document.getElementById('chatbotBtn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (btn) btn.classList.toggle('open', isOpen);
  if (isOpen) {
    document.getElementById('chatbotInput')?.focus();
    if (!chatbotReady) {
      chatbotReady = true;
      appendBotMessage("👋 Hi! I'm <strong>Career Pakistan AI</strong>. Ask me about scholarships, jobs, exams, or career advice!");
    }
  }
}

// ── Send message ─────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chatbotInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;

  // Hide suggestion chips after first use
  const sug = document.getElementById('chatbotSuggestions');
  if (sug) sug.style.display = 'none';

  appendUserMessage(text);
  chatHistory.push({ role: 'user', parts: [{ text }] });
  const usefulLinks = getRelevantLinks(text);
  const internalMatches = searchInternalListings(text);
  const providerMode = getProviderMode();
  const webResults = await fetchWebContext(text, providerMode !== 'local' && shouldUseWebSearch(text, internalMatches));
  const webContext = webResults.length
    ? webResults.map((r, idx) => `${idx + 1}. ${r.title} — ${r.snippet} (${r.url})`).join('\n')
    : 'No external web results used.';

  const typingId = appendTyping();

  try {
     if (providerMode === 'local') {
    removeTyping(typingId);
     const localReply = buildLocalAssistantReply(text, internalMatches, usefulLinks);
     appendBotMessage(`${formatBotReply(localReply)}${formatUsefulLinks(usefulLinks)}`, localReply);
     chatHistory.push({ role: 'model', parts: [{ text: localReply }] });
     storeMemory(text, localReply, 0);
     input.disabled = false;
     input.focus();
     return;
    }

    const payload = {
      provider: providerMode,
       system_instruction: { parts: [{ text: `${buildContext()}

Answer policy:
- First use Career Pakistan internal listings/pages for answers about jobs, scholarships, books, internships, and exams.
- If internal data is limited or user asks for latest/outside info, use provided web context carefully and mention source URLs.
- Keep responses targeted and practical; do not provide generic filler.

Relevant internal pages for this query:
${usefulLinks.map(link => `- ${link.label}: ${link.url}`).join('\n')}

Best internal listing matches:
${formatInternalResults(internalMatches)}

Optional external web context:
${webContext}` }] },
      contents: chatHistory.map(m => ({ role: m.role, parts: m.parts })),
      generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
    };

    const res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    removeTyping(typingId);

    if (!res.ok || data.error) {
      const fallbackReply = buildLocalAssistantReply(text, internalMatches, usefulLinks);
      appendBotMessage(`⚠️ ${escapeHtml(data.error || 'Unable to reach AI service.')}<br><br>${formatBotReply(fallbackReply)}${formatUsefulLinks(usefulLinks)}`, fallbackReply);
      chatHistory.push({ role: 'model', parts: [{ text: fallbackReply }] });
      storeMemory(text, fallbackReply, 0);
    } else if (data.reply) {
      chatHistory.push({ role: 'model', parts: [{ text: data.reply }] });
      const sourceLinks = webResults.length
        ? `<div class="chat-useful-links"><strong>External references:</strong><br>${webResults.map(w => `• <a href="${w.url}" target="_blank" rel="noopener">${w.title || w.url}</a>`).join('<br>')}</div>`
        : '';
      appendBotMessage(`${formatBotReply(data.reply)}${formatUsefulLinks(usefulLinks)}${sourceLinks}`, data.reply);
      storeMemory(text, data.reply, 0);
    } else {
      appendBotMessage('Sorry, no response received. Please try again.');
    }
  } catch (err) {
    removeTyping(typingId);
    const fallbackReply = buildLocalAssistantReply(text, internalMatches, usefulLinks);
    appendBotMessage(`⚠️ Network issue detected. Showing local guidance.<br><br>${formatBotReply(fallbackReply)}${formatUsefulLinks(usefulLinks)}`, fallbackReply);
    chatHistory.push({ role: 'model', parts: [{ text: fallbackReply }] });
    storeMemory(text, fallbackReply, 0);
    console.error('[ChatBot] Error:', err);
  }

  input.disabled = false;
  input.focus();
}

// Simple markdown-to-HTML for bot replies
function formatBotReply(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ── Quick ask buttons ─────────────────────────────────────────
function quickAsk(text) {
  document.getElementById('chatbotInput').value = text;
  sendChat();
}

// ── DOM helpers ───────────────────────────────────────────────
function appendUserMessage(text) {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotMessage(html, rawText) {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = html;
  
  if (rawText) {
    const feedbackId = `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const actions = document.createElement('div');
    actions.className = 'chat-msg-actions';
    actions.innerHTML = `
      <button class="chat-feedback-btn" data-score="1" aria-label="Helpful">👍 Helpful</button>
      <button class="chat-feedback-btn" data-score="-1" aria-label="Not helpful">👎 Improve</button>`;
    actions.querySelectorAll('.chat-feedback-btn').forEach(btn => {
      btn.addEventListener('click', () => submitFeedback({
        id: feedbackId,
        score: Number(btn.dataset.score),
        answer: rawText,
        question: chatHistory.filter(x => x.role === 'user').slice(-1)[0]?.parts?.[0]?.text || '',
        page: location.pathname
      }, actions));
    });
    div.appendChild(actions);
  }

  
  if (rawText) {
    const utility = document.createElement('div');
    utility.className = 'chat-msg-actions';
    utility.innerHTML = `
      <button class="chat-feedback-btn" aria-label="Copy response">📋 Copy</button>
      <button class="chat-feedback-btn" aria-label="Download response">⬇️ Save</button>`;

    const [copyBtn, saveBtn] = utility.querySelectorAll('button');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawText);
        copyBtn.textContent = '✅ Copied';
      } catch {
        copyBtn.textContent = '⚠️ Copy failed';
      }
    });
    saveBtn.addEventListener('click', () => {
      const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerpk-ai-${Date.now()}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
    div.appendChild(utility);
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function submitFeedback(payload, actionsEl) {
  if (actionsEl) {
    actionsEl.querySelectorAll('button').forEach(btn => btn.disabled = true);
  }

  const record = { ...payload, ts: new Date().toISOString() };
  let stored = [];
  try {
    stored = JSON.parse(safeStorageGet(CHAT_FEEDBACK_KEY) || '[]');
  } catch {
    stored = [];
  }
  stored.push(record);
  storeMemory(payload.question, payload.answer, payload.score);
  
  try {
    await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  } catch (err) {
    console.warn('[ChatBot] feedback submit failed:', err);
  }
}

function appendTyping() {
  const msgs = document.getElementById('chatbotMessages');
  if (!msgs) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg bot typing';
  div.id = id;
  div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) {
  if (id) document.getElementById(id)?.remove();
}

// ── Inject HTML ───────────────────────────────────────────────
function injectChatbot() {
  if (document.getElementById('chatbotPanel')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <button class="chatbot-enable-btn" id="chatbotEnableBtn" aria-label="Enable AI Adviser" title="Enable AI Adviser">
    🤖 Enable AI
  </button>
  <button class="chatbot-toggle-btn" id="chatbotBtn" aria-label="Open AI Chat" title="Career Pakistan AI">
  <svg class="chat-icon-open" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <svg class="chat-icon-close" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    <span class="chatbot-badge">AI</span>
  </button>

  <div class="chatbot-panel" id="chatbotPanel" role="dialog" aria-label="Career Pakistan AI Chat">
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <div class="chatbot-avatar">🤖</div>
        <div>
          <strong>Career Pakistan AI</strong>
          <span class="chatbot-status" id="chatbotStatus">● Smart combo (Gemini → Groq)</span>
        </div>
      </div>
      <button class="chatbot-close-btn" id="chatbotCloseBtn" aria-label="Close chat">✕</button>
    </div>
    <div class="chatbot-messages" id="chatbotMessages" role="log" aria-live="polite"></div>
    <div class="chatbot-suggestions" id="chatbotSuggestions">
      <button onclick="quickAsk('Best fully funded scholarships for Pakistan?')">🎓 Scholarships</button>
      <button onclick="quickAsk('How to prepare for MDCAT 2025?')">🩺 MDCAT prep</button>
      <button onclick="quickAsk('Latest government jobs in Pakistan?')">🏛️ Govt jobs</button>
      <button onclick="quickAsk('CSS exam tips and syllabus?')">📋 CSS advice</button>
    </div>
    <div class="chatbot-input-row">
      <input type="text" id="chatbotInput" placeholder="Ask me anything…" 
             onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChat();}" 
             maxlength="500" autocomplete="off"/>
      <button id="chatbotSendBtn" class="chatbot-send-btn" aria-label="Send message">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div class="chatbot-footer">
      <label for="chatbotProviderSelect" class="chatbot-provider-label">Mode</label>
      <select id="chatbotProviderSelect" class="chatbot-provider-select" aria-label="Select AI mode">
        <option value="auto">Smart combo</option>
        <option value="gemini">Gemini API</option>
        <option value="groq">Groq API</option>
        <option value="local">Local only (no API)</option>
      </select>
      <button class="chatbot-mini-link" id="chatbotHideBtn">Hide AI on this device</button>
    </div>
  </div>`);
}

function bindChatbotEvents() {
  const toggleBtn = document.getElementById('chatbotBtn');
  const closeBtn = document.getElementById('chatbotCloseBtn');
  const sendBtn = document.getElementById('chatbotSendBtn');
  const enableBtn = document.getElementById('chatbotEnableBtn');
  const hideBtn = document.getElementById('chatbotHideBtn');
  const providerSelect = document.getElementById('chatbotProviderSelect');
  
  if (toggleBtn) toggleBtn.addEventListener('click', toggleChatbot);
  if (closeBtn) closeBtn.addEventListener('click', toggleChatbot);
  if (sendBtn) sendBtn.addEventListener('click', sendChat);
  if (enableBtn) enableBtn.addEventListener('click', toggleAIEnabled);
  if (hideBtn) hideBtn.addEventListener('click', toggleAIEnabled);
  if (providerSelect) {
    providerSelect.value = getProviderMode();
    providerSelect.addEventListener('change', (event) => {
      setProviderMode(event.target.value);
    });
    updateProviderStatus(providerSelect.value);
  }
}

// ── Styles ────────────────────────────────────────────────────
function injectChatbotStyles() {
  if (document.getElementById('chatbot-styles')) return;
  const style = document.createElement('style');
  style.id = 'chatbot-styles';
  style.textContent = `
      .chatbot-enable-btn {
      position: fixed; bottom: 90px; right: 20px;
      height: 40px; border-radius: 999px;
      border: 1px solid #c7d2fe;
      background: #eef2ff; color: #4338ca;
      font-weight: 600; padding: 0 12px;
      cursor: pointer; z-index: 10001;
      display: none; align-items: center; justify-content: center;
      box-shadow: 0 6px 16px rgba(67,56,202,0.25);    
    }
    .chatbot-toggle-btn {
      position: fixed; bottom: 90px; right: 20px;
      width: 64px; height: 64px; border-radius: 20px;
      background: linear-gradient(145deg, #4f46e5, #7c3aed);
      color: white; border: 1px solid rgba(255,255,255,0.35); cursor: pointer;
      box-shadow: 0 10px 30px rgba(79,70,229,0.45);
      z-index: 9998; display: flex; align-items: center; justify-content: center;
      transition: transform 0.3s, box-shadow 0.3s;
            transition: transform 0.3s, box-shadow 0.3s, border-radius 0.25s ease;
    }
    .chatbot-toggle-btn::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 24px;
      border: 2px solid rgba(99, 102, 241, 0.35);
      animation: chatbotPulse 2s infinite;
    }
    .chatbot-toggle-btn:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 14px 34px rgba(99,102,241,0.58); border-radius: 18px; }
    .chatbot-toggle-btn.open { border-radius: 16px; }
    @keyframes chatbotPulse {
      0% { transform: scale(0.95); opacity: 0.65; }
      70% { transform: scale(1.08); opacity: 0; }
      100% { transform: scale(1.08); opacity: 0; }
    }
    .chat-icon-close { display: none; }
    .chatbot-toggle-btn.open .chat-icon-open { display: none; }
    .chatbot-toggle-btn.open .chat-icon-close { display: block; }
    .chatbot-badge {
      position: absolute; top: -4px; right: -4px;
      background: #f59e0b; color: #000; font-size: 0.55rem;
      font-weight: 700; padding: 2px 5px; border-radius: 99px;
    }
        .chat-useful-links {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed var(--border, #d1d5db);
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .chatbot-panel {
      position: fixed; bottom: 158px; right: 20px;
      width: 360px; max-height: 530px;
      background: var(--bg-card, #fff);
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      z-index: 9997; display: flex; flex-direction: column;
      overflow: hidden; opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
      border: 1px solid var(--border, #e5e7eb);
    }
    .chatbot-panel.open { display: flex; opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    .chatbot-header {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0;
    }
    .chatbot-header-info { display: flex; align-items: center; gap: 10px; }
    .chatbot-avatar { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
    .chatbot-status { display: block; font-size: 0.7rem; opacity: 0.85; color: #a7f3d0; margin-top: 1px; }
    .chatbot-close-btn { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 1.1rem; padding: 4px 6px; border-radius: 6px; transition: background 0.2s; line-height: 1; }
    .chatbot-close-btn:hover { background: rgba(255,255,255,0.15); color: white; }
    .chatbot-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      background: var(--bg-main, #f8fafc);
      min-height: 180px; max-height: 280px;
      scroll-behavior: smooth;
    }
    .chat-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 16px;
      font-size: 0.875rem; line-height: 1.55; word-break: break-word;
    }
    .chat-msg.user {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white; align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .chat-msg.bot {
      background: var(--bg-card, #fff); color: var(--text-main, #1a1a2e);
      align-self: flex-start; border-bottom-left-radius: 4px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
    }
    .chat-msg.bot a { color: #6366f1; text-decoration: underline; }
        .chat-msg-actions { margin-top: 8px; display: flex; gap: 6px; }
    .chat-feedback-btn {
      border: 1px solid #d1d5db; background: #fff;
      border-radius: 999px; padding: 3px 10px; font-size: 0.72rem;
      cursor: pointer;
    }
    .chat-feedback-btn:disabled { opacity: 0.65; cursor: default; }
    .chat-msg.typing { display: flex; align-items: center; gap: 5px; padding: 14px; }
    .dot { width: 7px; height: 7px; background: #6366f1; border-radius: 50%; animation: dotBounce 1.2s infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dotBounce { 0%,80%,100% { transform:scale(0.6);opacity:0.4; } 40% { transform:scale(1);opacity:1; } }
    .chatbot-suggestions {
      padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px;
      background: var(--bg-main, #f8fafc);
      border-top: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
    }
    .chatbot-suggestions button {
      background: var(--bg-card, #fff); border: 1px solid var(--border, #e5e7eb);
      border-radius: 99px; padding: 5px 11px; font-size: 0.75rem;
      cursor: pointer; color: var(--text-main, #374151);
      transition: all 0.2s; font-family: inherit;
    }
    .chatbot-suggestions button:hover { background: #6366f1; color: white; border-color: #6366f1; }
    .chatbot-input-row {
      display: flex; align-items: center; padding: 10px 12px;
      border-top: 1px solid var(--border, #e5e7eb);
      background: var(--bg-card, #fff); gap: 8px; flex-shrink: 0;
    }
    .chatbot-input-row input {
      flex: 1; border: 1.5px solid var(--border, #e5e7eb);
      border-radius: 99px; padding: 9px 16px; font-size: 0.875rem;
      outline: none; background: var(--bg-main, #f8fafc);
      color: var(--text-main, #1a1a2e); transition: border-color 0.2s;
      font-family: inherit;
    }
    .chatbot-input-row input:focus { border-color: #6366f1; }
    .chatbot-input-row input:disabled { opacity: 0.6; cursor: not-allowed; }
    .chatbot-send-btn {
      width: 40px; height: 40px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none; border-radius: 50%; color: white;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .chatbot-send-btn:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
    .chatbot-footer {
      border-top: 1px solid var(--border, #e5e7eb);
      padding: 7px 12px; display: flex; justify-content: center; align-items: center; gap: 8px;
      background: var(--bg-main, #f8fafc);
    }
        .chatbot-provider-label { font-size: 0.72rem; color: #6b7280; }
    .chatbot-provider-select {
      border: 1px solid var(--border, #d1d5db);
      border-radius: 999px;
      font-size: 0.72rem;
      padding: 4px 9px;
      background: var(--bg-card, #fff);
      color: var(--text-main, #1f2937);
    }
    .chatbot-mini-link {
      background: transparent; border: none; color: #6b7280;
      font-size: 0.72rem; cursor: pointer; text-decoration: underline;
    }
    @media (max-width: 480px) {
      .chatbot-panel { width: calc(100vw - 24px); right: 12px; bottom: 130px; max-height: 70vh; }
      .chatbot-toggle-btn { bottom: 76px; right: 12px; width: 58px; height: 58px; border-radius: 18px; }
      .chatbot-enable-btn { right: 12px; bottom: 76px; }
    }
    body.dark .chatbot-panel { background: #1e1e2e; border-color: #374151; }
    body.dark .chatbot-messages { background: #181825; }
    body.dark .chat-msg.bot { background: #2a2a3e; color: #e5e7eb; }
    body.dark .chatbot-input-row { background: #1e1e2e; border-color: #374151; }
    body.dark .chatbot-input-row input { background: #181825; color: #e5e7eb; border-color: #374151; }
    body.dark .chatbot-suggestions { background: #181825; border-color: #374151; }
    body.dark .chatbot-suggestions button { background: #2a2a3e; color: #e5e7eb; border-color: #374151; }
    body.dark .chatbot-close-btn { color: rgba(255,255,255,0.7); }
    body.dark .chatbot-provider-select { background: #2a2a3e; color: #e5e7eb; border-color: #374151; }
  `;
  document.head.appendChild(style);
}

// ── Auto-init ────────────────────────────────────────────────
window.toggleChatbot = toggleChatbot;
window.sendChat = sendChat;
window.quickAsk = quickAsk;
window.toggleAIEnabled = toggleAIEnabled;

function initChatbot() {
  injectChatbotStyles();
  injectChatbot();
  bindChatbotEvents();
  setAIEnabled(isAIEnabled());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot, { once: true });
} else {
  initChatbot();
}
