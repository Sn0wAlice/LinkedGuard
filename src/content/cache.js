console.log('[LinkedGuard] 4/11 cache.js');
// sessionStorage cache for flagged conversations.
// Avoids re-evaluating keywords on every MutationObserver tick.
// Invalidated automatically when keywords/lists change.

const CACHE_KEY = 'lg_flagged_cache';

function getKwHash(config) {
  // Fingerprint of all active keywords — used to detect config changes
  return config.filterLists
    .filter((l) => l.enabled)
    .flatMap((l) => l.keywords.map((k) => `${l.id}:${k}`))
    .sort()
    .join('|');
}

function loadCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{"kwHash":"","entries":{}}');
  } catch (_) {
    return { kwHash: '', entries: {} };
  }
}

function saveCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (_) {}
}

function getConvId(listitem) {
  // Prefer stable thread ID from URL
  const link = listitem.querySelector('a[href*="/messaging/thread/"], a[href*="/messaging/"]');
  if (link) {
    const m = link.href.match(/thread\/([^/?&#]+)/);
    if (m) return m[1];
  }
  // Fallback: stable hash of sender name
  const sender = getSenderName(listitem);
  if (!sender) return null;
  let hash = 0;
  for (let i = 0; i < sender.length; i++) {
    hash = (Math.imul(31, hash) + sender.charCodeAt(i)) | 0;
  }
  return 'name_' + Math.abs(hash).toString(36);
}

function cacheGet(listitem, kwHash) {
  const cache = loadCache();
  if (cache.kwHash !== kwHash) return null; // invalidated
  const id = getConvId(listitem);
  return id ? (cache.entries[id] ?? null) : null;
}

// entry = { action, keyword, listId, listName, senderName } or false (= evaluated, no match)
function cacheSet(listitem, kwHash, entry) {
  let cache = loadCache();
  if (cache.kwHash !== kwHash) {
    // Config changed — reset cache
    cache = { kwHash, entries: {} };
  }
  const id = getConvId(listitem);
  if (id) {
    cache.entries[id] = entry;
    saveCache(cache);
  }
}

function invalidateCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (_) {}
}

// Re-apply flag styles to cached items after React re-renders them
function reapplyCacheFlags(config) {
  const kwHash = getKwHash(config);
  const cache = loadCache();
  if (!cache.entries || cache.kwHash !== kwHash) return;

  const items = getAllListitems();
  for (const item of items) {
    const id = getConvId(item);
    if (!id) continue;
    const entry = cache.entries[id];
    if (!entry) continue;

    if (entry.action === 'flag' && !item.querySelector('.lg-flag-name')) {
      flagConversation(item, entry.keyword, entry.listName);
    }
    // Mark as processed so the observer doesn't re-evaluate from scratch
    if (typeof processedConversations !== 'undefined') {
      processedConversations.add(item);
    }
  }
}
