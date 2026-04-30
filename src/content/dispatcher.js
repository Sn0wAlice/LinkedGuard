console.log('[LinkedGuard] 7/11 dispatcher.js');
async function dispatch(listitem, matchedKeyword, listId, senderName, messagePreview, config) {
  const list = config.filterLists.find((l) => l.id === listId);
  const listName = list?.name || listId;
  // Archive is disabled (coming soon) — always flag for now.
  const action = 'flag';

  console.log('[LinkedGuard] dispatch:', { action, keyword: matchedKeyword, listName, sender: senderName });

  const entry = {
    timestamp: new Date().toISOString(),
    senderName: senderName || 'Unknown',
    messagePreview: (messagePreview || '').slice(0, 120),
    matchedKeyword,
    listId,
    listName,
    action,
    archived: false,
  };

  let finalAction = action;
  try {
    if (action === 'archive') {
      await archiveConversation(listitem);
      entry.archived = true;
    } else {
      flagConversation(listitem, matchedKeyword, listName);
    }
  } catch (err) {
    console.warn('[LinkedGuard] archive failed, falling back to flag:', err.message);
    // Archive failed (LinkedIn DOM mismatch, kebab not found, etc.) — at least flag visually
    try {
      flagConversation(listitem, matchedKeyword, listName);
      finalAction = 'flag';
      entry.action = 'flag';
      entry.archived = false;
    } catch (e) {
      console.warn('[LinkedGuard] flag fallback also failed:', e.message);
    }
  }

  // Write to session cache (use finalAction so fallback flag is restored on rescan)
  const kwHash = getKwHash(config);
  cacheSet(listitem, kwHash, { action: finalAction, keyword: matchedKeyword, listId, listName, senderName });

  // Send log + stats to service worker
  try {
    browserAPI.runtime.sendMessage({ type: 'LOG_ACTION', payload: { entry, action: finalAction } });
  } catch (_) {}
}
