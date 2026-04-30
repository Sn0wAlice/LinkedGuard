console.log('[LinkedGuard] 8/11 detector.js');
// Multi-strategy selector resolution — LinkedIn changes class names often
function queryFirst(root, selectors) {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

function queryAll(root, selectors) {
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els.length) return Array.from(els);
    } catch (_) {}
  }
  return [];
}

// Walk into open shadow roots — LinkedIn renders messaging via #interop-outlet shadow DOM.
function getAllShadowRoots(root = document) {
  const roots = [];
  const walker = (node) => {
    try {
      const all = node.querySelectorAll('*');
      for (const el of all) {
        if (el.shadowRoot) {
          roots.push(el.shadowRoot);
          walker(el.shadowRoot);
        }
      }
    } catch (_) {}
  };
  walker(root);
  return roots;
}

function deepQuerySelectorAll(selector) {
  const results = [];
  try { results.push(...document.querySelectorAll(selector)); } catch (_) {}
  for (const sr of getAllShadowRoots()) {
    try { results.push(...sr.querySelectorAll(selector)); } catch (_) {}
  }
  return results;
}

function deepQueryAllSelectors(selectors) {
  const seen = new Set();
  const out = [];
  for (const sel of selectors) {
    let matches;
    try { matches = deepQuerySelectorAll(sel); } catch (_) { continue; }
    for (const el of matches) {
      if (!seen.has(el)) { seen.add(el); out.push(el); }
    }
  }
  return out;
}

// Conversation list items — full page + overlay widget
const LISTITEM_SELECTORS = [
  // Full messaging page
  'li.msg-conversation-listitem',
  'li[class*="conversation-listitem"]',
  'li[class*="conversation-list-item"]',
  '[class*="msg-conversation-list"] li',
  '[class*="conversations-container"] li',
  // Overlay widget (bottom-right bubble on all LinkedIn pages)
  '[class*="msg-overlay-list-bubble"] li',
  '[class*="msg-overlay"] li[class*="conversation"]',
  '[class*="msg-overlay"] li',
  '[class*="overlay-conversation"]',
  'li[class*="overlay"][class*="convo"]',
  '[class*="msg-overlay"] [class*="conversation"]',
  // Generic fallback
  '[class*="conversation"] li[class]',
];

// Preview / snippet text
const PREVIEW_SELECTORS = [
  '[class*="message-snippet"]',
  '[class*="msg-conversation-card__message-snippet"]',
  '[class*="conversation-card__message"]',
  '[class*="preview"]',
  '[class*="snippet"]',
  '[class*="last-message"]',
];

// Unread badge / dot
const UNREAD_SELECTORS = [
  '[class*="unread-count"]',
  '[class*="notification-badge"]',
  '[class*="unread"]',
  '.notification-badge__count',
];

// Sender name
const SENDER_SELECTORS = [
  '[class*="participant-name"]',
  '[class*="participants-names"]',
  '[class*="sender"]',
  '[class*="conversation-title"]',
  'h3',
];

function getUnreadCount(listitem) {
  // 1. Try badge with a number
  for (const sel of UNREAD_SELECTORS) {
    try {
      const els = listitem.querySelectorAll(sel);
      for (const el of els) {
        const n = parseInt(el.textContent.replace(/\D/g, ''), 10);
        if (!isNaN(n) && n > 0) return n;
      }
    } catch (_) {}
  }
  // 2. Try aria-label on the item
  const label = listitem.getAttribute('aria-label') || '';
  const m = label.match(/(\d+)\s*(unread|non.?lu)/i);
  if (m) return parseInt(m[1], 10);

  // 3. Is the item styled as unread (bold text, specific class)?
  const hasUnreadClass = [...listitem.classList].some((c) =>
    c.includes('unread') || c.includes('unseen')
  );
  if (hasUnreadClass) return 1; // treat as 1 (unknown, allow through)

  // 4. Is there a visible dot/pip (element with no text but unread-like class)?
  const dot = listitem.querySelector('[class*="unread"]:not([class*="count"]):not([class*="badge"])');
  if (dot && dot.offsetWidth > 0) return 1;

  return 0; // read
}

function getPreviewText(listitem) {
  // 1. Known selectors
  for (const sel of PREVIEW_SELECTORS) {
    try {
      const el = listitem.querySelector(sel);
      if (el?.textContent.trim()) return el.textContent.trim();
    } catch (_) {}
  }

  // 2. Structural: find all <span>/<p> text nodes, pick the one that's not a name/time
  const candidates = listitem.querySelectorAll('span, p');
  const timePattern = /^\d{1,2}[h:]\d{2}|^\d+ (jan|fév|mar|avr|mai|juin|juil|aoû|sep|oct|nov|déc|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

  for (const el of candidates) {
    const text = el.textContent.trim();
    if (text.length < 5) continue;
    if (timePattern.test(text)) continue;
    if (el.querySelector('span, p')) continue; // skip containers
    // Skip if it looks like a sender name (short, no spaces after first word often)
    if (text.length > 15) return text;
  }
  return null;
}

function getSenderName(listitem) {
  for (const sel of SENDER_SELECTORS) {
    try {
      const el = listitem.querySelector(sel);
      if (el?.textContent.trim()) return el.textContent.trim().split('\n')[0];
    } catch (_) {}
  }
  return null;
}

let _kwIndexLogged = false;
function buildKeywordIndex(config) {
  const entries = [];
  if (!config?.filterLists?.length) {
    if (!_kwIndexLogged) {
      console.warn('[LinkedGuard] config.filterLists is empty/missing!', config);
      _kwIndexLogged = true;
    }
    return entries;
  }
  for (const list of config.filterLists) {
    if (!list.enabled) continue;
    for (const kw of list.keywords) {
      const normalized = config.caseSensitive ? kw : kw.toLowerCase();
      // Pre-compile regex for short keywords to avoid false positives (e.g. "ia" inside "via")
      const useWordBoundary = normalized.length <= 3;
      entries.push({
        keyword: normalized,
        listId: list.id,
        listName: list.name,
        regex: useWordBoundary
          ? new RegExp(`\\b${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, config.caseSensitive ? '' : 'i')
          : null,
      });
    }
  }
  if (!_kwIndexLogged) {
    console.log('[LinkedGuard] keyword index built:', entries.length, 'keywords from',
      config.filterLists.filter(l => l.enabled).map(l => l.id).join(', '));
    _kwIndexLogged = true;
  }
  return entries;
}

function matchKeywords(text, keywordIndex, caseSensitive) {
  const haystack = caseSensitive ? text : text.toLowerCase();
  for (const { keyword, listId, listName, regex } of keywordIndex) {
    const matched = regex ? regex.test(text) : haystack.includes(keyword);
    if (matched) return { keyword, listId, listName };
  }
  return null;
}

// Walk up from a thread <a> link to its unique conversation card.
// LinkedIn puts MANY <a> links to the same thread inside one card (avatar, name,
// snippet, timestamp, kebab…). Stop at the largest ancestor whose only thread
// links point to THIS thread — going up further would include other conversations.
function findConversationContainer(link) {
  const targetHref = link.href;
  let el = link;
  for (let i = 0; i < 12 && el && el.parentElement; i++) {
    const parent = el.parentElement;
    let hasOtherThreadLink = false;
    try {
      const linksInParent = parent.querySelectorAll('a[href*="/messaging/thread/"]');
      for (const a of linksInParent) {
        if (a.href !== targetHref) { hasOtherThreadLink = true; break; }
      }
    } catch (_) { return el; }
    if (hasOtherThreadLink) {
      // Going up further would include other conversations — el is the unique card
      return el;
    }
    el = parent;
  }
  return null;
}

function extractThreadId(href) {
  try {
    const m = href.match(/\/messaging\/thread\/([^/?&#]+)/);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

function getAllListitems() {
  // Strategy 1 (preferred): URL-based — one container per unique THREAD ID.
  // (href can vary by query/hash for the same thread — dedup by ID from the path.)
  const urlBased = [];
  const containerSet = new Set();
  try {
    const allLinks = deepQuerySelectorAll('a[href*="/messaging/thread/"]');
    const linkPerThreadId = new Map();
    for (const a of allLinks) {
      const id = extractThreadId(a.href);
      if (id && !linkPerThreadId.has(id)) linkPerThreadId.set(id, a);
    }
    for (const link of linkPerThreadId.values()) {
      const container = findConversationContainer(link);
      if (container && !containerSet.has(container)) {
        containerSet.add(container);
        urlBased.push(container);
      }
    }
  } catch (_) {}
  if (urlBased.length) return urlBased;

  // Fallback: class-based selectors
  const classBased = [];
  for (const item of deepQueryAllSelectors(LISTITEM_SELECTORS)) {
    if (!containerSet.has(item)) { containerSet.add(item); classBased.push(item); }
  }
  return classBased;
}

// Debug helper — call from Browser Console (Ctrl+Shift+J): __linkedguardDebug()
function __linkedguardDebug() {
  const shadowRoots = getAllShadowRoots();
  const classBased = deepQueryAllSelectors(LISTITEM_SELECTORS);
  const threadLinks = deepQuerySelectorAll('a[href*="/messaging/thread/"]');
  const fromLinks = threadLinks.map(findConversationContainer).filter(Boolean);
  const overlayRoots = [
    ...deepQuerySelectorAll('[class*="msg-overlay"]'),
    ...deepQuerySelectorAll('[id*="msg-overlay"]'),
  ];
  const allMsgClasses = new Set();
  const scanForMsgClasses = (root) => {
    try {
      for (const el of root.querySelectorAll('[class*="msg-"]')) {
        if (typeof el.className === 'string') {
          el.className.split(/\s+/).forEach((c) => { if (c.startsWith('msg-')) allMsgClasses.add(c); });
        }
      }
    } catch (_) {}
  };
  scanForMsgClasses(document);
  for (const sr of shadowRoots) scanForMsgClasses(sr);
  const iframes = Array.from(document.querySelectorAll('iframe')).map((f) => f.src || '(no src)');

  // Look for ANY class hinting at messaging, not just msg-*
  const broadClasses = new Set();
  for (const el of document.querySelectorAll('[class]')) {
    if (typeof el.className !== 'string') continue;
    for (const c of el.className.split(/\s+/)) {
      if (/messag|convers|chat|inbox|thread/i.test(c)) broadClasses.add(c);
    }
  }

  // Check for shadow DOM hosts
  const shadowHosts = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.shadowRoot) shadowHosts.push(el);
    if (shadowHosts.length >= 10) break;
  }

  const tag = window === window.top ? 'TOP' : 'CHILD';
  console.group(`[LinkedGuard] DEBUG [${tag}] ${location.pathname}`);
  console.log('URL:', location.href);
  console.log('document.body children count:', document.body?.children?.length);
  console.log('class-based items found:', classBased.length, classBased);
  console.log('thread links found:', threadLinks.length, threadLinks);
  console.log('containers walked from links:', fromLinks.length, fromLinks);
  console.log('overlay roots:', overlayRoots.length, overlayRoots);
  console.log('iframes on page:', iframes);
  console.log('msg-* classes:', [...allMsgClasses].sort());
  console.log('broad messaging-like classes:', [...broadClasses].sort());
  console.log('shadow DOM hosts (first 10):', shadowHosts);
  console.log('total shadow roots discovered:', shadowRoots.length);
  console.groupEnd();
  return { classBased: classBased.length, threadLinks: threadLinks.length, containers: fromLinks.length };
}

try { window.__linkedguardDebug = __linkedguardDebug; } catch (_) {}
try { globalThis.__linkedguardDebug = __linkedguardDebug; } catch (_) {}

async function evaluateListitem(listitem, config, processedSet) {
  if (!config.enabled) return;

  const kwHash = getKwHash(config);

  // Already processed — but re-apply flag if React wiped the styles
  if (processedSet.has(listitem)) {
    if (!listitem.querySelector('.lg-flag-name')) {
      const cached = cacheGet(listitem, kwHash);
      if (cached && cached.action === 'flag') {
        flagConversation(listitem, cached.keyword, cached.listName);
      }
    }
    return;
  }

  // Check cache first — re-apply flag if needed, skip full evaluation
  const cached = cacheGet(listitem, kwHash);
  if (cached !== null) {
    processedSet.add(listitem);
    if (cached && cached.action === 'flag') {
      flagConversation(listitem, cached.keyword, cached.listName);
    }
    return;
  }

  const unread = getUnreadCount(listitem);
  const preview = getPreviewText(listitem);
  const sender = getSenderName(listitem);

  console.log('[LinkedGuard] item:', { sender, unread, preview: preview?.slice(0, 60) });

  if (unread > 1) { console.log('[LinkedGuard] skip: unread > 1'); return; }
  if (!preview) { console.log('[LinkedGuard] skip: no preview'); return; }
  if (/^(vous|you)\s*:/i.test(preview)) { console.log('[LinkedGuard] skip: sent by us'); return; }

  const keywordIndex = buildKeywordIndex(config);
  const match = matchKeywords(preview, keywordIndex, config.caseSensitive);

  if (!match) {
    // Cache negative result to avoid re-evaluating
    cacheSet(listitem, kwHash, false);
    console.log('[LinkedGuard] no match in:', preview?.slice(0, 60));
    return;
  }

  console.log('[LinkedGuard] MATCH →', match.keyword, '(', match.listName, ') | sender:', sender);

  processedSet.add(listitem);
  await dispatch(listitem, match.keyword, match.listId, sender, preview, config);
}
