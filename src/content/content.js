console.log('[LinkedGuard] 11/11 content.js');

// Merge built-in lists into stored config so users who installed before a
// new built-in list was added still get it (without overwriting their custom edits).
function mergeBuiltinLists(config) {
  const lists = Array.isArray(config?.filterLists) ? [...config.filterLists] : [];
  const existingIds = new Set(lists.map((l) => l && l.id));
  for (const builtin of BUILTIN_LISTS) {
    if (!existingIds.has(builtin.id)) lists.push(builtin);
  }
  // Archive mode is disabled (coming soon) — force flag everywhere.
  const sanitizedLists = lists.map((l) =>
    l && l.action === 'archive' ? { ...l, action: 'inherit' } : l
  );
  return { ...config, filterLists: sanitizedLists, defaultAction: 'flag' };
}

(async () => {
  // Load initial config
  let config;
  try {
    config = await getConfig();
  } catch (_) {
    config = DEFAULT_CONFIG;
  }
  config = mergeBuiltinLists(config);
  console.log(
    '[LinkedGuard] config loaded — enabled:', config.enabled,
    '| defaultAction:', config.defaultAction,
    '| lists:', config.filterLists?.map((l) => `${l.id}(${l.enabled ? 'on' : 'off'},${l.keywords?.length || 0}kw)`).join(', ')
  );

  if (config.enabled) {
    startObserver(config);
    startThreadObserver(config);

    // LinkedIn renders progressively — retry multiple times to catch late-loaded conversations
    [400, 1000, 2000, 4000, 7000].forEach((delay) => {
      setTimeout(() => {
        scanConversations();
        reapplyCacheFlags(config);
      }, delay);
    });
    setTimeout(() => scanOpenThread(config), 1500);

    // Auto-debug at multiple intervals so overlay can be opened between snapshots
    [3000, 10000, 25000].forEach((delay) => {
      setTimeout(() => {
        try { __linkedguardDebug(); } catch (_) {}
      }, delay);
    });
  }

  // React to config changes from popup/options without page reload
  browserAPI.storage.onChanged.addListener((changes, area) => {
    if (!['sync', 'local'].includes(area) || !changes[STORAGE_KEY]) return;
    const newConfig = changes[STORAGE_KEY].newValue;
    if (newConfig) {
      const merged = mergeBuiltinLists(newConfig);
      updateConfig(merged);
      if (merged.enabled) startThreadObserver(merged);
      else stopThreadObserver();
    }
  });
})();
