console.log('[LinkedGuard] 10/11 thread-scanner.js');
// Scans the open conversation thread (right panel) for keyword matches.
// Triggered when the user opens a conversation — reads the full message text.

const scannedThreads = new WeakSet();
let threadObserver = null;

// Selectors for the right-panel thread view
const THREAD_PANEL_SELECTORS = [
  '.msg-s-message-list-container',
  '[class*="msg-s-message-list"]',
  '[class*="message-list-container"]',
  '[class*="thread"]',
];

// Selectors for individual message bubbles from the OTHER person
const MSG_FROM_OTHER_SELECTORS = [
  '.msg-s-event-listitem--other .msg-s-event-listitem__message-bubble',
  '[class*="event-listitem--other"] [class*="message-bubble"]',
  '[class*="event-listitem--other"] [class*="message-body"]',
  '[class*="received"] [class*="message"]',
];

// Selectors for the active listitem in the left panel (currently open conversation)
const ACTIVE_LISTITEM_SELECTORS = [
  'li.msg-conversation-listitem.active',
  'li[class*="conversation-listitem"][class*="active"]',
  'li[class*="conversation-listitem"][aria-selected="true"]',
  'li[class*="conversation"][class*="selected"]',
];

function getThreadPanel() {
  for (const sel of THREAD_PANEL_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  // Try inside shadow roots (LinkedIn's interop-outlet shadow DOM)
  try {
    for (const sr of getAllShadowRoots()) {
      for (const sel of THREAD_PANEL_SELECTORS) {
        try {
          const el = sr.querySelector(sel);
          if (el) return el;
        } catch (_) {}
      }
    }
  } catch (_) {}
  return null;
}

function getMessagesFromOther(panel) {
  for (const sel of MSG_FROM_OTHER_SELECTORS) {
    try {
      const els = panel.querySelectorAll(sel);
      if (els.length) return Array.from(els);
    } catch (_) {}
  }

  // Fallback: find message bubbles not aligned to the right
  const bubbles = panel.querySelectorAll('[class*="message-bubble"], [class*="msg-s-event-listitem"]');
  return Array.from(bubbles).filter((el) => {
    // Heuristic: right-aligned = sent by us, left-aligned = received
    const rect = el.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return rect.left - panelRect.left < panelRect.width * 0.4;
  });
}

function getActiveListitem() {
  for (const sel of ACTIVE_LISTITEM_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

async function scanOpenThread(config) {
  if (!config?.enabled) return;

  const panel = getThreadPanel();
  if (!panel) return;
  if (scannedThreads.has(panel)) return;

  const messages = getMessagesFromOther(panel);
  if (!messages.length) return;

  // Only care about the first message (first bubble from the other person)
  const firstMsg = messages[0];
  const fullText = firstMsg.textContent.trim();
  if (!fullText) return;

  const keywordIndex = buildKeywordIndex(config);
  const match = matchKeywords(fullText, keywordIndex, config.caseSensitive);

  console.debug('[LinkedGuard] thread scan:', fullText.slice(0, 80), '| match:', match);

  if (!match) return;

  // Mark this panel as scanned to avoid re-triggering
  scannedThreads.add(panel);

  // Try to find the corresponding listitem to apply the action
  const listitem = getActiveListitem();
  const sender = listitem ? getSenderName(listitem) : null;

  console.log('[LinkedGuard] THREAD MATCH →', match.keyword, '| sender:', sender);

  if (listitem) {
    await dispatch(listitem, match.keyword, match.listId, sender, fullText, config);
  } else {
    // No listitem found — still log the event
    try {
      browserAPI.runtime.sendMessage({
        type: 'LOG_ACTION',
        payload: {
          entry: {
            timestamp: new Date().toISOString(),
            senderName: sender || 'Unknown',
            messagePreview: fullText.slice(0, 120),
            matchedKeyword: match.keyword,
            listId: match.listId,
            action: config.defaultAction,
            archived: false,
          },
          action: config.defaultAction,
        },
      });
    } catch (_) {}
  }
}

function startThreadObserver(config) {
  if (threadObserver) threadObserver.disconnect();

  threadObserver = new MutationObserver(debounce(() => {
    scanOpenThread(config);
  }, 300));

  threadObserver.observe(document.body, { childList: true, subtree: true });
}

function stopThreadObserver() {
  if (threadObserver) {
    threadObserver.disconnect();
    threadObserver = null;
  }
}
