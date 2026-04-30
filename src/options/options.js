const api = typeof browser !== 'undefined' ? browser : chrome;
const STORAGE_KEY = 'linkedguard_config';

let config = null;
let modalResolve = null;

// ── Storage ──────────────────────────────────────────────────────────────────

async function loadConfig() {
  const result = await api.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY];
}

async function saveConfig(patch) {
  config = Object.assign({}, config, patch);
  await api.storage.sync.set({ [STORAGE_KEY]: config });
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(title, placeholder = '') {
  return new Promise((resolve) => {
    modalResolve = resolve;
    document.getElementById('modal-title').textContent = title;
    const input = document.getElementById('modal-input');
    input.value = '';
    input.placeholder = placeholder;
    document.getElementById('modal-overlay').hidden = false;
    input.focus();
  });
}

function closeModal(value) {
  document.getElementById('modal-overlay').hidden = true;
  if (modalResolve) {
    modalResolve(value || null);
    modalResolve = null;
  }
}

// ── Render: Lists ─────────────────────────────────────────────────────────────

function renderLists() {
  const container = document.getElementById('lists-container');
  container.innerHTML = '';

  for (const list of config.filterLists) {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.dataset.id = list.id;

    // Header
    const header = document.createElement('div');
    header.className = 'list-card-header';

    const left = document.createElement('div');
    left.className = 'list-card-left';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = list.enabled;
    cb.title = 'Enable / disable this list';
    cb.addEventListener('change', async () => {
      await updateList(list.id, { enabled: cb.checked });
    });

    const name = document.createElement('span');
    name.className = 'list-card-name';
    name.textContent = list.name;

    const badge = document.createElement('span');
    badge.className = 'list-badge';
    badge.textContent = list.builtin ? 'built-in' : 'custom';

    left.append(cb, name, badge);

    const actions = document.createElement('div');
    actions.className = 'list-card-actions';

    // Action 3-way toggle: Archive / Flag / Inherit
    const actionToggle = document.createElement('div');
    actionToggle.className = 'list-action-toggle';
    for (const [val, label] of [['archive', '🗄'], ['flag', '⚠'], ['inherit', '↑ Global']]) {
      const btn = document.createElement('button');
      const isArchive = val === 'archive';
      // Treat any stored "archive" as inherit while archive mode is disabled.
      const effectiveAction = list.action === 'archive' ? 'inherit' : list.action;
      btn.className = 'list-action-btn' + (effectiveAction === val ? ' active' : '') + (isArchive ? ' disabled' : '');
      btn.dataset.value = val;
      btn.textContent = label;
      if (isArchive) {
        btn.disabled = true;
        btn.title = 'Coming soon';
      } else {
        btn.title = val === 'inherit' ? 'Use global default' : val.charAt(0).toUpperCase() + val.slice(1);
      }
      btn.addEventListener('click', async () => {
        if (btn.disabled || isArchive) return;
        await updateList(list.id, { action: val });
        card.querySelectorAll('.list-action-btn').forEach((b) =>
          b.classList.toggle('active', b.dataset.value === val)
        );
      });
      actionToggle.append(btn);
    }

    actions.append(actionToggle);

    // Delete button (custom lists only)
    if (!list.builtin) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete list';
      delBtn.addEventListener('click', async () => {
        if (!confirm(`Delete "${list.name}"?`)) return;
        const updated = config.filterLists.filter((l) => l.id !== list.id);
        await saveConfig({ filterLists: updated });
        renderLists();
      });
      actions.append(delBtn);
    }

    header.append(left, actions);

    // Keywords area
    const kwArea = document.createElement('div');
    kwArea.className = 'keywords-area';

    for (const kw of list.keywords) {
      kwArea.append(makeKeywordChip(kw, list.id));
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'add-keyword-btn';
    addBtn.textContent = '+ keyword';
    addBtn.addEventListener('click', async () => {
      const kw = await openModal(`Add keyword to "${list.name}"`, 'e.g. exciting opportunity');
      if (!kw || !kw.trim()) return;
      const trimmed = kw.trim().toLowerCase();
      const updatedList = config.filterLists.find((l) => l.id === list.id);
      if (updatedList.keywords.includes(trimmed)) return;
      await updateList(list.id, { keywords: [...updatedList.keywords, trimmed] });
      renderLists();
    });

    kwArea.append(addBtn);
    card.append(header, kwArea);
    container.append(card);
  }
}

function makeKeywordChip(kw, listId) {
  const chip = document.createElement('span');
  chip.className = 'keyword-chip';

  const text = document.createElement('span');
  text.textContent = kw;

  const removeBtn = document.createElement('button');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove keyword';
  removeBtn.addEventListener('click', async () => {
    const list = config.filterLists.find((l) => l.id === listId);
    await updateList(listId, { keywords: list.keywords.filter((k) => k !== kw) });
    chip.remove();
  });

  chip.append(text, removeBtn);
  return chip;
}

async function updateList(listId, patch) {
  const updated = config.filterLists.map((l) =>
    l.id === listId ? { ...l, ...patch } : l
  );
  await saveConfig({ filterLists: updated });
}

// ── Render: Settings ──────────────────────────────────────────────────────────

function renderSettings() {
  document.getElementById('master-toggle').checked = config.enabled;
  document.getElementById('case-sensitive').checked = config.caseSensitive || false;

  // Archive disabled — flag is always active.
  document.querySelectorAll('#default-action-toggle .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === 'flag');
  });
}

// ── Render: Log ───────────────────────────────────────────────────────────────

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function renderLog() {
  const container = document.getElementById('log-container');
  const log = config.log || [];

  document.getElementById('log-total').textContent =
    `Total archived: ${config.stats?.totalArchived || 0} · Flagged: ${config.stats?.totalFlagged || 0}`;

  if (!log.length) {
    container.innerHTML = '<p class="empty-state">No activity yet.</p>';
    return;
  }

  container.innerHTML = '';
  for (const entry of log) {
    const el = document.createElement('div');
    el.className = 'log-entry';

    const icon = document.createElement('div');
    icon.className = 'log-action-icon';
    icon.textContent = entry.action === 'archive' ? '🗄' : '⚠';

    const body = document.createElement('div');
    body.className = 'log-body';

    const sender = document.createElement('div');
    sender.className = 'log-sender';
    sender.textContent = entry.senderName || 'Unknown';

    const preview = document.createElement('div');
    preview.className = 'log-preview';
    preview.textContent = entry.messagePreview || '';

    const keyword = document.createElement('div');
    keyword.className = 'log-keyword';
    keyword.innerHTML = `Matched: <strong>${entry.matchedKeyword}</strong>`;

    body.append(sender, preview, keyword);

    const meta = document.createElement('div');
    meta.className = 'log-meta';

    const status = document.createElement('div');
    status.className = entry.archived || entry.action === 'flag'
      ? 'log-status-ok'
      : 'log-status-fail';
    status.textContent = entry.action === 'flag' ? '⚠ Flagged' : (entry.archived ? '✓ Archived' : '✗ Failed');

    const time = document.createElement('div');
    time.textContent = formatDate(entry.timestamp);

    meta.append(status, time);
    el.append(icon, body, meta);
    container.append(el);
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      if (tab.dataset.tab === 'log') renderLog();
    });
  });
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function initEvents() {
  // Master toggle
  document.getElementById('master-toggle').addEventListener('change', async (e) => {
    await saveConfig({ enabled: e.target.checked });
  });

  // Case sensitive
  document.getElementById('case-sensitive').addEventListener('change', async (e) => {
    await saveConfig({ caseSensitive: e.target.checked });
  });

  // Default action toggle (Archive disabled — coming soon)
  document.querySelectorAll('#default-action-toggle .seg-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.dataset.value === 'archive') return;
      await saveConfig({ defaultAction: btn.dataset.value });
      document.querySelectorAll('#default-action-toggle .seg-btn').forEach((b) =>
        b.classList.toggle('active', b.dataset.value === btn.dataset.value)
      );
    });
  });

  // Add custom list
  document.getElementById('add-list-btn').addEventListener('click', async () => {
    const name = await openModal('New custom list name', 'e.g. Sales Pitches');
    if (!name || !name.trim()) return;
    const newList = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      enabled: true,
      builtin: false,
      action: 'inherit',
      keywords: [],
    };
    await saveConfig({ filterLists: [...config.filterLists, newList] });
    renderLists();
  });

  // Export
  document.getElementById('export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedguard-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!imported.filterLists) throw new Error('invalid config');
      await saveConfig(imported);
      renderLists();
      renderSettings();
      alert('Config imported successfully.');
    } catch {
      alert('Invalid config file.');
    }
    e.target.value = '';
  });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return;
    // Re-load builtin defaults from background
    const defaults = {
      version: 1,
      enabled: true,
      defaultAction: 'flag',
      caseSensitive: false,
      filterLists: config.filterLists.filter((l) => l.builtin).map((l) => ({
        ...l,
        enabled: ['recruitment-spam', 'crypto-scam', 'mlm-spam'].includes(l.id),
        action: 'inherit',
      })),
      stats: { totalArchived: 0, totalFlagged: 0, lastAction: null },
      log: [],
    };
    await api.storage.sync.set({ [STORAGE_KEY]: defaults });
    config = defaults;
    renderLists();
    renderSettings();
  });

  // Clear log
  document.getElementById('clear-log-btn').addEventListener('click', async () => {
    if (!confirm('Clear the activity log?')) return;
    await saveConfig({ log: [], stats: { totalArchived: 0, totalFlagged: 0, lastAction: null } });
    renderLog();
  });

  // Modal
  document.getElementById('modal-cancel').addEventListener('click', () => closeModal(null));
  document.getElementById('modal-confirm').addEventListener('click', () => {
    closeModal(document.getElementById('modal-input').value);
  });
  document.getElementById('modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') closeModal(document.getElementById('modal-input').value);
    if (e.key === 'Escape') closeModal(null);
  });
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal(null);
  });

  // Live storage updates (from popup)
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
      config = changes[STORAGE_KEY].newValue;
      renderLists();
      renderSettings();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  config = await loadConfig();
  if (!config) return;

  initTabs();
  initEvents();
  renderLists();
  renderSettings();

  const hashTab = { '#log': 'log', '#settings': 'settings', '#lists': 'lists' };
  const targetTab = hashTab[location.hash];
  if (targetTab) document.querySelector(`[data-tab="${targetTab}"]`)?.click();
}

init();
