console.log('[LinkedGuard] 6/11 flagger.js');

// Per-element styling — we mark only the sender NAME and the AVATAR,
// never the whole conversation row. Avoids over-flagging if our container
// detection picks up a parent that wraps multiple conversations.
const FLAG_STYLES = `
  .lg-flag-name {
    color: #cc1016 !important;
    font-weight: 700 !important;
  }
  .lg-flag-name-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #cc1016;
    color: #fff;
    border-radius: 50%;
    width: 14px;
    height: 14px;
    font-size: 9px;
    margin-left: 5px;
    vertical-align: middle;
    cursor: help;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    position: relative;
  }
  .lg-flag-name-badge[data-tip]:hover::after {
    content: attr(data-tip);
    position: absolute;
    left: 50%;
    top: 22px;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #fff;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-weight: 400;
    padding: 7px 10px;
    border-radius: 6px;
    white-space: pre;
    pointer-events: none;
    z-index: 2147483647;
    line-height: 1.5;
    min-width: 160px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    text-align: left;
  }
  .lg-flag-name-badge[data-tip]:hover::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 16px;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-bottom-color: #1a1a1a;
    z-index: 2147483647;
  }
  .lg-flag-avatar {
    outline: 2.5px solid #cc1016 !important;
    outline-offset: 1px !important;
  }
`;

// Each shadow root is style-isolated — inject our stylesheet into the root
// that actually contains the listitem (page head, or any shadow root).
const stylesInjectedRoots = new WeakSet();
function injectFlagStyles(listitem) {
  let root;
  try {
    root = listitem ? listitem.getRootNode() : document;
  } catch (_) {
    root = document;
  }
  const target = root === document ? document.head : root;
  if (!target || stylesInjectedRoots.has(target)) return;
  if (target.querySelector && target.querySelector('#linkedguard-styles')) {
    stylesInjectedRoots.add(target);
    return;
  }
  const style = document.createElement('style');
  style.id = 'linkedguard-styles';
  style.textContent = FLAG_STYLES;
  try {
    target.appendChild(style);
    stylesInjectedRoots.add(target);
  } catch (_) {}
}

// Find the sender NAME element inside the conversation card.
// Strategy: prefer known LinkedIn name selectors; fallback to the first
// short headline-looking text node that's a direct or near descendant.
function findNameElement(listitem) {
  const NAME_SELECTORS = [
    '[class*="participant-name"]',
    '[class*="participants-names"]',
    '[class*="conversation-card__participant"]',
    '[class*="conversation-title"]',
    '[class*="msg-conversation-card__participant-names"]',
    'h3', 'h4',
  ];
  for (const sel of NAME_SELECTORS) {
    try {
      const el = listitem.querySelector(sel);
      if (el && el.textContent.trim()) return el;
    } catch (_) {}
  }
  return null;
}

// Find the avatar <img> inside the card. Use the first <img> as last resort.
function findAvatarElement(listitem) {
  const AVATAR_SELECTORS = [
    'img[class*="EntityPhoto"]',
    'img[class*="presence-entity"]',
    'img[class*="avatar"]',
    'img[class*="presence"]',
    '.presence-entity__image',
    'img',
  ];
  for (const sel of AVATAR_SELECTORS) {
    try {
      const el = listitem.querySelector(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

// Map of flagged nodes → keyword, for re-application after React re-renders
const flaggedItems = new Map();

function flagConversation(listitem, matchedKeyword, listName) {
  injectFlagStyles(listitem);
  flaggedItems.set(listitem, { keyword: matchedKeyword, listName });
  applyFlagStyles(listitem, matchedKeyword, listName);
}

function applyFlagStyles(listitem, matchedKeyword, listName) {
  // 1. Mark the sender name in red and append a small inline badge
  const nameEl = findNameElement(listitem);
  if (nameEl) {
    nameEl.classList.add('lg-flag-name');
    // Idempotent: remove any pre-existing badge first
    try {
      nameEl.querySelectorAll('.lg-flag-name-badge').forEach((b) => b.remove());
    } catch (_) {}
    const badge = document.createElement('span');
    badge.className = 'lg-flag-name-badge';
    badge.textContent = '⚠';
    const tipLines = [
      'LinkedGuard',
      `List: ${listName || '—'}`,
      `Keyword: "${matchedKeyword}"`,
    ];
    const tipText = tipLines.join('\n');
    badge.setAttribute('data-tip', tipText);
    badge.setAttribute('title', tipText); // native browser tooltip — never clipped
    nameEl.appendChild(badge);
  }

  // 2. Outline the avatar in red
  const avatarEl = findAvatarElement(listitem);
  if (avatarEl) avatarEl.classList.add('lg-flag-avatar');
}

// Check if a node is still attached — works for both document and shadow roots.
function isNodeAttached(node) {
  try {
    const root = node.getRootNode();
    return root === document
      ? document.contains(node)
      : (root && root.contains && root.contains(node));
  } catch (_) {
    return false;
  }
}

// Re-apply flags on nodes that may have been re-rendered by React
function reapplyFlags() {
  for (const [node, { keyword, listName }] of flaggedItems) {
    try {
      if (!isNodeAttached(node)) {
        flaggedItems.delete(node);
        continue;
      }
      const nameEl = findNameElement(node);
      // If the name no longer has our class, React wiped it — re-apply
      if (nameEl && !nameEl.classList.contains('lg-flag-name')) {
        injectFlagStyles(node);
        applyFlagStyles(node, keyword, listName);
      }
    } catch (_) {
      flaggedItems.delete(node);
    }
  }
}
