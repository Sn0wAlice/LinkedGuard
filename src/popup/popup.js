const api = typeof browser !== 'undefined' ? browser : chrome;
const STORAGE_KEY = 'linkedguard_config';

let config = null;

async function loadConfig() {
  const result = await api.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY];
}

async function saveConfig(patch) {
  const updated = Object.assign({}, config, patch);
  config = updated;
  await api.storage.sync.set({ [STORAGE_KEY]: updated });
}

function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Last action: just now';
  if (mins < 60) return `Last action: ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last action: ${hrs}h ago`;
  return `Last action: ${Math.floor(hrs / 24)}d ago`;
}

function renderLists() {
  const container = document.getElementById('lists-container');
  container.innerHTML = '';

  for (const list of config.filterLists) {
    const row = document.createElement('div');
    row.className = 'list-row';

    const left = document.createElement('div');
    left.className = 'list-row-left';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = list.enabled;
    cb.addEventListener('change', async () => {
      const updated = config.filterLists.map((l) =>
        l.id === list.id ? { ...l, enabled: cb.checked } : l
      );
      await saveConfig({ filterLists: updated });
    });

    const name = document.createElement('span');
    name.className = 'list-name';
    name.textContent = list.name;

    const count = document.createElement('span');
    count.className = 'list-count';
    count.textContent = `${list.keywords.length}`;

    left.append(cb, name, count);
    row.append(left);
    container.append(row);
  }
}

function renderStats() {
  const stats = config.stats || {};
  document.getElementById('stat-archived').textContent = stats.totalArchived || 0;
  document.getElementById('stat-flagged').textContent = stats.totalFlagged || 0;
  document.getElementById('last-action').textContent = formatRelativeTime(stats.lastAction);
}

function renderActionToggle() {
  // Archive is disabled — flag is always active.
  const btns = document.querySelectorAll('#action-toggle .seg-btn');
  btns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === 'flag');
  });
}

function renderMasterToggle() {
  const cb = document.getElementById('master-toggle');
  cb.checked = config.enabled;
  document.body.classList.toggle('disabled', !config.enabled);
}

async function init() {
  config = await loadConfig();
  if (!config) return;

  renderMasterToggle();
  renderActionToggle();
  renderLists();
  renderStats();

  // Master toggle
  document.getElementById('master-toggle').addEventListener('change', async (e) => {
    await saveConfig({ enabled: e.target.checked });
    document.body.classList.toggle('disabled', !e.target.checked);
  });

  // Action toggle (Archive is disabled — coming soon)
  document.querySelectorAll('#action-toggle .seg-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.disabled || btn.dataset.value === 'archive') return;
      await saveConfig({ defaultAction: btn.dataset.value });
      renderActionToggle();
    });
  });

  // Open options
  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    api.runtime.openOptionsPage();
  });

  function openOptionsTab(hash) {
    const url = api.runtime.getURL('src/options/options.html') + hash;
    api.tabs.create({ url });
  }

  document.getElementById('view-log').addEventListener('click', (e) => {
    e.preventDefault();
    openOptionsTab('#log');
  });

  document.getElementById('open-settings').addEventListener('click', (e) => {
    e.preventDefault();
    openOptionsTab('#lists');
  });

  // Live updates from options page
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]?.newValue) {
      config = changes[STORAGE_KEY].newValue;
      renderMasterToggle();
      renderActionToggle();
      renderLists();
      renderStats();
    }
  });
}

init();
