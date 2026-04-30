console.log('[LinkedGuard] 9/11 observer.js');
let activeObserver = null;
let currentConfig = null;
let processedConversations = new WeakSet();

// Rate limiting
let actionsThisMinute = 0;
let rateLimitResetTimer = null;

function checkRateLimit() {
  if (actionsThisMinute >= ARCHIVE_RATE_LIMIT) return false;
  actionsThisMinute++;
  if (!rateLimitResetTimer) {
    rateLimitResetTimer = setTimeout(() => {
      actionsThisMinute = 0;
      rateLimitResetTimer = null;
    }, 60000);
  }
  return true;
}

const scanConversations = debounce(async () => {
  if (!currentConfig?.enabled) return;

  try { reapplyFlags(); } catch (_) {}
  try { reapplyCacheFlags(currentConfig); } catch (_) {}

  let items;
  try { items = getAllListitems(); } catch (_) { return; }
  console.log('[LinkedGuard] scanConversations: found', items.length, 'items');
  if (!items.length) return;

  for (const item of items) {
    try {
      if (processedConversations.has(item)) continue;
    } catch (_) { continue; }
    if (!checkRateLimit()) break;
    try {
      await evaluateListitem(item, currentConfig, processedConversations);
    } catch (_) {}
  }
}, OBSERVER_DEBOUNCE_MS);

const observedShadowRoots = new WeakSet();

function attachShadowObservers() {
  // Discover and observe newly attached shadow roots so DOM mutations
  // inside LinkedIn's interop-outlet shadow trigger our scan.
  try {
    for (const sr of getAllShadowRoots()) {
      if (observedShadowRoots.has(sr)) continue;
      observedShadowRoots.add(sr);
      try {
        new MutationObserver(scanConversations).observe(sr, { childList: true, subtree: true });
      } catch (_) {}
    }
  } catch (_) {}
}

function startObserver(config) {
  currentConfig = config;
  if (activeObserver) return;

  activeObserver = new MutationObserver(() => {
    attachShadowObservers();
    scanConversations();
  });
  activeObserver.observe(document.body, { childList: true, subtree: true });
  attachShadowObservers();
}

function stopObserver() {
  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }
}

function updateConfig(config) {
  // If keywords changed, invalidate cache and re-scan everything
  const oldHash = currentConfig ? getKwHash(currentConfig) : null;
  const newHash = getKwHash(config);
  if (oldHash && oldHash !== newHash) {
    invalidateCache();
    processedConversations = new WeakSet(); // reset so all items get re-evaluated
    setTimeout(scanConversations, 100);
  }

  currentConfig = config;
  if (config.enabled && !activeObserver) {
    startObserver(config);
  } else if (!config.enabled && activeObserver) {
    stopObserver();
  }
}
