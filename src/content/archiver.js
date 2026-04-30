console.log('[LinkedGuard] 5/11 archiver.js');
function waitForElement(selector, root, timeoutMs) {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);

    const obs = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`waitForElement timeout: ${selector}`));
    }, timeoutMs);
  });
}

async function archiveConversation(listitem) {
  // Trigger hover to reveal action buttons
  listitem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  listitem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

  // Find and click the "More actions" kebab button
  const kebabSelectors = [
    '[aria-label*="More actions"]',
    '[aria-label*="more actions"]',
    'button[data-control-name="overlay.kebab_menu"]',
    '.msg-conversation-listitem__action-container button',
  ];

  let kebab = null;
  for (const sel of kebabSelectors) {
    try {
      kebab = await waitForElement(sel, listitem, WAIT_FOR_ELEMENT_TIMEOUT);
      if (kebab) break;
    } catch (_) {}
  }

  if (!kebab) throw new Error('kebab button not found');
  kebab.click();

  // Wait for dropdown to appear and find archive option
  const archiveSelectors = [
    '[data-control-name="archive"]',
    'li[aria-label*="Archive"]',
    'li[aria-label*="archive"]',
    'div[role="option"]:not([aria-disabled="true"])',
  ];

  let archiveBtn = null;
  for (const sel of archiveSelectors) {
    try {
      const candidate = await waitForElement(sel, document.body, WAIT_FOR_ELEMENT_TIMEOUT);
      if (candidate) {
        // If it's the generic role=option, verify it's the archive one by text
        if (sel.includes('role="option"')) {
          const text = candidate.textContent.toLowerCase();
          if (!text.includes('archive')) continue;
        }
        archiveBtn = candidate;
        break;
      }
    } catch (_) {}
  }

  // Fallback: scan all visible dropdown items for "Archive" text
  if (!archiveBtn) {
    const allItems = document.querySelectorAll('[role="option"], [role="menuitem"], li');
    for (const item of allItems) {
      if (item.textContent.trim().toLowerCase() === 'archive') {
        archiveBtn = item;
        break;
      }
    }
  }

  if (!archiveBtn) throw new Error('archive option not found in dropdown');
  archiveBtn.click();
}
